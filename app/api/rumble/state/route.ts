import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export async function GET() {
  try {
    const sid = (await cookies()).get("sid")?.value;
    if (!sid) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const season = await db.season.findFirst({
      where: { isActive: true },
      select: { id: true, year: true },
    });
    if (!season) {
      return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });
    }

    // ensure a row exists
    const state = await db.rumbleState.upsert({
      where: { userId_seasonId: { userId: sid, seasonId: season.id } },
      update: {},
      create: { userId: sid, seasonId: season.id, proxiesUsed: 0, lazarusUsed: false },
      select: {
        proxiesUsed: true,
        lazarusUsed: true,
        eliminatedAtGw: true,
        eliminatedAt: true,
      },
    });

    let canUseLazarus = false;
    let windowClosesAt: string | null = null;

    if (state.eliminatedAtGw && !state.lazarusUsed) {
      const nextGw = await db.gameweek.findFirst({
        where: { seasonId: season.id, number: state.eliminatedAtGw + 1 },
        select: { deadline: true },
      });
      if (nextGw) {
        const now = Date.now();
        const dl = nextGw.deadline.getTime();
        if (now < dl) {
          canUseLazarus = true;
          windowClosesAt = nextGw.deadline.toISOString();
        }
      }
    }

    return NextResponse.json({
      ok: true,
      state,
      canUseLazarus,
      windowClosesAt,
      proxiesRemaining: Math.max(0, 2 - (state.proxiesUsed ?? 0)),
    });
  } catch (e: any) {
    console.error("GET /api/rumble/state failed:", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
