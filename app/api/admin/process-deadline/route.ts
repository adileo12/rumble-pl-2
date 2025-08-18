// app/api/admin/process-results/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

function gwIsComplete(rows: { status: string | null; homeGoals: number | null; awayGoals: number | null }[]) {
  if (!rows.length) return false;
  return rows.every(r => r.status === "FT" && r.homeGoals != null && r.awayGoals != null);
}

export async function POST(req: Request) {
  const { seasonId, gwNumber } = await req.json().catch(() => ({} as any));
  if (!seasonId || typeof gwNumber !== "number") {
    return NextResponse.json({ ok: false, error: "seasonId and gwNumber are required" }, { status: 400 });
  }

  const gw = await db.gw.findFirst({ where: { seasonId, number: gwNumber }, select: { id: true, number: true } });
  if (!gw) return NextResponse.json({ ok: false, error: "GW not found" }, { status: 404 });

  const fixtures = await db.fixture.findMany({
    where: { gwId: gw.id },
    select: { status: true, homeGoals: true, awayGoals: true },
  });
  if (!gwIsComplete(fixtures)) {
    return NextResponse.json({ ok: false, error: "GW not complete yet" }, { status: 400 });
  }

  // Users who picked this GW and are not already eliminated
  const picks = await db.pick.findMany({
    where: { gwId: gw.id },
    select: { id: true, userId: true, clubId: true, seasonId: true },
  });

  // Preload all fixtures for quick lookups
  const fxByClub: Record<string, { homeGoals: number; awayGoals: number; homeClubId: string; awayClubId: string }> = {};
  const fxAll = await db.fixture.findMany({
    where: { gwId: gw.id },
    select: { homeClubId: true, awayClubId: true, homeGoals: true, awayGoals: true },
  });
  for (const f of fxAll) {
    fxByClub[f.homeClubId] = { ...f };
    fxByClub[f.awayClubId] = { ...f };
  }

  let eliminated = 0;

  for (const p of picks) {
    const state = await db.rumbleState.findUnique({
      where: { userId_seasonId: { userId: p.userId, seasonId: p.seasonId } },
      select: { eliminatedAtGw: true },
    });
    if (state?.eliminatedAtGw) continue; // already out (e.g., missed with no proxies)

    const fx = fxByClub[p.clubId];
    if (!fx) continue;

    const isHome = fx.homeClubId === p.clubId;
    const my = isHome ? fx.homeGoals : fx.awayGoals;
    const opp = isHome ? fx.awayGoals : fx.homeGoals;

    if (my < opp) {
      await db.rumbleState.upsert({
        where: { userId_seasonId: { userId: p.userId, seasonId: p.seasonId } },
        update: { eliminatedAtGw: gw.number, eliminatedAt: new Date() },
        create: {
          userId: p.userId,
          seasonId: p.seasonId,
          proxiesUsed: 0,
          lazarusUsed: false,
          eliminatedAtGw: gw.number,
          eliminatedAt: new Date(),
        },
      });
      eliminated++;
    }
  }

  return NextResponse.json({ ok: true, eliminated, gw: gw.number });
}
