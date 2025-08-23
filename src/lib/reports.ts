// src/lib/reports.ts
import assert from "node:assert";
import { db } from "@/src/lib/db";

type GWKey = { seasonId: string; gwNumber: number };

// --- helpers ---------------------------------------------------------------

async function getGW({ seasonId, gwNumber }: GWKey) {
  const gw = await db.gameweek.findUnique({
    where: { seasonId_number: { seasonId, number: gwNumber } },
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
  // Only produce eliminated list when grading has completed
  assert(gw.graded === true, "Gameweek not graded yet");
}

// --- A) Picks by club ------------------------------------------------------

export async function fetchClubCounts({ seasonId, gwNumber }: GWKey) {
  const gw = await getGW({ seasonId, gwNumber });

  const rows = await db.pick.groupBy({
    by: ["clubId"],
    where: { seasonId, gwId: gw.id },
    _count: { clubId: true },
  });

  if (rows.length === 0) return [];

  const clubs = await db.club.findMany({
    where: { id: { in: rows.map((r) => r.clubId) } },
    // 🔧 your schema field is `shortName` (not `short`)
    select: { id: true, name: true, shortName: true },
  });

  const meta = new Map(clubs.map((c) => [c.id, c]));

  return rows
    .map((r) => {
      const c = meta.get(r.clubId);
      const label = c?.shortName ?? c?.name ?? r.clubId;
      return { label, value: r._count.clubId };
    })
    .sort((a, b) => b.value - a.value);
}

// --- B) Manual vs Proxy (source) ------------------------------------------

export async function fetchSourceCounts({ seasonId, gwNumber }: GWKey) {
  const gw = await getGW({ seasonId, gwNumber });

  const rows = await db.pick.groupBy({
    by: ["source"], // "USER" | "PROXY"
    where: { seasonId, gwId: gw.id },
    _count: { source: true },
  });

  const map: Record<string, number> = {};
  for (const r of rows) {
    const key = (r.source || "").toUpperCase();
    map[key] = r._count.source;
  }

  return [
    { label: "Manual", value: map["USER"] ?? 0 },
    { label: "Proxy", value: map["PROXY"] ?? 0 },
  ];
}

// --- C) Eliminated names ---------------------------------------------------

export async function fetchEliminatedNames({ seasonId, gwNumber }: GWKey) {
  // Pull eliminated userIds from RumbleState
  const states = await db.rumbleState.findMany({
    where: { seasonId, eliminatedAtGw: gwNumber },
    select: { userId: true },
    orderBy: { userId: "asc" },
  });
  const userIds = states.map((s) => s.userId);
  if (userIds.length === 0) return [];

  // Fetch names/emails for the eliminated users
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const meta = new Map(users.map((u) => [u.id, u]));

  // Prefer name; fallback to email prefix; else "Unknown"
  return userIds.map((id) => {
    const u = meta.get(id);
    const emailPrefix = u?.email ? u.email.split("@")[0] : "";
    return u?.name?.trim() || emailPrefix || "Unknown";
  });
}
