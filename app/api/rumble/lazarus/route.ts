import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export async function POST() {
  try {
    const sid = (await cookies()).get("sid")?.value;
    if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const season = await db.season.findFirst({ where: { isActive: true }, select: { id: true } });
    if (!season) return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });

    const state = await db.rumbleState.findUnique({
      where: { userId_seasonId: { userId: sid, seasonId: season.id } },
      select: { lazarusUsed: true, eliminatedAtGw: true },
    });

    if (!state?.eliminatedAtGw)
      return NextResponse.json({ ok: false, error: "You are not eliminated" }, { status: 400 });
    if (state.lazarusUsed)
      return NextResponse.json({ ok: false, error: "Lazarus already used" }, { status: 400 });

    const nextGw = await db.gameweek.findFirst({
      where: { seasonId: season.id, number: state.eliminatedAtGw + 1 },
      select: { deadline: true },
    });
    if (!nextGw) return NextResponse.json({ ok: false, error: "No next GW found" }, { status: 400 });
    if (Date.now() >= nextGw.deadline.getTime())
      return NextResponse.json({ ok: false, error: "Lazarus window closed" }, { status: 400 });

    await db.rumbleState.update({
      where: { userId_seasonId: { userId: sid, seasonId: season.id } },
      data: { lazarusUsed: true, eliminatedAtGw: null, eliminatedAt: null },
    });

    // Optional: also mark User.alive=true if you’re using it in UI logic
    await db.user.update({ where: { id: sid }, data: { alive: true } }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/rumble/lazarus failed:", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
