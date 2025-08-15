// app/api/rumble/current/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

// derive deadline: 30 mins before earliest kickoff of this GW
function computeDeadline(kickoffs: Date[]) {
  if (!kickoffs.length) return null;
  const first = new Date(Math.min(...kickoffs.map(k => k.getTime())));
  return new Date(first.getTime() - 30 * 60 * 1000);
}

// last 5 results for a club before a given time (W/D/L)
async function last5Form(clubId: string, before: Date) {
  const rows = await db.fixture.findMany({
    where: {
      kickoff: { lt: before },
      OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
    },
    orderBy: { kickoff: "desc" },
    take: 5,
    select: { homeClubId: true, awayClubId: true, homeGoals: true, awayGoals: true },
  });

  return rows.map((f) => {
    const isHome = f.homeClubId === clubId;
    const gf = isHome ? (f.homeGoals ?? 0) : (f.awayGoals ?? 0);
    const ga = isHome ? (f.awayGoals ?? 0) : (f.homeGoals ?? 0);
    if (gf > ga) return "W";
    if (gf === ga) return "D";
    return "L";
  });
}

export async function GET() {
  // 0) auth
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: sid }, select: { id: true } });
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // 1) active season
  const season = await db.season.findFirst({ where: { isActive: true } });
  if (!season) {
    return NextResponse.json({
      ok: true,
      data: { season: null, gw: null, fixtures: [], clubs: [], deadline: null, pickedClubId: null, usedClubIds: [] },
    });
  }

  // 2) current gameweek (nearest future deadline, else last past)
  const now = new Date();
  const future = await db.gameweek.findFirst({
    where: { seasonId: season.id, deadline: { gte: now } },
    orderBy: { deadline: "asc" },
  });
  const gw =
    future ??
    (await db.gameweek.findFirst({
      where: { seasonId: season.id },
      orderBy: { deadline: "desc" },
    }));

  if (!gw) {
    return NextResponse.json({
      ok: true,
      data: { season, gw: null, fixtures: [], clubs: [], deadline: null, pickedClubId: null, usedClubIds: [] },
    });
  }

  // 3) fixtures for this GW  **IMPORTANT: use gwId (not gameweekId)**
  const fixtures = await db.fixture.findMany({
    where: { gwId: gw.id },
    include: { homeClub: true, awayClub: true },
    orderBy: { kickoff: "asc" },
  });

  const deadline = computeDeadline(fixtures.map(f => f.kickoff));

  // 4) clubs (active)
  const clubs = await db.club.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, shortName: true },
  });

  // 5) your current pick for this GW
  const currentPick = await db.pick.findUnique({
    where: { userId_gwId: { userId: user.id, gwId: gw.id } },
    select: { clubId: true },
  });

  // 6) clubs you’ve already used this season (disable in UI)
  const used = await db.pick.findMany({
    where: { userId: user.id, seasonId: season.id },
    select: { clubId: true },
  });
  const usedClubIds = Array.from(new Set(used.map(u => u.clubId)));

  // 7) build fixture rows + last-5 form
  const cutoff = deadline ?? now;
  const table = await Promise.all(
    fixtures.map(async (fx) => ({
      id: fx.id,
      kickoff: fx.kickoff.toISOString(),
      home: {
        id: fx.homeClub.id,
        name: fx.homeClub.name,
        shortName: fx.homeClub.shortName,
        form: await last5Form(fx.homeClubId, cutoff),
      },
      away: {
        id: fx.awayClub.id,
        name: fx.awayClub.name,
        shortName: fx.awayClub.shortName,
        form: await last5Form(fx.awayClubId, cutoff),
      },
    }))
  );

  return NextResponse.json({
    ok: true,
    data: {
      season: { id: season.id, name: season.name, year: season.year },
      gw: { id: gw.id, number: gw.number, isLocked: gw.isLocked, deadline: deadline?.toISOString() ?? null },
      fixtures: table,
      clubs,
      deadline: deadline?.toISOString() ?? null,
      pickedClubId: currentPick?.clubId ?? null,
      usedClubIds,
    },
  });
}
