// app/api/rumble/pick/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/src/lib/db";
import { nextGwByEffectiveDeadline } from "@/src/lib/deadline";

export const runtime = "nodejs"; // IMPORTANT: Prisma needs Node runtime
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  seasonId?: string; // optional — we’ll infer active if missing
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

    // Choose target GW by the soonest future *effective* deadline (stored or fixtures T-30)
    const { gw: targetGw, deadline: eff } = await nextGwByEffectiveDeadline(season.id);
    if (!targetGw || !eff) {
      return NextResponse.json({ ok: false, error: "No active or upcoming Gameweek" }, { status: 409 });
    }

    // Authoritative deadline guard
    if (Date.now() >= eff.getTime()) {
      return NextResponse.json({ ok: false, error: "DEADLINE_PASSED" }, { status: 409 });
    }

    // Ensure this club actually plays in this GW
    const fixture = await db.fixture.findFirst({
      where: {
        gwId: targetGw.id,
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
          gwId: targetGw.id,
        },
      },
      update: { clubId },
      create: {
        userId: viewerId,
        seasonId: season.id,
        gwId: targetGw.id,
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
