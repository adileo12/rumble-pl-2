import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Choose first unused club alphabetically by name
async function pickProxyClubForUser(seasonId: string, userId: string) {
  const anyDb = db as any;
  const clubClient = anyDb.club ?? anyDb.Club;
  const pickClient = anyDb.rumblePick ?? anyDb.RumblePick ?? anyDb.pick ?? anyDb.Pick;

  const [clubs, used] = await Promise.all([
    clubClient.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    pickClient.findMany({ where: { seasonId, userId }, select: { clubId: true } }),
  ]);

  const usedIds = new Set(used.map((p: any) => String(p.clubId)));
  const candidate = clubs.find((c: any) => !usedIds.has(String(c.id)));
  return candidate ?? null;
}

async function countProxiesUsed(seasonId: string, userId: string) {
  const anyDb = db as any;
  const pickClient = anyDb.rumblePick ?? anyDb.RumblePick ?? anyDb.pick ?? anyDb.Pick;
  const count = await pickClient.count({
    where: { seasonId, userId, submissionSource: "proxy" },
  });
  return count as number;
}

export async function POST(req: Request) {
  try {
    const anyDb = db as any;
    const gwClient = anyDb.gameweek ?? anyDb.Gameweek;
    const pickClient = anyDb.rumblePick ?? anyDb.RumblePick ?? anyDb.pick ?? anyDb.Pick;
    const elimClient =
      anyDb.rumbleElimination ?? anyDb.RumbleElimination ?? null; // optional if you have it

    const { seasonId } = await req.json();
    if (!seasonId) return NextResponse.json({ ok: false, error: "Missing seasonId" }, { status: 400 });

    // Find the most recent GW whose deadline is <= now and not yet swept
    const now = new Date();

    const gw = await gwClient.findFirst({
      where: { seasonId, deadline: { lte: now } },
      orderBy: { deadline: "desc" },
      select: { gwNumber: true, deadline: true, isActive: true, sweptAt: true },
    });

    if (!gw) return NextResponse.json({ ok: false, error: "No past-deadline GW found" }, { status: 404 });
    if (gw.sweptAt) {
      // Already processed; still ensure the next GW is active.
      const next = await gwClient.findFirst({
        where: { seasonId, deadline: { gt: gw.deadline } },
        orderBy: { deadline: "asc" },
        select: { gwNumber: true },
      });
      if (next) {
        await gwClient.updateMany({
          where: { seasonId },
          data: { isActive: false },
        });
        await gwClient.update({
          where: { seasonId_gwNumber: { seasonId, gwNumber: next.gwNumber } },
          data: { isActive: true },
        });
      }
      return NextResponse.json({ ok: true, info: "Already swept" });
    }

    // Fetch all players in the season (alive or eliminated — we will skip already eliminated if you track it)
    const userClient = anyDb.user ?? anyDb.User;
    const players = await userClient.findMany({
      select: { id: true },
    });

    // For each player, ensure a pick exists, else proxy or eliminate
    for (const u of players) {
      const existing = await pickClient.findFirst({
        where: { seasonId, gwNumber: gw.gwNumber, userId: u.id },
        select: { id: true },
      });

      if (existing) continue;

      const used = await countProxiesUsed(seasonId, u.id);
      if (used < 2) {
        // assign proxy
        const proxyClub = await pickProxyClubForUser(seasonId, u.id);
        if (proxyClub) {
          await pickClient.create({
            data: {
              seasonId,
              gwNumber: gw.gwNumber,
              userId: u.id,
              clubId: proxyClub.id,
              submissionSource: "proxy",
            },
          });
        } else {
          // No clubs left — eliminate immediately
          if (elimClient) {
            await elimClient.upsert({
              where: { seasonId_userId: { seasonId, userId: u.id } },
              update: { reason: "no-club-left", gwNumber: gw.gwNumber, eliminatedAt: new Date() },
              create: { seasonId, userId: u.id, reason: "no-club-left", gwNumber: gw.gwNumber, eliminatedAt: new Date() },
            });
          }
        }
      } else {
        // proxies exhausted — eliminate for missed submission
        if (elimClient) {
          await elimClient.upsert({
            where: { seasonId_userId: { seasonId, userId: u.id } },
            update: { reason: "missed-no-proxy", gwNumber: gw.gwNumber, eliminatedAt: new Date() },
            create: { seasonId, userId: u.id, reason: "missed-no-proxy", gwNumber: gw.gwNumber, eliminatedAt: new Date() },
          });
        }
      }
    }

    // Flip active GW: next upcoming becomes active
    const next = await gwClient.findFirst({
      where: { seasonId, deadline: { gt: gw.deadline } },
      orderBy: { deadline: "asc" },
      select: { gwNumber: true },
    });
    if (next) {
      await gwClient.updateMany({ where: { seasonId }, data: { isActive: false } });
      await gwClient.update({
        where: { seasonId_gwNumber: { seasonId, gwNumber: next.gwNumber } },
        data: { isActive: true },
      });
    }

    // Mark swept
    await gwClient.update({
      where: { seasonId_gwNumber: { seasonId, gwNumber: gw.gwNumber } },
      data: { sweptAt: new Date() },
    });

    return NextResponse.json({ ok: true, sweptGw: gw.gwNumber, nextGw: next?.gwNumber ?? null });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
