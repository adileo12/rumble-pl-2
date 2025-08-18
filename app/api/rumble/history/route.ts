// app/api/rumble/history/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

function resultForClub(args: {
  clubId: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string | null;
}) {
  const { clubId, homeClubId, awayClubId, homeGoals, awayGoals, status } = args;

  if (status !== "FT" || homeGoals == null || awayGoals == null) {
    return { code: "TBD" as const, verb: "TBD" as const };
  }

  const isHome = clubId === homeClubId;
  const my = isHome ? homeGoals : awayGoals;
  const opp = isHome ? awayGoals : homeGoals;

  if (my > opp) return { code: "W" as const, verb: "won" as const };
  if (my === opp) return { code: "D" as const, verb: "drew" as const };
  return { code: "L" as const, verb: "lost" as const };
}

export async function GET(req: Request) {
  // Read NextAuth JWT from cookies (no custom import needed)
  const token = await getToken({ req });
  const userId = token?.sub as string | undefined;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const season = await db.season.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (!season) {
    return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });
  }

  // All picks by this user in the active season
  const picks = await db.pick.findMany({
    where: { userId, gw: { seasonId: season.id } },
    select: {
      id: true,
      clubId: true,
      gwId: true,
      createdAt: true,
      club: { select: { id: true, name: true, shortName: true } },
      gw: { select: { id: true, number: true } },
    },
    orderBy: [{ gw: { number: "asc" } }, { createdAt: "asc" }],
  });

  // Attach the GW fixture for the picked club and compute result
  const items = [];
  for (const p of picks) {
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
        : { code: "TBD" as const, verb: "TBD" as const };

    items.push({
      pickId: p.id,
      gwNumber: p.gw.number,
      pickedClub: p.club,
      kickoff: fx?.kickoff ?? null,
      score:
        fx?.homeGoals != null && fx?.awayGoals != null
          ? `${fx.homeGoals}-${fx.awayGoals}`
          : fx?.status ?? "—",
      opponent,
      resultCode: res.code, // "W" | "D" | "L" | "TBD"
      resultVerb: res.verb,  // "won" | "drew" | "lost" | "TBD"
    });
  }

  return NextResponse.json({ ok: true, items });
}
