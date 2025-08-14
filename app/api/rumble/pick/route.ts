// app/api/rumble/pick/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { computeDeadline, getCurrentSeasonAndGW } from "@/src/lib/rumble";

export async function POST(req: Request) {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { clubId } = await req.json().catch(() => ({}));
  if (!clubId) return NextResponse.json({ ok: false, error: "Missing clubId" }, { status: 400 });

  const { season, gw } = await getCurrentSeasonAndGW();
  if (!season || !gw) return NextResponse.json({ ok: false, error: "No active gameweek" }, { status: 400 });

  // Deadline check
  const fixtures = await db.fixture.findMany({
    where: { gwId: gw.id },
    select: { kickoff: true },
    orderBy: { kickoff: "asc" },
    take: 1,
  });
  const { deadline } = computeDeadline(fixtures.map(f => new Date(f.kickoff)));
  if (!deadline) return NextResponse.json({ ok: false, error: "No fixtures in this GW" }, { status: 400 });
  if (new Date() > deadline) return NextResponse.json({ ok: false, error: "Deadline passed" }, { status: 400 });

  // Enforce “one club ever” rule (excluding current GW’s existing pick so user can change it)
  const existing = await db.pick.findMany({
    where: { userId: sid /* optional: seasonId: season.id */ },
    select: { clubId: true, gwId: true },
  });
  const pickedInOtherGW = existing.some(p => p.clubId === clubId && p.gwId !== gw.id);
  if (pickedInOtherGW) {
    return NextResponse.json({ ok: false, error: "You have already used this club in a previous week." }, { status: 400 });
  }

  // Upsert pick for this GW
  await db.pick.upsert({
    where: { userId_gwId: { userId: sid, gwId: gw.id } },
    update: { clubId },
    create: {
      userId: sid,
      seasonId: season.id,
      gwId: gw.id,
      clubId,
      source: "USER",
    },
  });

  return NextResponse.json({ ok: true });
}
