// app/api/rumble/lazarus/eligibility/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { computeDeadline } from "@/src/lib/rumble";

export async function GET() {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const season = await db.season.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!season) return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });

  const st = await db.rumbleState.findUnique({
    where: { userId_seasonId: { userId: sid, seasonId: season.id } },
    select: { lazarusUsed: true, eliminatedAtGw: true },
  });

  if (!st?.eliminatedAtGw || st.lazarusUsed) {
    return NextResponse.json({ ok: true, eligible: false });
  }

  const elimGw = await db.gameweek.findFirst({
    where: { seasonId: season.id, number: st.eliminatedAtGw },
    select: { id: true, number: true },
  });
  if (!elimGw) return NextResponse.json({ ok: true, eligible: false });

  const nextGw = await db.gameweek.findFirst({
    where: { seasonId: season.id, number: { gt: elimGw.number } },
    orderBy: { number: "asc" },
    select: { id: true, number: true },
  });
  if (!nextGw) return NextResponse.json({ ok: true, eligible: false });

  const kicks = await db.fixture.findMany({ where: { gwId: nextGw.id }, select: { kickoff: true } });
  const { deadline } = computeDeadline(kicks.map(k => k.kickoff));
  if (!deadline) return NextResponse.json({ ok: true, eligible: false });

  return NextResponse.json({
    ok: true,
    eligible: Date.now() < deadline.getTime(),
    window: { reviveBy: deadline.toISOString(), forGw: nextGw.number },
  });
}
