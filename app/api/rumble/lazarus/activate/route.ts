import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { computeDeadline } from "@/src/lib/rumble";

export async function POST() {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const season = await db.season.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!season) return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });

  const st = await db.rumbleState.findUnique({
    where: { userId_seasonId: { userId: sid, seasonId: season.id } },
    select: { lazarusUsed: true, eliminatedAtGw: true },
  });
  if (!st?.eliminatedAtGw) return NextResponse.json({ ok: false, error: "You are not eliminated" }, { status: 400 });
  if (st.lazarusUsed) return NextResponse.json({ ok: false, error: "Lazarus already used" }, { status: 400 });

  const nextGw = await db.gw.findFirst({
    where: { seasonId: season.id, number: { gt: st.eliminatedAtGw } },
    orderBy: { number: "asc" },
    select: { id: true, number: true },
  });
  if (!nextGw) return NextResponse.json({ ok: false, error: "No next gameweek" }, { status: 400 });

  const kicks = await db.fixture.findMany({ where: { gwId: nextGw.id }, select: { kickoff: true } });
  const { deadline } = computeDeadline(kicks.map(k => k.kickoff));
  if (!deadline || Date.now() > deadline.getTime()) {
    return NextResponse.json({ ok: false, error: "Lazarus window has closed" }, { status: 400 });
  }

  // Revive: clear elimination and mark lazarusUsed = true
  await db.rumbleState.update({
    where: { userId_seasonId: { userId: sid, seasonId: season.id } },
    data: { lazarusUsed: true, eliminatedAtGw: null, eliminatedAt: null },
  });

  return NextResponse.json({ ok: true });
}
