import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { getUserIdFromCookies } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // --- Auth: be tolerant to both cookie names (session or sid) ---
    let userId: number | null = null;
    try {
      const uid = await getUserIdFromCookies();
      if (uid) userId = Number(uid);
    } catch {
      /* ignore and try fallbacks */
    }
    if (!userId) {
      const jar = cookies();
      const raw =
        jar.get("sid")?.value ??
        jar.get("session")?.value ??
        null;
      if (raw && /^\d+$/.test(raw)) {
        userId = Number(raw);
      }
    }
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // --- Parse body safely ---
    const body = await req.json().catch(() => ({} as any));
    const clubId = Number(body?.clubId);
    let seasonId = body?.seasonId ? Number(body.seasonId) : undefined;

    if (!clubId || Number.isNaN(clubId)) {
      return NextResponse.json(
        { ok: false, error: "Missing clubId" },
        { status: 400 }
      );
    }

    // --- Resolve season (prefer body.seasonId, else active season) ---
    const anyDb: any = db;
    const Season = anyDb.season ?? anyDb.Season;
    const Gameweek =
      anyDb.gameweek ?? anyDb.gameWeek ?? anyDb.Gameweek ?? anyDb.GameWeek;
    const Pick =
      anyDb.rumblePick ?? anyDb.RumblePick ?? anyDb.pick ?? anyDb.Pick;

    let season = null as any;
    if (seasonId) {
      season = await Season.findUnique({ where: { id: seasonId } });
    }
    if (!season) {
      season = await Season.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (season) seasonId = season.id;
    }
    if (!season) {
      return NextResponse.json(
        { ok: false, error: "No active season" },
        { status: 400 }
      );
    }

    // --- After the deadline, auto-target the NEXT GW ---
    const now = new Date();
    const gw = await Gameweek.findFirst({
      where: { seasonId, deadline: { gt: now } },
      orderBy: { deadline: "asc" },
    });
    if (!gw) {
      return NextResponse.json(
        { ok: false, error: "No upcoming gameweek" },
        { status: 400 }
      );
    }

    // --- Replace any previous pick for this user+gw and create new one ---
    await Pick.deleteMany({ where: { userId, gwId: gw.id } });
    const pick = await Pick.create({
      data: { userId, gwId: gw.id, clubId },
      select: { id: true, gwId: true, clubId: true },
    });

    return NextResponse.json({ ok: true, pick, seasonId, gwId: gw.id });
  } catch (err) {
    console.error("POST /api/rumble/pick error", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
