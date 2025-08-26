import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getUserIdFromCookies } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const anyDb: any = db;
    const seasonClient = anyDb.season ?? anyDb.Season;
    const gwClient =
      anyDb.gameweek ?? anyDb.gameWeek ?? anyDb.Gameweek ?? anyDb.GameWeek;
    const pickClient =
      anyDb.rumblePick ?? anyDb.RumblePick ?? anyDb.pick ?? anyDb.Pick;

    // Parse body safely
    const body = await req.json().catch(() => ({} as any));
    const clubId = Number(body?.clubId);
    let seasonId = body?.seasonId ? Number(body.seasonId) : undefined;

    if (!clubId || Number.isNaN(clubId)) {
      return NextResponse.json({ ok: false, error: "Missing clubId" }, { status: 400 });
    }

    // Resolve season: prefer body.seasonId, else active season
    let season = null as any;
    if (seasonId) {
      season = await seasonClient.findUnique({ where: { id: seasonId } });
    }
    if (!season) {
      season = await seasonClient.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (season) seasonId = season.id;
    }
    if (!season) {
      return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });
    }

    const now = new Date();

    // After a deadline passes, submissions go to the NEXT GW for this season
    const gw = await gwClient.findFirst({
      where: { seasonId, deadline: { gt: now } },
      orderBy: { deadline: "asc" },
    });

    if (!gw) {
      return NextResponse.json({ ok: false, error: "No upcoming gameweek" }, { status: 400 });
    }

    // Replace any previous pick for this user+gw, then create the new one
    await pickClient.deleteMany({ where: { userId, gwId: gw.id } });
    const pick = await pickClient.create({
      data: { userId, gwId: gw.id, clubId },
      select: { id: true, gwId: true, clubId: true },
    });

    return NextResponse.json({ ok: true, pick, seasonId, gwId: gw.id });
  } catch (err) {
    console.error("POST /api/rumble/pick error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
