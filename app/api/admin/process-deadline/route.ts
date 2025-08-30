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
    // Active season
    const season = await db.season.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!season) {
      return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });
    }

    // All GWs (ordered)
    const gws = await db.gameweek.findMany({
      where: { seasonId: season.id },
      select: { id: true, number: true },
      orderBy: { number: "asc" },
    });
    if (!gws.length) {
      return NextResponse.json({ ok: false, error: "No gameweeks for season" }, { status: 400 });
    }

    // Find the most recent GW whose effective deadline has passed
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

    // (Optional) previous GW effective deadline (not strictly needed if we only care that a manual pick exists before current eff)
    const prevIndex = gws.findIndex(x => x.id === targetGw!.id) - 1;
    const prevEff = prevIndex >= 0 ? await effectiveDeadline(gws[prevIndex].id) : null;

    // Alive participants
    const users = await db.user.findMany({
      where: { alive: true },
      select: { id: true },
    });

    const results: Array<Record<string, any>> = [];

    for (const u of users) {
      // If user already has a USER pick for this GW (submitted before current deadline), do nothing
      const manualPick = await db.pick.findFirst({
        where: {
          userId: u.id,
          seasonId: season.id,
          gwId: targetGw.id,
          source: "USER",
          // safest: ensure it's not after the deadline (if timestamps exist)
          // createdAt: { lt: targetEff }  // uncomment if your Pick has createdAt
        },
        select: { id: true },
      });
      if (manualPick) {
        results.push({ userId: u.id, action: "kept-user-pick" });
        continue;
      }

      // If any pick already exists (e.g., job rerun, or proxy already assigned), skip
      const anyPick = await db.pick.findUnique({
        where: { userId_seasonId_gwId: { userId: u.id, seasonId: season.id, gwId: targetGw.id } },
        select: { id: true, source: true },
      });
      if (anyPick) {
        results.push({ userId: u.id, action: "already-has-pick", source: anyPick.source });
        continue;
      }

      // Proxy usage cap: 2 per season (computed by counting PROXY picks)
      const used = await proxiesUsedThisSeason(u.id, season.id);
      const remaining = Math.max(0, 2 - used);

      if (remaining > 0) {
        // Alphabetical first valid club that plays in this GW and not used by user this season
        const proxyClubId = await pickProxyClubForUserAlpha({
          seasonId: season.id,
          userId: u.id,
          gwId: targetGw.id,
        });

        if (!proxyClubId) {
          // No valid candidate (all clubs already used / no fixtures) → eliminate
          await db.user.update({
            where: { id: u.id },
            data: {
              alive: false,
              // eliminatedAtGw: targetGw.number, // <-- Your schema doesn't have this; add later if you want to store it.
            } as any,
          });
          results.push({ userId: u.id, action: "eliminated-no-candidate" });
          continue;
        }

        // Create proxy pick (idempotent via compound unique)
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

      // No proxies left → eliminate
      await db.user.update({
        where: { id: u.id },
        data: {
          alive: false,
          // eliminatedAtGw: targetGw.number, // <-- add field later if desired
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
