import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export async function GET() {
  try {
    const sid = (await cookies()).get("sid")?.value;
    if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const season = await db.season.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!season) return NextResponse.json({ ok: false, rows: [] });

    const picks = await db.pick.findMany({
      where: { userId: sid, seasonId: season.id },
      select: { clubId: true, gwId: true, club: { select: { shortName: true, name: true, id: true } }, gw: { select: { number: true } } },
      orderBy: { gw: { number: "asc" } },
    });

    if (picks.length === 0) return NextResponse.json({ ok: true, rows: [] });

    // Load all fixtures for those GW ids once
    const gwIds = Array.from(new Set(picks.map(p => p.gwId)));
    const fixtures = await db.fixture.findMany({
      where: { gwId: { in: gwIds } },
      select: {
        gwId: true,
        homeClubId: true,
        awayClubId: true,
        homeGoals: true,
        awayGoals: true,
        status: true,
        kickoff: true,
        homeClub: { select: { shortName: true } },
        awayClub: { select: { shortName: true } },
      },
    });

    const rows = picks.map(p => {
      const fx = fixtures.find(
        f => (f.homeClubId === p.clubId || f.awayClubId === p.clubId) && f.gwId === p.gwId
      );

      const isHome = fx ? fx.homeClubId === p.clubId : false;
      const oppShort = fx ? (isHome ? fx.awayClub.shortName : fx.homeClub.shortName) : null;
      const venue: "H" | "A" | "-" = fx ? (isHome ? "H" : "A") : "-";

      // score/status
      let scoreOrStatus = "TBD";
      if (fx) {
        if (fx.homeGoals != null && fx.awayGoals != null) {
          scoreOrStatus = `${fx.homeGoals}-${fx.awayGoals}`;
        } else {
          scoreOrStatus = fx.status ?? "TBD";
        }
      }

      // result
      let resultCode: "W" | "L" | "D" | "TBD" = "TBD";
      if (fx && fx.homeGoals != null && fx.awayGoals != null) {
        const my = isHome ? fx.homeGoals : fx.awayGoals;
        const opp = isHome ? fx.awayGoals : fx.homeGoals;
        resultCode = my > opp ? "W" : my < opp ? "L" : "D";
      }

      return {
        gwNumber: p.gw.number,
        clubId: p.club.id,
        clubShort: p.club.shortName,
        clubName: p.club.name,
        opponentShort: oppShort,
        venue,
        kickoffISO: fx?.kickoff?.toISOString() ?? null,
        scoreOrStatus,
        resultCode,
        resultVerb:
          resultCode === "W" ? "won" : resultCode === "L" ? "lost" : resultCode === "D" ? "drew" : "TBD",
      };
    });

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    console.error("GET /api/rumble/history failed:", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
