import { prisma } from '@/lib/db'; // your prisma helper
import assert from 'node:assert';

type GWKey = { seasonId: string; gwNumber: number };

export async function ensureGWReadyForAB({ seasonId, gwNumber }: GWKey) {
  const gw = await prisma.gameweek.findUnique({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
    select: { deadline: true, status: true },
  });
  assert(gw, 'Gameweek not found');
  assert(gw.deadline <= new Date(), 'Deadline has not passed');
}

export async function ensureGWReadyForC({ seasonId, gwNumber }: GWKey) {
  const gw = await prisma.gameweek.findUnique({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
    select: { status: true },
  });
  assert(gw, 'Gameweek not found');
  assert(gw.status === 'COMPLETE', 'Gameweek results not complete/locked');
}

export async function fetchClubCounts({ seasonId, gwNumber }: GWKey) {
  const rows = await prisma.rumblePick.groupBy({
    by: ['clubId'],
    where: { seasonId, gwNumber },
    _count: { clubId: true },
  });
  assert(rows.length > 0, 'No picks for this GW');
  // join with club names
  const clubs = await prisma.club.findMany({
    where: { id: { in: rows.map(r => r.clubId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(clubs.map(c => [c.id, c.name]));
  return rows.map(r => ({ label: nameById.get(r.clubId) ?? r.clubId, value: r._count.clubId }));
}

export async function fetchSourceCounts({ seasonId, gwNumber }: GWKey) {
  const rows = await prisma.rumblePick.groupBy({
    by: ['submissionSource'],
    where: { seasonId, gwNumber },
    _count: { submissionSource: true },
  });
  assert(rows.length > 0, 'No picks for this GW');
  const map: Record<string, number> = {};
  for (const r of rows) map[r.submissionSource ?? 'unknown'] = r._count.submissionSource;
  return [
    { label: 'Manual', value: map['manual'] ?? 0 },
    { label: 'Proxy', value: map['proxy'] ?? 0 },
  ];
}

export async function fetchEliminatedNames({ seasonId, gwNumber }: GWKey) {
  // If eliminations are on a table named differently, adapt here:
  const rows = await prisma.rumbleElimination.findMany({
    where: { seasonId, gwNumber, eliminated: true },
    select: { user: { select: { displayName: true, username: true } } },
  });
  return rows.map(r => r.user.displayName ?? r.user.username);
}
