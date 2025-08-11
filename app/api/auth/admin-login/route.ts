import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import crypto from "crypto";

const COOKIE_NAME = "session";

export async function POST(req: Request) {
  try {
    const { email, lastName } = await req.json();
    if (!email || !lastName) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const admin = await db.user.findFirst({
      where: { email, lastName, isAdmin: true },
      select: { id: true }
    });
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000*60*60*24*30);
    await db.session.create({ data: { userId: admin.id, token, expiresAt } });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true, sameSite: "lax", secure: true, path: "/", expires: expiresAt,
    });
    return res;
  } catch (err) {
    console.error("ADMIN LOGIN ERROR", err);
    return NextResponse.json({ ok: false, error: "Admin login failed" }, { status: 500 });
  }
}
