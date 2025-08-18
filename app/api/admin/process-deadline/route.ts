// app/api/admin/process-deadline/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { computeDeadline, getCurrentSeasonAndGW } from "@/src/lib/rumble";
import { getOrCreateState } from "@/src/lib/rumble-state";

// POST: auto-pick by proxy for anyone who missed current GW deadline.
// If proxiesUsed >= 2 -> eliminate at this GW.
export async function POST() {
  const { season, gw } = await getCurrentSeasonAndGW();
  if (!season || !gw) {
    return NextResponse.json({ ok: false, error: "No active gameweek" }, { status: 400 });
  }

  // Ensure deadline has actually passed
  const kicks = await db.fixture.findMany({
    where: { gwId: gw.id },
    select: { kickoff: true },
  });
  const { deadline } = computeDeadline(kicks.map(k => k.kickoff));
  if (!deadline || Date.now() < deadline.getTime()) {
    return NextResponse.json({ ok: false, error: "Deadline not yet passed" }, { status: 400 });
  }

  // Consider participants = users who picked in any prior GW of this season
  const priorUsers = await db.pick.findMany({
    where: { seasonId: season.id, gw: { number: { lt: gw.number } } },
    distinct: ["userId"],
    select: { userId: true },
  });
  const userIds = priorUsers.map(u => u.userId);

  let proxied = 0, eliminated = 0;

  // Clubs in alphabetical order
  const clubs = await db.club.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  for (const uid of userIds) {
    // Already picked this GW? skip
    const existing = await db.pick.findFirst({
      where: { userId: uid, gwId: gw.id },
      select: { id: true },
    });
    if (existing) continue;

    const state = await getOrCreateState(uid, season.id);
    if (state.eliminatedAtGw) {
      // already eliminated earlier
      continue;
    }

    // Find first not-yet-used club alphabetically
    const used = await db.pick.findMany({
      where: { userId: uid, seasonId: season.id, gw: { number: { lt: gw.number } } },
      select: { clubId: true },
    });
    const usedSet = new Set(used.map(u => u.clubId));
    const nextClub = clubs.find(c => !usedSet.has(c.id));

    if (state.proxiesUsed < 2 && nextClub) {
      // Auto-pick by proxy and increment proxiesUsed
      await db.$transaction([
        db.pick.upsert({
          where: { userId_gwId: { userId: uid, gwId: gw.id } },
          update: { clubId: nextClub.id, source: "PROXY" },
          create: {
            userId: uid,
            seasonId: season.id,
            gwId: gw.id,
            clubId: nextClub.id,
            source: "PROXY",
          },
        }),
        db.rumbleState.update({
          where: { userId_seasonId: { userId: uid, seasonId: season.id } },
          data: { proxiesUsed: { increment: 1 } },
        }),
      ]);
      proxied++;
    } else {
      // No proxies left -> eliminate at this GW
      await db.rumbleState.update({
        where: { userId_seasonId: { userId: uid, seasonId: season.id } },
        data: { eliminatedAtGw: gw.number, eliminatedAt: new Date() },
      });
      eliminated++;
    }
  }

  return NextResponse.json({ ok: true, proxied, eliminated, gw: gw.number });
}
