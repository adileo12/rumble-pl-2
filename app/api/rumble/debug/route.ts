// app/api/rumble/debug/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { computeDeadline, getCurrentSeasonAndGW } from "@/src/lib/rumble";

export async function GET() {
  const sid = (await cookies()).get("sid")?.value ?? null;
  const now = new Date();

  const { season, gw } = await getCurrentSeasonAndGW();

  if (!season || !gw) {
    return NextResponse.json({
      ok: true,
      data: {
        season: season ?? null,
        gw: gw ?? null,
        fixtures: [],
        clubs: [],
        deadline: null,
        pickedClubId: null,
        usedClubIds: [],
      },
      debug: {
        now: now.toISOString(),
        reason: "No active season or gameweek",
      },
    });
  }

  // Fixtures for this GW
  const fixtures = await db.fixture.findMany({
    where: { gwId: gw.id },
    orderBy: { kickoff: "asc" },
    select: {
      id: true,
      kickoff: true,
      status: true,
      homeClubId: true,
      awayClubId: true,
      homeGoals: true,
      awayGoals: true,
    },
  });

  // Compute deadline (prefer GW.deadline if set)
  const { deadline: derived } = computeDeadline(
    fixtures.map((f) => f.kickoff as Date | null)
  );
  const effectiveDeadline = gw.deadline ?? derived ?? null;
  const deadlinePassed =
    effectiveDeadline ? Date.now() > effectiveDeadline.getTime() : false;

  // Clubs
  const clubs = await db.club.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, shortName: true },
  });
  const clubMap = Object.fromEntries(clubs.map((c) => [c.id, c.name]));

  // User pick for this GW
  const currentPick =
    sid &&
    (await db.pick.findUnique({
      where: { userId_gwId: { userId: sid, gwId: gw.id } },
      select: { clubId: true },
    }));

  // All user picks this season (for visibility)
  const seasonPicks =
    sid &&
    (await db.pick.findMany({
      where: { userId: sid, seasonId: season.id },
      orderBy: [{ gwId: "asc" }],
      select: {
        clubId: true,
        gw: { select: { number: true } },
      },
    }));

  // Used clubs logic (earlier GWs, plus current GW if deadline passed)
  let usedClubIds: string[] = [];
  if (sid) {
    const pastPicks = await db.pick.findMany({
      where: {
        userId: sid,
        seasonId: season.id,
        gw: { number: { lt: gw.number } },
      },
      select: { clubId: true },
    });
    usedClubIds = Array.from(new Set(pastPicks.map((p) => p.clubId)));

    if (deadlinePassed && currentPick?.clubId) {
      if (!usedClubIds.includes(currentPick.clubId)) {
        usedClubIds.push(currentPick.clubId);
      }
    }
  }

  // Build a simple fixture table with names (no form here—/rumble/current has that)
  const fixtureRows = fixtures.map((fx) => ({
    id: fx.id,
    kickoffIso: fx.kickoff ? fx.kickoff.toISOString() : null,
    status: fx.status,
    home: { id: fx.homeClubId, name: clubMap[fx.homeClubId] },
    away: { id: fx.awayClubId, name: clubMap[fx.awayClubId] },
    score:
      fx.homeGoals != null && fx.awayGoals != null
        ? `${fx.homeGoals}-${fx.awayGoals}`
        : null,
  }));

  return NextResponse.json({
    ok: true,
    data: {
      season,
      gw: {
        id: gw.id,
        number: gw.number,
        deadline: effectiveDeadline ? effectiveDeadline.toISOString() : null,
        isLocked: deadlinePassed,
      },
      fixtures: fixtureRows,
      clubs,
      deadline: effectiveDeadline ? effectiveDeadline.toISOString() : null,
      pickedClubId: currentPick?.clubId ?? null,
      usedClubIds,
    },
    debug: {
      nowIso: now.toISOString(),
      earliestKickoffIso:
        fixtures.length && fixtures[0].kickoff
          ? fixtures[0].kickoff.toISOString()
          : null, // fixtures are ordered asc
      derivedDeadlineIso: derived ? derived.toISOString() : null,
      effectiveDeadlineIso: effectiveDeadline
        ? effectiveDeadline.toISOString()
        : null,
      deadlinePassed,
      totalFixturesThisGW: fixtures.length,
      seasonPickSummary: seasonPicks
        ? seasonPicks.map((p) => ({
            gw: p.gw.number,
            clubId: p.clubId,
            club: clubMap[p.clubId] ?? p.clubId,
          }))
        : [],
    },
  });
}
