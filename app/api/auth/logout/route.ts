import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  const host = new URL(req.url).host || "";

  const base = { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 0, expires: new Date(0) };
  const withDomain = host.endsWith("havengames.org") ? { ...base, domain: ".havengames.org" } : base;

  // clear both legacy and current cookies if present
  res.cookies().set("sid", "", { ...sessionCookieOptions(), maxAge: 0, expires: new Date(0) });;
  res.cookies.set("session", "", withDomain);
  return res;
}
