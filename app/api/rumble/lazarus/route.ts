import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export async function POST() {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const season = await db.season.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!season) return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });

  const st = await db.rumbleState.findUnique({
    where: { userId_seasonId: { userId: sid, seasonId: season.id } },
  });
  if (!st || !st.eliminatedAtGw) {
    return NextResponse.json({ ok: false, error: "You are not eliminated" }, { status: 400 });
  }
  if (st.lazarusUsed) {
    return NextResponse.json({ ok: false, error: "Lazarus already used" }, { status: 400 });
  }

  const nextGw = await db.gameweek.findFirst({
    where: { seasonId: season.id, number: st.eliminatedAtGw + 1 },
    select: { deadline: true },
  });
  if (!nextGw || new Date() >= nextGw.deadline) {
    return NextResponse.json({ ok: false, error: "Lazarus window closed" }, { status: 400 });
  }

  await db.rumbleState.update({
    where: { userId_seasonId: { userId: sid, seasonId: season.id } },
    data: { lazarusUsed: true, eliminatedAtGw: null, eliminatedAt: null },
  });

  return NextResponse.json({ ok: true });
}
