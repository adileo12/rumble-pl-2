import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/src/lib/session-cookie";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const opts = sessionCookieOptions();
  // clear both legacy and current cookies if present
 cookies().set("session", "", {
    ...opts,
    maxAge: 0,
    expires: new Date(0),
  });

  return NextResponse.json({ ok: true });
}
