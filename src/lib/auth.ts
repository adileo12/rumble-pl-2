// src/lib/auth.ts
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

/**
 * Returns the authenticated userId from cookies, or null if not logged in.
 * Accepts either "sid" or "rumble_session".
 * Sync version (no DB lookup) – works if the cookie stores userId directly.
 */
export async function getUserIdFromCookies(): Promise<string | null> {
  const jar = cookies();
  const sid = jar.get("sid")?.value ?? jar.get("rumble_session")?.value ?? null;
  if (!sid) return null;
  const session = await db.session.findUnique({
    where: { id: sid },
    select: { userId: true },
  });
  return session?.userId ?? null;
}
