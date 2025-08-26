// app/api/rumble/pick/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db as client } from "@/lib/db"; // If you export prisma as `prisma`, rename `db` below.
const db = client;

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function readPayload(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({} as any));
      return { clubId: toNum(body?.clubId), gwId: toNum(body?.gwId) };
    }
    const fd = await req.formData();
    return { clubId: toNum(fd.get("clubId")), gwId: toNum(fd.get("gwId")) };
  } catch {
    return { clubId: null, gwId: null };
  }
}

async function getActiveSeason() {
  // Active season first; otherwise most recent season.
  const season =
    (await db.season.findFirst({
      where: { isActive: true },
      orderBy: { startsAt: "desc" },
    })) ||
    (await db.season.findFirst({
      orderBy: { startsAt: "desc" },
    }));

  return season;
}

async function nextOpenGwForSeason(seasonId: number) {
  const now = new Date();
  const next =
    (await db.gameweek.findFirst({
      where: { seasonId, deadline: { gt: now } },
      orderBy: { deadline: "asc" },
    })) ||
    (await db.gameweek.findFirst({
      where: { seasonId },
      orderBy: { deadline: "desc" }, // when season is completed
    }));
  return next;
}

export async function POST(req: NextRequest) {
  // Auth (same cookie your app uses elsewhere)
  const sid = req.cookies.get("sid")?.value;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: Number(sid) } });
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Payload
  const { clubId, gwId } = await readPayload(req);
  if (!clubId) {
    // keep this message minimal so it doesn’t regress older front-ends that parse text
    return NextResponse.json({ ok: false, error: "Missing clubId" }, { status: 400 });
  }

  // Determine target gameweek
  let gameweek = null as null | { id: number; seasonId: number; deadline: Date };

  if (gwId) {
    const gw = await db.gameweek.findUnique({ where: { id: gwId } });
    if (!gw) {
      return NextResponse.json({ ok: false, error: "Invalid gwId" }, { status: 400 });
    }
    const now = new Date();
    if (gw.deadline > now) {
      gameweek = gw;
    } else {
      // shift forward to the next open GW in the same season
      gameweek = await nextOpenGwForSeason(gw.seasonId);
    }
  } else {
    const season = await getActiveSeason();
    if (!season) return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });
    gameweek = await nextOpenGwForSeason(season.id);
  }

  if (!gameweek) {
    return NextResponse.json({ ok: false, error: "No target gameweek" }, { status: 400 });
  }

  // Upsert: last pick before deadline wins
  await db.pick.upsert({
    where: { userId_gameweekId: { userId: user.id, gameweekId: gameweek.id } },
    update: { clubId },
    create: { userId: user.id, gameweekId: gameweek.id, clubId },
  });

  return NextResponse.json({
    ok: true,
    gameweekId: gameweek.id,
    seasonId: gameweek.seasonId,
    clubId,
  });
}
