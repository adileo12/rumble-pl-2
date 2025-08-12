// app/api/auth/admin-login/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();
    const e = String(email).trim().toLowerCase();
    const p = String(password).trim();

    if (!e || !p) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: e },
      // NOTE: Prisma field is displayName (even if DB column is "name" via @map)
      select: { id: true, displayName: true, isAdmin: true, adminPassword: true },
    });

    if (!user || !user.isAdmin || p !== user.adminPassword) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Reuse the same session cookie as normal login so the protected layout/Nav work.
    const res = NextResponse.json({ ok: true, user }, { status: 200 });
    res.cookies.set("sid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: !!process.env.VERCEL,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error("ADMIN LOGIN ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}