// src/lib/auth.ts
import { cookies } from "next/headers";

type CookieOpts = {
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  path?: string;
  domain?: string;
  maxAge?: number; // seconds
};

function cookieDomainFor(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  const h = host.split(":")[0].toLowerCase();
  if (h === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return undefined;
  const parts = h.split(".");
  if (parts.length < 2) return undefined;
  return "." + parts.slice(-2).join(".");
}

export function sessionCookieOptionsForHost(host: string | null | undefined): CookieOpts {
  const domain = cookieDomainFor(host);
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    ...(domain ? { domain } : {}),
    maxAge: 60 * 60 * 24 * 60, // ~60 days
  };
}

export async function getUserIdFromCookies(): Promise<string | null> {
  const jar = cookies();
  // Support both keys to be backward-compatible
  const sid = jar.get("sid")?.value || jar.get("session")?.value;
  return sid ? String(sid) : null;
}

export function setSessionCookies(userId: string, host: string | null | undefined) {
  const jar = cookies();
  const opts = sessionCookieOptionsForHost(host);
  jar.set("sid", String(userId), opts as any);
  jar.set("session", String(userId), opts as any);
}

export function clearSessionCookies(host: string | null | undefined) {
  const jar = cookies();
  const base = sessionCookieOptionsForHost(host);
  const killer = { ...base, maxAge: 0 };
  jar.set("sid", "", killer as any);
  jar.set("session", "", killer as any);
}
