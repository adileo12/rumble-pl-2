import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export async function GET() {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const season = await db.season.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!season) return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });

  // Ensure a row exists so we can always show proxy usage (0/2) etc.
  const state = await db.rumbleState.upsert({
    where: { userId_seasonId: { userId: sid, seasonId: season.id } },
    update: {},
    create: { userId: sid, seasonId: season.id },
    select: { proxiesUsed: true, lazarusUsed: true, eliminatedAtGw: true, eliminatedAt: true },
  });

  let canUseLazarus = false;
  let windowClosesAt: Date | null = null;

  if (state.eliminatedAtGw && !state.lazarusUsed) {
    const nextGw = await db.gameweek.findFirst({
      where: { seasonId: season.id, number: state.eliminatedAtGw + 1 },
      select: { deadline: true },
    });
    if (nextGw) {
      windowClosesAt = nextGw.deadline;
      canUseLazarus = new Date() < nextGw.deadline;
    }
  }

  return NextResponse.json({
    ok: true,
    state,
    canUseLazarus,
    windowClosesAt,
    proxiesRemaining: Math.max(0, 2 - state.proxiesUsed),
  });
}
