import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // clear both legacy and current cookies if present
  res.cookies.set("sid", "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: true });
  res.cookies.set("session", "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: true });
  return res;
}
