import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Choose first unused club alphabetically by name
async function pickProxyClubForUser(seasonId: string, userId: string) {
  const clubs = await db.club.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const used = await db.pick.findMany({ where: { seasonId, userId }, select: { clubId: true } });
  const usedSet = new Set(used.map(u => u.clubId));
  return clubs.find(c => !usedSet.has(c.id)) || null;
}

// Count proxies used (PROXY source) for this season/user
async function countProxiesUsed(seasonId: string, userId: string) {
  const count = await db.pick.count({ where: { seasonId, userId, source: "PROXY" } });
  return count;
}

export async function POST(req: Request) {
  try {
    // 1) Find active season
    const season = await db.season.findFirst({ where: { isActive: true }, select: { id: true } });
    if (!season) return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });

    // 2) Find the most recent GW whose deadline is <= now
    const now = new Date();
    const gw = await db.gameweek.findFirst({
      where: { seasonId: season.id, deadline: { lte: now } },
      orderBy: { deadline: "desc" },
      select: { id: true, number: true, deadline: true },
    });
    if (!gw) return NextResponse.json({ ok: false, error: "No past-deadline GW found" }, { status: 404 });

    // 3) Get all alive users
    const users = await db.user.findMany({ where: { alive: true }, select: { id: true } });
    let proxied = 0, eliminated = 0, skipped = 0;

    for (const u of users) {
      // Skip if user already has a pick for this GW
      const existing = await db.pick.findFirst({ where: { seasonId: season.id, gwId: gw.id, userId: u.id }, select: { id: true } });
      if (existing) { skipped++; continue; }

      // Ensure rumble state row exists
      const rs = await db.rumbleState.upsert({
        where: { userId_seasonId: { userId: u.id, seasonId: season.id } },
        update: {},
        create: { userId: u.id, seasonId: season.id, proxiesUsed: 0, lazarusUsed: false },
        select: { proxiesUsed: true, lazarusUsed: true },
      });

      // Double-check count via Pick.source = "PROXY"
      const usedCount = await countProxiesUsed(season.id, u.id);
      const proxiesUsed = Math.max(rs.proxiesUsed ?? 0, usedCount);

      if (proxiesUsed < 2) {
        // Assign proxy pick (first unused club alphabetically)
        const proxyClub = await pickProxyClubForUser(season.id, u.id);
        if (proxyClub) {
          await db.pick.create({
            data: {
              userId: u.id,
              seasonId: season.id,
              gwId: gw.id,
              clubId: proxyClub.id,
              source: "PROXY",
            },
          });
          // Increment proxiesUsed in state (so Dashboard shows correct count)
          await db.rumbleState.update({
            where: { userId_seasonId: { userId: u.id, seasonId: season.id } },
            data: { proxiesUsed: proxiesUsed + 1 },
          });
          proxied++;
          continue;
        }
        // No clubs left → immediate elimination below
      }

      // No proxies remaining OR no clubs left → eliminate immediately
      await db.user.update({ where: { id: u.id }, data: { alive: false } });
      await db.rumbleState.upsert({
        where: { userId_seasonId: { userId: u.id, seasonId: season.id } },
        update: { eliminatedAtGw: gw.number, eliminatedAt: new Date() },
        create: { userId: u.id, seasonId: season.id, eliminatedAtGw: gw.number, eliminatedAt: new Date() },
      });
      eliminated++;
    }

    // For convenience, surface next GW number
    const nextGw = await db.gameweek.findFirst({
      where: { seasonId: season.id, deadline: { gt: gw.deadline } },
      orderBy: { deadline: "asc" },
      select: { number: true },
    });

    return NextResponse.json({
      ok: true,
      sweptGw: gw.number,
      proxied,
      eliminated,
      skipped, // users who already had a pick
      nextGw: nextGw?.number ?? null,
    });
  } catch (err: any) {
    console.error("POST /api/admin/process-deadline failed:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
