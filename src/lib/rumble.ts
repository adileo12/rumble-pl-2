// src/lib/rumble.ts
import { db } from "@/src/lib/db";

export function computeDeadline(kickoffs: (Date | null)[]) {
  const ks = kickoffs.filter((d): d is Date => d instanceof Date);
  if (!ks.length) return { deadline: null as Date | null };
  const first = new Date(Math.min(...ks.map((d) => d.getTime())));
  return { deadline: new Date(first.getTime() - 30 * 60 * 1000) };
}

type GWShape = {
  id: string;
  number: number;
  deadline: Date | null;
  start?: Date | null;
  end?: Date | null;
  isLocked?: boolean;
};

export async function getCurrentSeasonAndGW(): Promise<{
  season: { id: string; name?: string; year?: number } | null;
  gw: GWShape | null;
}> {
  const season = await db.season.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, year: true },
  });
  if (!season) return { season: null, gw: null };

  const now = new Date();

  // 1) Try by Gameweek.deadline if present
  let gw =
    (await db.gameweek.findFirst({
      where: { seasonId: season.id, deadline: { gte: now } },
      orderBy: { deadline: "asc" },
      select: { id: true, number: true, deadline: true, start: true, end: true, isLocked: true },
    })) ?? null;

  // 2) Fallback: earliest future FIXTURE's GW
  if (!gw) {
    const fx = await db.fixture.findFirst({
      where: { gw: { seasonId: season.id }, kickoff: { gt: now } },
      orderBy: { kickoff: "asc" },
      select: {
        gw: { select: { id: true, number: true, deadline: true, start: true, end: true, isLocked: true } },
      },
    });
    if (fx?.gw) gw = fx.gw as any;
  }

  // 3) Fallback: most recent past FIXTURE's GW
  if (!gw) {
    const fx = await db.fixture.findFirst({
      where: { gw: { seasonId: season.id }, kickoff: { lt: now } },
      orderBy: { kickoff: "desc" },
      select: {
        gw: { select: { id: true, number: true, deadline: true, start: true, end: true, isLocked: true } },
      },
    });
    if (fx?.gw) gw = fx.gw as any;
  }

  return { season, gw };
}
