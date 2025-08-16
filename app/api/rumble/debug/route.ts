// app/api/rumble/debug/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { getCurrentSeasonAndGW } from "@/src/lib/rumble"; // note: no computeDeadline import

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

  // Compute derived deadline locally: 30m before earliest kickoff
  const ks = fixtures
    .map((f) => f.kickoff)
    .filter((d): d is Date => d instanceof Date);
  const derived =
    ks.length > 0
      ? new Date(Math.min(...ks.map((d) => d.getTime())) - 30 * 60 * 1000)
      : null;

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
  const currentPick: { clubId: string } | null = sid
    ? await db.pick.findUnique({
        where: { userId_gwId: { userId: sid, gwId: gw.id } },
        select: { clubId: true },
      })
    : null;

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
    if (deadlinePassed && currentPick?.clubId && !usedClubIds.includes(currentPick.clubId)) {
      usedClubIds.push(currentPick.clubId);
    }
  }

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
      earliestKickoffIso: ks.length ? new Date(Math.min(...ks.map((d) => d.getTime()))).toISOString() : null,
      derivedDeadlineIso: derived ? derived.toISOString() : null,
      effectiveDeadlineIso: effectiveDeadline ? effectiveDeadline.toISOString() : null,
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
