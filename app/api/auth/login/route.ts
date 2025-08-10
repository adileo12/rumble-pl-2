import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  const { secretCode } = await req.json();
  if (!secretCode) {
    return NextResponse.json({ ok: false, error: "secretCode is required" }, { status: 400 });
  }
  const user = await db.user.findFirst({ where: { secretCode } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 401 });
  }

  // set your session cookie, or return success
  const res = NextResponse.json({ ok: true, user: { id: user.id, displayName: (user as any).displayName } });
  // res.cookies.set("sid", user.id, { httpOnly: true, sameSite: "lax", maxAge: 60*60*24*30 });
  return res;
}
