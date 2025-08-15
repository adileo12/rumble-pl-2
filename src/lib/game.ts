import { db } from './db';

// IST offset helper
export function toIST(date: Date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  // IST is UTC+5:30
  return new Date(utc + 5.5 * 60 * 60 * 1000);
}

export async function getActiveSeason() {
  return db.season.findFirst({ where: { isActive: true } });
}

export async function getCurrentGameweek(seasonId: string) {
  // The current GW is the one with the nearest future deadline, or last one if all past.
  const now = new Date();
  const future = await db.gameweek.findFirst({
    where: { seasonId, deadline: { gte: now } },
    orderBy: { deadline: 'asc' },
  });
  if (future) return future;

  // fallback to latest past gw
  return db.gameweek.findFirst({
    where: { seasonId },
    orderBy: { deadline: 'desc' },
  });
}

// Lock rule: lock at (first kickoff - 30 min)
// We derive first kickoff from fixtures for the gw.
export async function isLockedForGW(seasonId: string, gameweekId: string) {
  const first = await db.fixture.findFirst({
    where: {
      gwId: gameweekId, // field on Fixture
      gw: { seasonId }, // relation to Gameweek → Season
    },
    orderBy: { kickoff: 'asc' },
    select: { kickoff: true },
  });

  if (!first?.kickoff) return false; // no fixtures -> not locked
  const lockAt = new Date(first.kickoff.getTime() - 30 * 60 * 1000);
  return new Date() >= lockAt;
}

export async function clubsYouAlreadyPicked(userId: string, seasonId: string) {
  const rows = await db.pick.findMany({
    where: { userId, seasonId },
    select: { clubId: true },
  });
  return new Set(rows.map((r) => r.clubId));
}
