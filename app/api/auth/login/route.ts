import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import crypto from "crypto";

const COOKIE_NAME = "session";

export async function POST(req: Request) {
  try {
    const { secretCode } = await req.json();
    if (!secretCode) {
      return NextResponse.json({ ok: false, error: "Missing secret code" }, { status: 400 });
    }
   const user = await db.user.findUnique({
      where: { secretcode: secretCode }, // field is @map("secretcode")
      select: { id: true, displayName: true, isAdmin: true }
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
    await db.session.create({ data: { userId: user.id, token, expiresAt } });

  const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      expires: expiresAt,
    });
    return res;
  } catch (err: any) {
    console.error("LOGIN ERROR", err);
    return NextResponse.json({ ok: false, error: "Login failed" }, { status: 500 });
  }
}
