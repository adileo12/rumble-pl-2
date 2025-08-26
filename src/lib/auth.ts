// src/lib/auth.ts
import { cookies } from "next/headers";

// Read user id from either cookie name ("session" preferred; "sid" supported)
export function getUserIdFromCookies(): number | null {
  const jar = cookies();
  const raw =
    jar.get("session")?.value ??
    jar.get("sid")?.value ??
    null;

  if (!raw) return null;

  // Most flows store plain numeric userId.
  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && asNum > 0) return asNum;

  // If you ever move to a token, add token verification here.
  return null;
}

// Build cookie options so prod uses your apex domain and previews don’t.
export function sessionCookieOptionsForHost(host?: string) {
  const onProd = !!host && host.endsWith("havengames.org");
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    // Only pin the domain in production so previews work on *.vercel.app
    ...(onProd ? { domain: ".havengames.org" } : {}),
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}
