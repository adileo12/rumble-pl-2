import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();

    const e = String(email).trim().toLowerCase();
    const p = String(password).trim();

    if (!e || !p) {
      return NextResponse.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    // Your schema uses: User { email, name, isAdmin, adminPassword }
    const user = await db.user.findUnique({
      where: { email: e },
      select: { id: true, name: true, isAdmin: true, adminPassword: true },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.adminPassword || p !== user.adminPassword) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Same cookie name as normal login ("sid" → user.id)
    const res = NextResponse.json(
      { ok: true, user: { id: user.id, displayName: user.name, isAdmin: user.isAdmin } },
      { status: 200 }
    );

    // secure = true on Vercel (HTTPS), false locally if needed
    const secure = process.env.VERCEL ? true : false;

    res.cookies.set("sid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err: any) {
    console.error("ADMIN LOGIN ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}