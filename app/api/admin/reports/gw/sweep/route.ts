// app/api/admin/reports/gw/sweep/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { effectiveDeadline } from "@/src/lib/deadline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    // Admin check
    const sid = cookies().get("sid")?.value ?? null;
    const viewer = sid
      ? await db.user.findUnique({ where: { id: sid }, select: { isAdmin: true } })
      : null;
    if (!viewer?.isAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const season = await db.season.findFirst({ where: { isActive: true }, select: { id: true } });
    if (!season) return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });

    const gws = await db.gameweek.findMany({
      where: { seasonId: season.id },
      select: { id: true, number: true },
      orderBy: { number: "asc" },
    });

    const now = Date.now();
    const processed: Array<{ gwNumber: number; ok: boolean; message?: string }> = [];

    for (const gw of gws) {
      const eff = await effectiveDeadline(gw.id);
      if (!eff || eff.getTime() > now) {
        processed.push({ gwNumber: gw.number, ok: false, message: "skipped (not locked yet)" });
        continue;
      }

      // Build minimal report (reuse logic from the single-GW route)
      const byClub = await db.pick.groupBy({
        by: ["clubId"],
        where: { seasonId: season.id, gwId: gw.id },
        _count: { _all: true },
      });
      const clubIds = byClub.map((x) => x.clubId);
      const clubs = clubIds.length
        ? await db.club.findMany({
            where: { id: { in: clubIds } },
            select: { id: true, shortName: true, name: true },
          })
        : [];
      const labelById = new Map(clubs.map((c) => [c.id, c.shortName ?? c.name]));
      const counts = byClub
        .map((x) => ({ label: labelById.get(x.clubId) ?? x.clubId, value: x._count._all }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const userCount = await db.pick.count({ where: { seasonId: season.id, gwId: gw.id, source: "USER" } });
      const proxyCount = await db.pick.count({ where: { seasonId: season.id, gwId: gw.id, source: "PROXY" } });

      await db.rumbleReport.upsert({
        where: { seasonId_gwNumber: { seasonId: season.id, gwNumber: gw.number } as any },
        update: { countsJson: counts as any, bySourceJson: { USER: userCount, PROXY: proxyCount } as any, updatedAt: new Date() } as any,
        create: { seasonId: season.id, gwNumber: gw.number, countsJson: counts as any, bySourceJson: { USER: userCount, PROXY: proxyCount } as any } as any,
      });

      processed.push({ gwNumber: gw.number, ok: true });
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err: any) {
    console.error("REPORT-SWEEP ERROR:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
