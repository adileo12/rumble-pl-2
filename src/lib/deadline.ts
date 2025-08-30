// src/lib/deadline.ts
import { db } from "@/src/lib/db";

/** Subtract N minutes from a Date safely. */
function minusMinutes(dt: Date, minutes: number) {
  return new Date(dt.getTime() - minutes * 60_000);
}

/** Compute T-30 from the earliest kickoff among given fixtures. */
export function computeFixtureBasedDeadline(kickoffs: (Date | null)[]): Date | null {
  const ks = kickoffs.filter(Boolean) as Date[];
  if (!ks.length) return null;
  const earliest = new Date(Math.min(...ks.map((d) => d.getTime())));
  return minusMinutes(earliest, 30);
}

/**
 * Unified / effective deadline for a GW:
 * - If Gameweek.deadline is set, use it.
 * - Else compute from fixtures (earliest kickoff - 30m).
 */
export async function effectiveDeadline(gwId: string): Promise<Date | null> {
  const gw = await db.gameweek.findUnique({
    where: { id: gwId },
    select: { deadline: true },
  });
  if (gw?.deadline) return gw.deadline;

  const fixtures = await db.fixture.findMany({
    where: { gwId },
    select: { kickoff: true }, // <- your schema uses `kickoff`
  });
  return computeFixtureBasedDeadline(fixtures.map((f) => f.kickoff));
}

/**
 * Given a season, find the GW with the soonest future effective deadline.
 * If none are in the future, returns { gw: null, deadline: null }.
 */
export async function nextGwByEffectiveDeadline(seasonId: string): Promise<{
  gw: { id: string; number: number; seasonId: string } | null;
  deadline: Date | null;
}> {
  const gws = await db.gameweek.findMany({
    where: { seasonId },
    select: { id: true, number: true, seasonId: true, deadline: true },
    orderBy: [{ number: "asc" }],
    take: 50,
  });

  const now = Date.now();
  let best: { gw: { id: string; number: number; seasonId: string }; deadline: Date } | null = null;

  for (const gw of gws) {
    // Explicit union so we can assign a possibly-null computed deadline later.
    let eff: Date | null = (gw as { deadline: Date | null }).deadline ?? null;

    if (!eff) {
      const fixtures = await db.fixture.findMany({
        where: { gwId: gw.id },
        select: { kickoff: true },
        take: 100,
      });
      const computed = computeFixtureBasedDeadline(fixtures.map((f) => f.kickoff));
      eff = computed; // eff is Date | null, so this is safe
    }

    if (!eff) continue;
    if (eff.getTime() <= now) continue;

    if (!best || eff < best.deadline) {
      best = { gw: { id: gw.id, number: gw.number, seasonId: gw.seasonId }, deadline: eff };
    }
  }

  return best ?? { gw: null, deadline: null };
}
