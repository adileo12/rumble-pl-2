import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Decide win/loss from a fixture for a given clubId
function didClubLoseForFixture(fx: any, clubId: string | number) {
  const isHome = String(fx.homeClubId) === String(clubId);
  const isAway = String(fx.awayClubId) === String(clubId);
  if (!isHome && !isAway) return null; // not this team's match (double-header edge case ignored)
  if (fx.status !== "FT" && fx.finished !== true) return null;
  const hg = Number(fx.homeGoals ?? fx.home_score ?? 0);
  const ag = Number(fx.awayGoals ?? fx.away_score ?? 0);
  const lost = (isHome && hg < ag) || (isAway && ag < hg);
  return lost;
}

export async function POST(req: Request) {
  try {
    const anyDb = db as any;
    const gwClient = anyDb.gameweek ?? anyDb.Gameweek;
    const pickClient = anyDb.rumblePick ?? anyDb.RumblePick ?? anyDb.pick ?? anyDb.Pick;
    const fxClient = anyDb.fixture ?? anyDb.Fixture;
    const elimClient = anyDb.rumbleElimination ?? anyDb.RumbleElimination ?? null;
    const lazClient = anyDb.rumbleLazarus ?? anyDb.RumbleLazarus ?? null;

    const { seasonId, gwNumber } = await req.json();
    if (!seasonId || gwNumber == null) {
      return NextResponse.json({ ok: false, error: "Missing seasonId/gwNumber" }, { status: 400 });
    }

    const gw = await gwClient.findUnique({
      where: { seasonId_gwNumber: { seasonId, gwNumber } },
      select: { deadline: true },
    });
    if (!gw) return NextResponse.json({ ok: false, error: "Gameweek not found" }, { status: 404 });

    // Ensure all fixtures are finished
    const fixtures = await fxClient.findMany({
      where: { seasonId, gwNumber },
      select: {
        id: true, homeClubId: true, awayClubId: true,
        homeGoals: true, awayGoals: true, status: true, finished: true,
      },
    });
    if (!fixtures.length) {
      return NextResponse.json({ ok: false, error: "No fixtures for GW" }, { status: 409 });
    }
    const unfinished = fixtures.some((f: any) => f.status !== "FT" && f.finished !== true);
    if (unfinished) {
      return NextResponse.json({ ok: false, error: "GW not complete yet" }, { status: 409 });
    }

    // Evaluate each user's final pick for this GW
    const picks = await pickClient.findMany({
      where: { seasonId, gwNumber },
      select: { id: true, userId: true, clubId: true, submissionSource: true },
    });

    // Next GW deadline – sets Lazarus window
    const nextGw = await gwClient.findFirst({
      where: { seasonId, gwNumber: { gt: gwNumber } },
      orderBy: { gwNumber: "asc" },
      select: { gwNumber: true, deadline: true },
    });

    const eliminated: Array<{ userId: string; reason: string }> = [];

    for (const p of picks) {
      // find the fixture this club played in (assumes 1 league match per GW per club)
      const fx = fixtures.find((f: any) =>
        String(f.homeClubId) === String(p.clubId) || String(f.awayClubId) === String(p.clubId),
      );
      if (!fx) continue;
      const lost = didClubLoseForFixture(fx, p.clubId);
      if (lost === true) {
        eliminated.push({ userId: p.userId, reason: "lost-match" });

        if (elimClient) {
          await elimClient.upsert({
            where: { seasonId_userId: { seasonId, userId: p.userId } },
            update: { reason: "lost-match", gwNumber, eliminatedAt: new Date() },
            create: { seasonId, userId: p.userId, reason: "lost-match", gwNumber, eliminatedAt: new Date() },
          });
        }

        if (lazClient && nextGw?.deadline) {
          await lazClient.upsert({
            where: { seasonId_userId: { seasonId, userId: p.userId } },
            update: {
              eligibleFrom: new Date(), eligibleUntil: nextGw.deadline,
              used: false,
            },
            create: {
              seasonId, userId: p.userId,
              eligibleFrom: new Date(), eligibleUntil: nextGw.deadline,
              used: false,
            },
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      gradedGw: gwNumber,
      eliminated,
      lazarusWindow: nextGw?.deadline ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
