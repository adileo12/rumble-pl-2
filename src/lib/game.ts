import { db } from "@/src/lib/db";

// IST offset helper
export function toIST(date: Date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  // IST is UTC+5:30
  return new Date(utc + 5.5 * 60 * 60 * 1000);
}

export async function getActiveSeason() {
  return db.season.findFirstOrThrow({ where: { isActive: true } });
}

export async function getCurrentGameweek(seasonId: string) {
  // The current GW is the one with the nearest future deadline, or last one if all past.
  return db.gameweek.findFirstOrThrow({
    where: { seasonId, isActive: true }, // adjust if you mark with dates instead
    orderBy: { number: "asc" },
  });
}


export async function getGwDeadlineMinusMinutes(
  gameweekId: string,
  minutes = 30
) {
  // Deadline = first kickoff of the GW minus X minutes
  const first = await db.fixture.findFirst({
    where: { gwId },
    orderBy: { kickoff: "asc" },
    select: { kickoff: true },
  });
  if (!first?.kickoff) return null;
  return new Date(first.kickoff.getTime() - minutes * 60_000);
}


// Lock rule: lock at (first kickoff - 30 min)
// We derive first kickoff from fixtures for the gw.
export async function isLockedForGW(gameweekId: string) {
  const deadline = await getGwDeadlineMinusMinutes(gwId, 30);
  return deadline ? new Date() >= deadline : false;
}

export async function clubsYouAlreadyPicked(userId: string, seasonId: string) {
  const rows = await db.pick.findMany({
    where: { userId, seasonId },
    select: { clubId: true },
  });
  return new Set(rows.map((r) => r.clubId));
}
