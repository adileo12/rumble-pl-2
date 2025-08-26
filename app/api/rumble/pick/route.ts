// app/api/rumble/pick/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db"; // If your client is exported as `prisma`, just rename `db` -> `prisma` below.

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function readClubId(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      return toNum(body?.clubId);
    }
    const fd = await req.formData();
    return toNum(fd.get("clubId"));
  } catch {
    return null;
  }
}

async function resolveSeasonAndNextGw(seasonIdFromClient: number | null) {
  // 1) season
  const season =
    seasonIdFromClient != null
      ? await db.season.findUnique({ where: { id: seasonIdFromClient } })
      : await db.season.findFirst({
          where: { isActive: true },
          orderBy: { startsAt: "desc" },
        });

  if (!season) return { season: null, gw: null };

  // 2) next open GW (deadline in the future)
  const now = new Date();
  const gw =
    (await db.gameweek.findFirst({
      where: { seasonId: season.id, deadline: { gt: now } },
      orderBy: { deadline: "asc" },
    })) ||
    // If nothing in the future (end of season), take the latest so the API still behaves
    (await db.gameweek.findFirst({
      where: { seasonId: season.id },
      orderBy: { deadline: "desc" },
    }));

  return { season, gw };
}

export async function POST(req: NextRequest) {
  // Get the logged-in user id from your cookie/session.
  // (This matches your current cookie name used elsewhere.)
  const sid = req.cookies.get("sid")?.value;
  if (!sid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: Number(sid) } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Read and validate club
  const clubId = await readClubId(req);
  if (!clubId) {
    return NextResponse.json({ ok: false, error: "Missing clubId" }, { status: 400 });
  }

  // Season is server-resolved (client no longer needs to send seasonId)
  const { season, gw } = await resolveSeasonAndNextGw(null);
  if (!season || !gw) {
    return NextResponse.json({ ok: false, error: "No active gameweek" }, { status: 400 });
  }

  // “Last pick before deadline wins”: upsert by (userId, gameweekId)
  await db.pick.upsert({
    where: { userId_gameweekId: { userId: user.id, gameweekId: gw.id } },
    update: { clubId },
    create: { userId: user.id, gameweekId: gw.id, clubId },
  });

  return NextResponse.json({
    ok: true,
    seasonId: season.id,
    gameweekId: gw.id,
    clubId,
  });
}
