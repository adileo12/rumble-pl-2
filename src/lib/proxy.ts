import { db } from "@/src/lib/db";

// Count proxies used by user in a season
export async function proxiesUsedThisSeason(userId: string, seasonId: string): Promise<number> {
  return db.pick.count({
    where: { userId, seasonId, source: "PROXY" },
  });
}

// All clubIds the user has used this season (any source)
export async function clubsUsedThisSeason(userId: string, seasonId: string): Promise<Set<string>> {
  const rows = await db.pick.findMany({
    where: { userId, seasonId },
    select: { clubId: true },
  });
  return new Set(rows.map(r => r.clubId));
}

// Return first alphabetical clubId that plays in gwId and is not used yet
export async function pickProxyClubForUserAlpha(params: { seasonId: string; userId: string; gwId: string }): Promise<string | null> {
  const { seasonId, userId, gwId } = params;

  const used = await clubsUsedThisSeason(userId, seasonId);

  // Clubs that play in this GW (distinct)
  const fixtures = await db.fixture.findMany({
    where: { gwId },
    select: { homeClubId: true, awayClubId: true },
  });
  const candidatesSet = new Set<string>();
  for (const f of fixtures) {
    if (f.homeClubId) candidatesSet.add(f.homeClubId);
    if (f.awayClubId) candidatesSet.add(f.awayClubId);
  }
  if (candidatesSet.size === 0) return null;

  // Load candidate club records and sort alphabetically by name
  const candidates = await db.club.findMany({
    where: { id: { in: [...candidatesSet] }, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // First alphabetical not used yet
  const pick = candidates.find(c => !used.has(c.id));
  return pick?.id ?? null;
}
