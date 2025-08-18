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

  const gw = await db.gameweek.findFirst({
    where: { seasonId, number: gwNumber },
    select: { id: true, number: true },
  });
  if (!gw) return NextResponse.json({ ok: false, error: "GW not found" }, { status: 404 });

  const fxAll = await db.fixture.findMany({
  where: { gwId: gw.id },
  select: { homeClubId: true, awayClubId: true, homeGoals: true, awayGoals: true },
});

  if (!gwIsComplete(fixtures)) {
    return NextResponse.json({ ok: false, error: "GW not complete yet" }, { status: 400 });
  }

  // Preload fixtures to evaluate results
  const fxAll = await db.fixture.findMany({
    where: { gwId: gw.id },
    select: { homeClubId: true, awayClubId: true, homeGoals: true, awayGoals: true },
  });
const fxByClub: Record<string, {
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
}> = {};

for (const f of fxAll) {
  if (f.homeGoals == null || f.awayGoals == null) continue; // skip unfinished, TS narrows
  const entry = {
    homeClubId: f.homeClubId,
    awayClubId: f.awayClubId,
    homeGoals: f.homeGoals, // numbers now
    awayGoals: f.awayGoals, // numbers now
  };
  fxByClub[f.homeClubId] = entry;
  fxByClub[f.awayClubId] = entry;
}
  const picks = await db.pick.findMany({
    where: { gwId: gw.id },
    select: { userId: true, clubId: true, seasonId: true },
  });

  let eliminated = 0;

  for (const p of picks) {
    const state = await db.rumbleState.findUnique({
      where: { userId_seasonId: { userId: p.userId, seasonId: p.seasonId } },
      select: { eliminatedAtGw: true },
    });
    if (state?.eliminatedAtGw) continue;

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
