// src/lib/rumble.ts
import { db } from "@/src/lib/db";

export function toIST(d: Date) {
  // Only for display; stores remain UTC
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

export function computeDeadline(kickoffs: Date[]): { deadline: Date | null } {
  if (!kickoffs.length) return { deadline: null };
  const first = new Date(Math.min(...kickoffs.map(k => k.getTime())));
  const deadline = new Date(first.getTime() - 30 * 60 * 1000); // -30m
  return { deadline };
}

type FormLetter = "W" | "D" | "L";
export async function last5Form(clubId: string, until: Date): Promise<FormLetter[]> {
  // Look back at completed fixtures (assumes status 'FINISHED' or goals present)
  const fixtures = await db.fixture.findMany({
    where: {
      OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
      kickoff: { lt: until },
      // If you have a status enum/string marking completed, add it here
    },
    orderBy: { kickoff: "desc" },
    take: 5,
    select: { homeClubId: true, awayClubId: true, homeGoals: true, awayGoals: true },
  });

  return fixtures.map(f => {
    if (f.homeGoals == null || f.awayGoals == null) return "D"; // fallback if not graded
    const isHome = f.homeClubId === clubId;
    const gf = isHome ? f.homeGoals : f.awayGoals;
    const ga = isHome ? f.awayGoals : f.homeGoals;
    if (gf > ga) return "W";
    if (gf < ga) return "L";
    return "D";
  }).reverse(); // oldest → newest for display, or remove .reverse() if you prefer newest-left
}

export async function getCurrentSeasonAndGW() {
  const season = await db.season.findFirst({
    where: { isActive: true },
    orderBy: { year: "desc" },
    select: { id: true, name: true, year: true },
  });
  if (!season) return { season: null, gw: null };

  const now = new Date();
  // Prefer an open GW; else the next one with fixtures
  let gw = await db.gameweek.findFirst({
    where: { seasonId: season.id, start: { lte: now }, end: { gte: now } },
    orderBy: { number: "asc" },
    select: { id: true, number: true, start: true, end: true, isLocked: true, deadline: true },
  });
  if (!gw) {
    gw = await db.gameweek.findFirst({
      where: { seasonId: season.id, start: { gt: now } },
      orderBy: { number: "asc" },
      select: { id: true, number: true, start: true, end: true, isLocked: true, deadline: true },
    });
  }
  return { season, gw };
}
