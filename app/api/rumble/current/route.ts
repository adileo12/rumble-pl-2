// app/api/rumble/current/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { computeDeadline, getCurrentSeasonAndGW, last5Form } from "@/src/lib/rumble";

export async function GET() {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { season, gw } = await getCurrentSeasonAndGW();
  if (!season || !gw) {
    return NextResponse.json({ ok: true, data: { season: null, gw: null, fixtures: [], clubs: [], deadline: null, pickedClubId: null, usedClubIds: [] } });
  }

  const fixtures = await db.fixture.findMany({
    where: { gwId: gw.id },
    orderBy: { kickoff: "asc" },
    select: {
      id: true, kickoff: true,
      homeClub: { select: { id: true, name: true, shortName: true } },
      awayClub: { select: { id: true, name: true, shortName: true } },
    },
  });

  const clubs = await db.club.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, shortName: true },
  });

  // deadline = 30m before first kickoff (derive from fixtures)
  const { deadline } = computeDeadline(fixtures.map(f => new Date(f.kickoff)));

  // Current pick (this GW)
  const currentPick = await db.pick.findUnique({
  where: {
    userId_seasonId_gwId: {
      userId: user.id,
      seasonId: season.id,   // make sure you have season.id available
      gwId: gw.id,
    },
  },
  select: { clubId: true },
});

  // All used clubs this season EXCEPT current GW pick (so you can change it)
  const allPicks = await db.pick.findMany({
    where: { userId: user.id /* optional: seasonId: season.id */ },
    select: { clubId: true, gwId: true },
  });
  const usedClubIds = new Set(
    allPicks
      .filter(p => p.gwId !== gw.id) // exclude current GW (lets you change)
      .map(p => p.clubId)
  );

  // Compute form for each club in the fixtures (last 5)
  const now = new Date();
  const formsCache = new Map<string, string[]>();
  for (const f of fixtures) {
    for (const c of [f.homeClub.id, f.awayClub.id]) {
      if (!formsCache.has(c)) {
        const arr = await last5Form(c, now);
        formsCache.set(c, arr);
      }
    }
  }

  const table = fixtures.map(f => ({
    id: f.id,
    kickoff: f.kickoff,
    home: { ...f.homeClub, form: formsCache.get(f.homeClub.id) ?? [] },
    away: { ...f.awayClub, form: formsCache.get(f.awayClub.id) ?? [] },
  }));

  return NextResponse.json({
    ok: true,
    data: {
      season: { id: season.id, name: season.name, year: season.year },
      gw: { id: gw.id, number: gw.number, isLocked: gw.isLocked, deadline: deadline?.toISOString() ?? null },
      fixtures: table,
      clubs,
      deadline: deadline?.toISOString() ?? null,
      pickedClubId: currentPick?.clubId ?? null,
      usedClubIds: Array.from(usedClubIds),
    },
  });
}
