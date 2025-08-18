import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { getCurrentSeasonAndGW } from "@/src/lib/rumble";

type ResultCode = "W" | "D" | "L" | "TBD";

function resultForClub(args: {
  clubId: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string | null;
}): { code: ResultCode; verb: "won" | "drew" | "lost" | "TBD" } {
  const { clubId, homeClubId, awayClubId, homeGoals, awayGoals, status } = args;

  // Only decide W/D/L when full time and both scores are known
  if (status !== "FT" || homeGoals == null || awayGoals == null) {
    return { code: "TBD", verb: "TBD" };
  }

  const isHome = clubId === homeClubId;
  const my = isHome ? homeGoals : awayGoals;
  const opp = isHome ? awayGoals : homeGoals;

  if (my > opp) return { code: "W", verb: "won" };
  if (my === opp) return { code: "D", verb: "drew" };
  return { code: "L", verb: "lost" };
}

export async function GET() {
  // Same auth pattern as /api/rumble/pick
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // We only need the active season id (your picks store seasonId)
  const { season } = await getCurrentSeasonAndGW();
  if (!season) {
    return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });
  }

  // All of this user's picks in the active season
  const picks = await db.pick.findMany({
    where: { userId: sid, seasonId: season.id },
    select: {
      id: true,
      clubId: true,
      gwId: true,
      createdAt: true,
      club: { select: { id: true, name: true, shortName: true } },
      gw: { select: { number: true } },
    },
    orderBy: [{ gw: { number: "asc" } }, { createdAt: "asc" }],
  });

  const items: Array<{
    pickId: string;
    gwNumber: number;
    pickedClub: { id: string; name: string; shortName: string };
    opponent: { side: "H" | "A"; id: string; name: string; shortName: string } | null;
    kickoff: Date | null;
    score: string | null;
    resultCode: ResultCode;
    resultVerb: "won" | "drew" | "lost" | "TBD";
  }> = [];

  for (const p of picks) {
    // Find the picked club’s fixture in that GW
    const fx = await db.fixture.findFirst({
      where: {
        gwId: p.gwId,
        OR: [{ homeClubId: p.clubId }, { awayClubId: p.clubId }],
      },
      select: {
        id: true,
        status: true,
        kickoff: true,
        homeGoals: true,
        awayGoals: true,
        homeClubId: true,
        awayClubId: true,
        home: { select: { id: true, name: true, shortName: true } },
        away: { select: { id: true, name: true, shortName: true } },
      },
    });

    const opponent =
      fx && p.clubId === fx.homeClubId
        ? { side: "H" as const, id: fx.away.id, name: fx.away.name, shortName: fx.away.shortName }
        : fx && p.clubId === fx.awayClubId
        ? { side: "A" as const, id: fx.home.id, name: fx.home.name, shortName: fx.home.shortName }
        : null;

    const res =
      fx
        ? resultForClub({
            clubId: p.clubId,
            homeClubId: fx.homeClubId,
            awayClubId: fx.awayClubId,
            homeGoals: fx.homeGoals,
            awayGoals: fx.awayGoals,
            status: fx.status ?? null,
          })
        : { code: "TBD" as ResultCode, verb: "TBD" as const };

    items.push({
      pickId: p.id,
      gwNumber: p.gw.number,
      pickedClub: p.club,
      opponent,
      kickoff: fx?.kickoff ?? null,
      score:
        fx?.homeGoals != null && fx?.awayGoals != null
          ? `${fx.homeGoals}-${fx.awayGoals}`
          : fx?.status ?? "—",
      resultCode: res.code,
      resultVerb: res.verb,
    });
  }

  return NextResponse.json({ ok: true, items });
}
