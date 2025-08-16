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

  // Enforce deadline on the server
  const kicks = await db.fixture.findMany({
    where: { gwId: gw.id, kickoff: { not: null } },
    select: { kickoff: true },
  });
  const { deadline } = computeDeadline(kicks.map((k) => k.kickoff as Date));
  const effectiveDeadline = gw.deadline ?? deadline ?? null;
  if (effectiveDeadline && Date.now() > effectiveDeadline.getTime()) {
    return NextResponse.json({ ok: false, error: "Deadline has passed for this gameweek" }, { status: 403 });
  }

  // Optional: prevent reusing a club used in any earlier GW this season
  const alreadyUsed = await db.pick.findFirst({
    where: {
      userId: sid,
      seasonId: season.id,
      clubId,
      gw: { number: { lt: gw.number } }, // relation filter to earlier GWs
    },
    select: { id: true },
  });
  if (alreadyUsed) {
    return NextResponse.json(
      { ok: false, error: "You have already used this club in a previous gameweek" },
      { status: 400 }
    );
  }

  // Upsert pick for this GW (allows edits until deadline)
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
