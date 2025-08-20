// src/lib/auth.ts
import { cookies } from "next/headers";

/**
 * Returns the authenticated userId from cookies, or null if not logged in.
 * Accepts either "sid" or "rumble_session".
 * Sync version (no DB lookup) – works if the cookie stores userId directly.
 */
export function getUserIdFromCookies(): string | null {
  const jar = cookies();
  return jar.get("sid")?.value ?? jar.get("rumble_session")?.value ?? null;
}
