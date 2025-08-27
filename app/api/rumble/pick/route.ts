// app/api/rumble/pick/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/src/lib/db";

export const runtime = "nodejs"; // IMPORTANT: Prisma needs Node runtime
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  seasonId?: string;     // optional — we’ll infer active if missing
  clubId: string;
};

// --- helpers ---
async function getViewerId(): Promise<string | null> {
  try {
    const h = headers();
    // We stored user id directly in cookie "sid" in this codebase
    const cookie = h.get("cookie") ?? "";
    const m = cookie.match(/(?:^|;\s*)sid=([^;]+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Use schema: Gameweek { id, seasonId, number, deadline, isLocked } */
async function getActiveOrNextGwForSubmission(seasonId: string) {
  const now = new Date();

  // Choose the soonest future deadline; else fall back to latest past gw (if you want).
  const upcoming = await db.gameweek.findFirst({
    where: { seasonId, deadline: { gt: now } },
    orderBy: { deadline: "asc" },
    select: { id: true, number: true, deadline: true, isLocked: true },
  });

  if (upcoming) return upcoming;

  // Optional: fall back to the latest gw by number if nothing is upcoming
  const latest = await db.gameweek.findFirst({
    where: { seasonId },
    orderBy: { number: "desc" },
    select: { id: true, number: true, deadline: true, isLocked: true },
  });

  return latest ?? null;
}

/** Check if club already used in this season (Pick has gwId, not gwNumber) */
async function clubAlreadyUsedThisSeason(userId: string, seasonId: string, clubId: string) {
  const used = await db.pick.findFirst({
    where: { userId, seasonId, clubId },
    select: { id: true },
  });
  return !!used;
}

export async function POST(req: Request) {
  try {
    const viewerId = await getViewerId();
    if (!viewerId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { seasonId: bodySeasonId, clubId } = (await req.json()) as Body;
    if (!clubId) {
      return NextResponse.json({ ok: false, error: "clubId required" }, { status: 400 });
    }

    // Infer season if the client doesn’t pass it
    const season =
      bodySeasonId
        ? await db.season.findUnique({ where: { id: bodySeasonId } })
        : await db.season.findFirst({ where: { isActive: true } });

    if (!season) {
      return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });
    }

    const gw = await getActiveOrNextGwForSubmission(season.id);
    if (!gw) {
      return NextResponse.json({ ok: false, error: "No active or upcoming Gameweek" }, { status: 409 });
    }

    // Deadline guard (T-30 min of first kickoff would be better; using GW.deadline here)
    if (gw.deadline && new Date() >= gw.deadline) {
      return NextResponse.json({ ok: false, error: "DEADLINE_PASSED" }, { status: 409 });
    }

    // Ensure this club actually plays in this GW
    const fixture = await db.fixture.findFirst({
      where: {
        gwId: gw.id,
        OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
      },
      select: { id: true },
    });
    if (!fixture) {
      return NextResponse.json({ ok: false, error: "CLUB_NOT_IN_THIS_GW" }, { status: 400 });
    }

    // One-per-season rule
    if (await clubAlreadyUsedThisSeason(viewerId, season.id, clubId)) {
      return NextResponse.json({ ok: false, error: "CLUB_ALREADY_USED" }, { status: 409 });
    }

    // Upsert by compound unique (userId, seasonId, gwId) — matches your schema
    const pick = await db.pick.upsert({
      where: {
        userId_seasonId_gwId: {
          userId: viewerId,
          seasonId: season.id,
          gwId: gw.id,
        },
      },
      update: { clubId },
      create: {
        userId: viewerId,
        seasonId: season.id,
        gwId: gw.id,
        clubId,
        // source: defaults to "USER" in schema; omit or set explicitly if desired
      },
      include: { club: true },
    });

    return NextResponse.json({ ok: true, pick });
  } catch (err: any) {
    // Log the underlying issue (especially useful on Vercel)
    console.error("PICK ERROR:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
