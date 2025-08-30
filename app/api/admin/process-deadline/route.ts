// app/api/admin/process-deadline/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { effectiveDeadline } from "@/src/lib/deadline";
import {
  pickProxyClubForUserAlpha,
  proxiesUsedThisSeason,
} from "@/src/lib/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    // 1) Active season
    const season = await db.season.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!season) {
      return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });
    }

    // 2) All GWs (ordered by number)
    const gws = await db.gameweek.findMany({
      where: { seasonId: season.id },
      select: { id: true, number: true },
      orderBy: { number: "asc" },
    });
    if (!gws.length) {
      return NextResponse.json({ ok: false, error: "No gameweeks for season" }, { status: 400 });
    }

    // 3) Most recent GW whose effective deadline has passed
    const now = Date.now();
    let targetGw: { id: string; number: number } | null = null;
    let targetEff: Date | null = null;

    for (const gw of gws) {
      const eff = await effectiveDeadline(gw.id);
      if (!eff) continue;
      if (eff.getTime() <= now) {
        if (!targetEff || eff.getTime() > targetEff.getTime()) {
          targetGw = gw;
          targetEff = eff;
        }
      }
    }

    if (!targetGw || !targetEff) {
      return NextResponse.json({ ok: true, info: "No passed deadlines to process" });
    }

    // 4) Previous GW effective deadline (for the window lower bound)
    const idx = gws.findIndex(x => x.id === targetGw!.id);
    const prevGw = idx > 0 ? gws[idx - 1] : null;
    const prevEff = prevGw ? await effectiveDeadline(prevGw.id) : null;

    // 5) Alive users
    const users = await db.user.findMany({
      where: { alive: true },
      select: { id: true },
    });

    const results: Array<Record<string, any>> = [];

    for (const u of users) {
      // 5a) Did user make a MANUAL pick in the exact window [prevEff, targetEff)?
      // If prevEff is null (first GW), accept any manual pick strictly before targetEff.
      const manualPick = await db.pick.findFirst({
        where: {
          userId: u.id,
          seasonId: season.id,
          gwId: targetGw.id,
          source: "USER",
          ...(prevEff
            ? { createdAt: { gte: prevEff, lt: targetEff } }
            : { createdAt: { lt: targetEff } }),
        },
        select: { id: true },
      });

      if (manualPick) {
        results.push({ userId: u.id, action: "kept-user-pick" });
        continue;
      }

      // 5b) If any pick already exists for this GW, skip (idempotency / reruns)
      const anyPick = await db.pick.findUnique({
        where: { userId_seasonId_gwId: { userId: u.id, seasonId: season.id, gwId: targetGw.id } },
        select: { id: true, source: true },
      });
      if (anyPick) {
        results.push({ userId: u.id, action: "already-has-pick", source: anyPick.source });
        continue;
      }

      // 5c) Proxy usage cap = 2 per season (computed)
      const used = await proxiesUsedThisSeason(u.id, season.id);
      const remaining = Math.max(0, 2 - used);

      if (remaining > 0) {
        // Alphabetical first valid club that plays this GW and is unused this season
        const proxyClubId = await pickProxyClubForUserAlpha({
          seasonId: season.id,
          userId: u.id,
          gwId: targetGw.id,
        });

        if (!proxyClubId) {
          // No valid candidate ⇒ eliminate
          await db.user.update({
            where: { id: u.id },
            data: {
              alive: false,
              // eliminatedAtGw: targetGw.number, // uncomment once you've added this column in Prisma
            } as any,
          });
          results.push({ userId: u.id, action: "eliminated-no-candidate" });
          continue;
        }

        // 5d) Create proxy pick (idempotent via compound unique)
        await db.pick.upsert({
          where: { userId_seasonId_gwId: { userId: u.id, seasonId: season.id, gwId: targetGw.id } },
          update: { clubId: proxyClubId, source: "PROXY" },
          create: {
            userId: u.id,
            seasonId: season.id,
            gwId: targetGw.id,
            clubId: proxyClubId,
            source: "PROXY",
          },
        });

        results.push({ userId: u.id, action: "proxy-assigned", clubId: proxyClubId });
        continue;
      }

      // 5e) No proxies left ⇒ eliminate
      await db.user.update({
        where: { id: u.id },
        data: {
          alive: false,
          // eliminatedAtGw: targetGw.number, // uncomment once you've added this column in Prisma
        } as any,
      });
      results.push({ userId: u.id, action: "eliminated-no-proxies" });
    }

    return NextResponse.json({ ok: true, gw: targetGw, processed: results });
  } catch (err: any) {
    console.error("PROCESS-DEADLINE ERROR:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
