// src/lib/reports.ts — schema-aligned helpers for reports
import assert from "node:assert";
import { db } from "@/src/lib/db";

type GWKey = { seasonId: string; gwNumber: number };

async function getGW({ seasonId, gwNumber }: GWKey) {
  const gw = await db.gameweek.findFirst({
    where: { seasonId, number: gwNumber },
    select: { id: true, number: true, deadline: true, graded: true },
  });
  assert(gw, "Gameweek not found");
  return gw;
}

export async function ensureGWReadyForAB(key: GWKey) {
  const gw = await getGW(key);
  assert(gw.deadline <= new Date(), "Deadline has not passed");
}

export async function ensureGWReadyForC(key: GWKey) {
  const gw = await getGW(key);
  // C requires results processed (graded) so that eliminations are final
  assert(gw.graded === true, "Gameweek not graded yet");
}

export async function fetchClubCounts({ seasonId, gwNumber }: GWKey) {
  const gw = await getGW({ seasonId, gwNumber });
  const rows = await db.pick.groupBy({
    by: ["clubId"],
    where: { seasonId, gwId: gw.id },
    _count: { clubId: true },
  });

  // fetch club short/name in one go
  const clubs = await db.club.findMany({
    where: { id: { in: rows.map(r => r.clubId) } },
    select: { id: true, name: true, short: true },
  });
  const meta = new Map(clubs.map(c => [c.id, c]));
  return rows
    .map(r => ({
      label: meta.get(r.clubId)?.short ?? meta.get(r.clubId)?.name ?? r.clubId,
      value: r._count.clubId,
    }))
    .sort((a, b) => b.value - a.value);
}

export async function fetchSourceCounts({ seasonId, gwNumber }: GWKey) {
  const gw = await getGW({ seasonId, gwNumber });
  const rows = await db.pick.groupBy({
    by: ["source"],
    where: { seasonId, gwId: gw.id },
    _count: { source: true },
  });

  const map: Record<string, number> = {};
  for (const r of rows) map[r.source ?? "unknown"] = r._count.source;

  // Project to UI labels
  return [
    { label: "Manual", value: map["USER"] ?? 0 },
    { label: "Proxy", value: map["PROXY"] ?? 0 },
  ];
}

export async function fetchEliminatedNames({ seasonId, gwNumber }: GWKey) {
  // Eliminations are recorded on RumbleState with eliminatedAtGw === gwNumber
  const states = await db.rumbleState.findMany({
    where: { seasonId, eliminatedAtGw: gwNumber },
    select: {
      user: { select: { displayName: true, username: true, name: true } },
    },
  });
  return states.map((s) => s.user.displayName ?? s.user.name ?? s.user.username);
}
