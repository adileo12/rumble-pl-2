import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/src/lib/db";

type Body = {
  seasonId: string;
  clubId: string; // or number, adapt if needed
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// --- helpers ---
async function getViewerId(): Promise<string | null> {
  try {
    const h = headers();
    const host = h.get("host");
    const protocol = process.env.VERCEL ? "https" : "http";
    const r = await fetch(`${protocol}://${host}/api/auth/me`, {
      headers: { cookie: cookies().toString() },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = await r.json();
    return (j?.user?.id ?? j?.id ?? null) as string | null;
  } catch {
    return null;
  }
}

async function getActiveOrNextGwForSubmission(seasonId: string) {
  const anyDb = db as any;
  const gwClient = anyDb.gameweek ?? anyDb.Gameweek;

  // Find the nearest upcoming GW (deadline in the future), else current active
  const now = new Date();
  const upcoming = await gwClient.findFirst({
    where: { seasonId, deadline: { gt: now } },
    orderBy: { deadline: "asc" },
    select: { gwNumber: true, deadline: true, isActive: true },
  });

  if (upcoming) return upcoming; // submit to the earliest future GW

  // If nothing upcoming, try current active (edge-case during result phase)
  const active = await gwClient.findFirst({
    where: { seasonId, isActive: true },
    select: { gwNumber: true, deadline: true, isActive: true },
  });
  return active ?? null;
}

async function clubAlreadyUsedThisSeason(userId: string, seasonId: string, clubId: string | number) {
  const anyDb = db as any;
  const pickClient = anyDb.rumblePick ?? anyDb.RumblePick ?? anyDb.pick ?? anyDb.Pick;
  const used = await pickClient.findFirst({
    where: { userId, seasonId, clubId },
    select: { id: true },
  });
  return !!used;
}

export async function POST(req: Request) {
  try {
    const viewerId = await getViewerId();
    if (!viewerId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { seasonId, clubId } = (await req.json()) as Body;
    if (!seasonId || !clubId) {
      return NextResponse.json({ ok: false, error: "Missing seasonId/clubId" }, { status: 400 });
    }

    const gw = await getActiveOrNextGwForSubmission(seasonId);
    if (!gw) {
      return NextResponse.json({ ok: false, error: "No active or upcoming Gameweek" }, { status: 409 });
    }

    // Rule: a user can only use each club once per season
    const dup = await clubAlreadyUsedThisSeason(viewerId, seasonId, clubId);
    if (dup) {
      return NextResponse.json(
        { ok: false, error: "Club already used in this season" },
        { status: 409 },
      );
    }

    // Last-write-wins upsert (unique compound key: userId+seasonId+gwNumber)
    const anyDb = db as any;
    const pickClient = anyDb.rumblePick ?? anyDb.RumblePick ?? anyDb.pick ?? anyDb.Pick;

    const pick = await pickClient.upsert({
      where: {
        userId_seasonId_gwNumber: {
          userId: viewerId,
          seasonId,
          gwNumber: gw.gwNumber,
        },
      },
      update: {
        clubId,
        submissionSource: "manual",
        updatedAt: new Date(),
      },
      create: {
        userId: viewerId,
        seasonId,
        gwNumber: gw.gwNumber,
        clubId,
        submissionSource: "manual",
      },
      select: { userId: true, seasonId: true, gwNumber: true, clubId: true, submissionSource: true },
    });

    return NextResponse.json({ ok: true, pick });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
