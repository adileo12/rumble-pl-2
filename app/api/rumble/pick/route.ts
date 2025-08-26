// app/api/rumble/pick/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getUserIdFromCookies } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawUserId = await getUserIdFromCookies();
    if (!rawUserId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = String(rawUserId); // normalize

    // --- Prisma model accessors (be agnostic to model casing/names) ---
    const anyDb: any = db;
    const seasonClient = anyDb.season ?? anyDb.Season;
    const gwClient =
      anyDb.gameweek ?? anyDb.gameWeek ?? anyDb.Gameweek ?? anyDb.GameWeek;
    const pickClient =
      anyDb.rumblePick ?? anyDb.RumblePick ?? anyDb.pick ?? anyDb.Pick;

    // --- Parse and normalize body ---
    const body = (await req.json().catch(() => ({}))) as any;

    // Allow clubId as number or string; store/query as string to be safe
    const clubIdRaw = body?.clubId;
    const clubId =
      typeof clubIdRaw === "number"
        ? String(clubIdRaw)
        : typeof clubIdRaw === "string"
        ? clubIdRaw.trim()
        : "";

    // seasonId optional in body; normalize to string if present
    let seasonId: string | undefined =
      body?.seasonId != null ? String(body.seasonId).trim() : undefined;

    if (!clubId) {
      return NextResponse.json(
        { ok: false, error: "Missing clubId" },
        { status: 400 }
      );
    }

    // --- Resolve season: prefer body.seasonId else active season ---
    let season: any = null;
    if (seasonId) {
      season = await seasonClient.findUnique({ where: { id: seasonId } });
    }
    if (!season) {
      season = await seasonClient.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (season) seasonId = String(season.id);
    }
    if (!seasonId || !season) {
      return NextResponse.json(
        { ok: false, error: "No active season" },
        { status: 400 }
      );
    }

    // --- Choose the NEXT GW for that season (deadline > now) ---
    const now = new Date();
    const gw = await gwClient.findFirst({
      where: { seasonId: seasonId, deadline: { gt: now } },
      orderBy: { deadline: "asc" },
    });
    if (!gw) {
      return NextResponse.json(
        { ok: false, error: "No upcoming gameweek" },
        { status: 400 }
      );
    }

    // --- Replace previous pick for this user+gw, then create the new one ---
    // Note: support schemas where the field is gwId or gameweekId
    const whereByGw =
      "gwId" in (await pickClient._dmmf?.modelMap?.Pick?.fields ?? {}) // defensive; will be undefined outside prisma runtime
        ? { gwId: gw.id }
        : { gameweekId: gw.id };

    await pickClient.deleteMany({ where: { userId, ...whereByGw } });

    const dataByGw =
      "gwId" in (await pickClient._dmmf?.modelMap?.Pick?.fields ?? {})
        ? { userId, gwId: gw.id, clubId }
        : { userId, gameweekId: gw.id, clubId };

    const pick = await pickClient.create({
      data: dataByGw,
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      pick,
      seasonId,
      gwId: gw.id,
      clubId,
    });
  } catch (err) {
    console.error("POST /api/rumble/pick error", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
