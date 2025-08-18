// app/api/admin/process-deadline/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { computeDeadline, getCurrentSeasonAndGW } from "@/src/lib/rumble";
import { getOrCreateState } from "@/src/lib/rumble-state";

/**
 * Runs after the current GW deadline:
 * - If a user missed making a pick, auto-pick the first unused club alphabetically (Proxy),
 *   up to 2 times per season.
 * - If no proxies left, mark them eliminated at this GW.
 */
export async function POST() {
  const { season, gw } = await getCurrentSeasonAndGW();
  if (!season || !gw) {
    return NextResponse.json({ ok: false, error: "No active gameweek" }, { status: 400 });
  }

  // Ensure deadline is actually passed
  const kicks = await db.fixture.findMany({
    where: { gwId: gw.id },
    select: { kickoff: true },
  });
  const { deadline } = computeDeadline(kicks.map(k => k.kickoff));
  if (!deadline || Date.now() < deadline.getTime()) {
    return NextResponse.json({ ok: false, error: "Deadline not yet passed" }, { status: 400 });
  }

  // Participants: users who picked in any prior GW of this season
  const priorUsers = await db.pick.findMany({
    where: { seasonId: season.id, gw: { number: { lt: gw.number } } },
    distinct: ["userId"],
    select: { userId: true },
  });
  const userIds = priorUsers.map(u => u.userId);

  // Alphabetical list of active clubs
  const clubs = await db.club.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  let proxied = 0;
  let eliminated = 0;

  for (const uid of userIds) {
    // Already picked for this GW? skip
    const existing = await db.pick.findFirst({
      where: { userId: uid, gwId: gw.id },
      select: { id: true },
    });
    if (existing) continue;

    const state = await getOrCreateState(uid, season.id);
    if (state.eliminatedAtGw) continue; // already eliminated

    // Find first unused club (by this user in earlier GWs this season)
    const used = await db.pick.findMany({
      where: { userId: uid, seasonId: season.id, gw: { number: { lt: gw.number } } },
      select: { clubId: true },
    });
    const usedSet = new Set(used.map(u => u.clubId));
    const nextClub = clubs.find(c => !usedSet.has(c.id));

    if (state.proxiesUsed < 2 && nextClub) {
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
      // No proxies left -> eliminate now
      await db.rumbleState.update({
        where: { userId_seasonId: { userId: uid, seasonId: season.id } },
        data: { eliminatedAtGw: gw.number, eliminatedAt: new Date() },
      });
      eliminated++;
    }
  }

  return NextResponse.json({ ok: true, gw: gw.number, proxied, eliminated });
}
