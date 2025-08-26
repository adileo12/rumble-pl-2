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
    const gwClient = anyDb.gameweek ?? anyDb.Gameweek ?? anyDb.GameWeek;
    const pickClient = anyDb.pick ?? anyDb.Pick ?? anyDb.rumblePick ?? anyDb.RumblePick;

    const body = await req.json().catch(() => ({} as any));
    const rawClubId = body?.clubId;
    const clubId = typeof rawClubId === "string" ? rawClubId.trim() : String(rawClubId || "").trim();

    if (!clubId) {
      return NextResponse.json({ ok: false, error: "Missing clubId" }, { status: 400 });
    }

    // Choose season: use explicit body.seasonId if provided, else latest active
    let seasonId = typeof body?.seasonId === "string" ? body.seasonId : undefined;
    let season = null as any;
    if (seasonId) {
      season = await seasonClient.findUnique({ where: { id: seasonId } });
    }
    if (!season) {
      season = await seasonClient.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
      if (season) seasonId = season.id;
    }
    if (!seasonId) {
      return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });
    }

    // Next upcoming gameweek in this season
    const now = new Date();
    const gw = await gwClient.findFirst({
      where: { seasonId, deadline: { gt: now } },
      orderBy: { deadline: "asc" },
    });
    if (!gw) {
      return NextResponse.json({ ok: false, error: "No upcoming gameweek" }, { status: 400 });
    }

    // Replace any previous pick for this user & GW
    await pickClient.deleteMany({ where: { userId, gwId: gw.id } });

    const pick = await pickClient.create({
      data: { userId, seasonId, gwId: gw.id, clubId },
      select: { id: true, seasonId: true, gwId: true, clubId: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, pick });
  } catch (err) {
    console.error("POST /api/rumble/pick error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
