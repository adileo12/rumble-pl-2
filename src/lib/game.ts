// src/lib/game.ts
import { db } from "@/src/lib/db";

/** Active season (throws if none) */
export async function getActiveSeason() {
  return db.season.findFirstOrThrow({ where: { isActive: true } });
}

/**
 * Current gameweek for a season, computed from fixtures:
 * - If there’s an upcoming fixture, pick the GW of the earliest upcoming kickoff.
 * - Else, pick the GW of the latest (most recent) kickoff.
 * - Final fallback: highest-numbered GW in the season.
 */
export async function getCurrentGameweek(seasonId: string) {
  const gws = await db.gameweek.findMany({
    where: { seasonId },
    select: { id: true, number: true },
  });
  if (gws.length === 0) throw new Error("No gameweeks found for season");

  const gwIds = gws.map((g) => g.id);
  const now = new Date();

  const upcoming = await db.fixture.findFirst({
    where: { gwId: { in: gwIds }, kickoff: { gte: now } },
    orderBy: { kickoff: "asc" },
    select: { gwId: true },
  });
  if (upcoming?.gwId) {
    return db.gameweek.findUniqueOrThrow({ where: { id: upcoming.gwId } });
  }

  const latest = await db.fixture.findFirst({
    where: { gwId: { in: gwIds } },
    orderBy: { kickoff: "desc" },
    select: { gwId: true },
  });
  if (latest?.gwId) {
    return db.gameweek.findUniqueOrThrow({ where: { id: latest.gwId } });
  }

  // No fixtures? fallback to highest-numbered GW
  const max = gws.reduce((a, b) => (a.number > b.number ? a : b));
  return db.gameweek.findUniqueOrThrow({ where: { id: max.id } });
}

/** First kickoff minus N minutes = deadline */
export async function getGwDeadlineMinusMinutes(gwId: string, minutes = 30) {
  const first = await db.fixture.findFirst({
    where: { gwId },
    orderBy: { kickoff: "asc" },
    select: { kickoff: true },
  });
  if (!first?.kickoff) return null;
  return new Date(first.kickoff.getTime() - minutes * 60_000);
}

/** True if now is past the GW deadline */
export async function isLockedForGW(gwId: string) {
  const deadline = await getGwDeadlineMinusMinutes(gwId, 30);
  return deadline ? new Date() >= deadline : false;
}

/** Set of clubs the user has already used this season */
export async function clubsYouAlreadyPicked(userId: string, seasonId: string) {
  const rows = await db.pick.findMany({
    where: { userId, seasonId },
    select: { clubId: true },
  });
  return new Set(rows.map((r) => r.clubId));
}

/** Format a date/time in IST (Asia/Kolkata). */
export function toIST(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = {}
): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...opts,
  }).format(d);
}

