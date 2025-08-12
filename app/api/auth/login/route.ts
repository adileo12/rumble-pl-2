// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  try {
    const { secretCode = "" } = await req.json();
    const code = String(secretCode).trim();
    if (!code) {
      return NextResponse.json({ ok: false, error: "Missing secretCode" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { secretCode: code },
      select: { id: true, displayName: true, isAdmin: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid secret code" }, { status: 401 });
    }

    // IMPORTANT: set cookie via headers API (more reliable on Vercel)
    cookies().set("sid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,        // keep true on Vercel (HTTPS); use false only for local http
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}