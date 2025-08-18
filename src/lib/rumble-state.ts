// src/lib/rumble-state.ts
import { db } from "@/src/lib/db";

export async function getOrCreateState(userId: string, seasonId: string) {
  const existing = await db.rumbleState.findUnique({
    where: { userId_seasonId: { userId, seasonId } },
  }).catch(() => null);

  if (existing) return existing;

  return db.rumbleState.create({
    data: { userId, seasonId },
  });
}

export async function isEliminated(userId: string, seasonId: string) {
  const st = await db.rumbleState.findUnique({
    where: { userId_seasonId: { userId, seasonId } },
    select: { eliminatedAtGw: true },
  });
  return !!st?.eliminatedAtGw;
}
