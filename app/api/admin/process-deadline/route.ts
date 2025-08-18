import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  const { seasonId, gwNumber } = await req.json().catch(() => ({} as any));
  if (!seasonId || typeof gwNumber !== "number") {
    return NextResponse.json({ ok: false, error: "seasonId and gwNumber are required" }, { status: 400 });
  }

  const gw = await db.gameweek.findFirst({
    where: { seasonId, number: gwNumber },
    select: { id: true, number: true, deadline: true },
  });
  if (!gw) return NextResponse.json({ ok: false, error: "GW not found" }, { status: 404 });
  if (new Date() < gw.deadline) {
    return NextResponse.json({ ok: false, error: "Deadline not passed yet" }, { status: 400 });
  }

  const users = await db.user.findMany({ select: { id: true } });
  const seasonClubs = await db.club.findMany({
    where: { active: true },
    select: { id: true, shortName: true },
    orderBy: { shortName: "asc" },
  });

  let proxied = 0;
  let eliminated = 0;

  for (const u of users) {
    const hasPick = await db.pick.findFirst({ where: { userId: u.id, gwId: gw.id }, select: { id: true } });
    if (hasPick) continue;

    const st = await db.rumbleState.upsert({
      where: { userId_seasonId: { userId: u.id, seasonId } },
      update: {},
      create: { userId: u.id, seasonId },
      select: { proxiesUsed: true },
    });

    if (st.proxiesUsed < 2) {
      const used = new Set(
        (await db.pick.findMany({ where: { userId: u.id, seasonId }, select: { clubId: true } }))
          .map(p => p.clubId)
      );
      const choice = seasonClubs.find(c => !used.has(c.id));
      if (!choice) continue; // nothing left to auto-pick

      await db.pick.create({
        data: {
          userId: u.id,
          seasonId,
          gwId: gw.id,
          clubId: choice.id,
          source: "PROXY",
        },
      });
      await db.rumbleState.update({
        where: { userId_seasonId: { userId: u.id, seasonId } },
        data: { proxiesUsed: { increment: 1 } },
      });
      proxied++;
    } else {
      await db.rumbleState.update({
        where: { userId_seasonId: { userId: u.id, seasonId } },
        data: { eliminatedAtGw: gw.number, eliminatedAt: new Date() },
      });
      eliminated++;
    }
  }

  return NextResponse.json({ ok: true, proxied, eliminated });
}
