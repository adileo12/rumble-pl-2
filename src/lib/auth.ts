// src/lib/auth.ts
import { cookies } from "next/headers";

// Read user id from either cookie name ("session" preferred; "sid" supported)
export function getUserIdFromCookies(): number | null {
  const jar = cookies();
  // Accept both names so login/admin-login can set either
  const names = ["sid", "session"];

  for (const name of names) {
    const raw = jar.get(name)?.value;
    if (!raw) continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

// Build cookie options so prod uses your apex domain and previews don’t.
export function sessionCookieOptionsForHost(host: string | null | undefined) {
  const isProd = (host ?? "").endsWith("havengames.org");
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    // 6 months
    maxAge: 60 * 60 * 24 * 180,
    ...(isProd ? { domain: ".havengames.org" } : {}),
  };
}
