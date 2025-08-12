// app/api/auth/admin-login/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db"; // ← THIS import was missing

export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();

    // normalize email
    const e = String(email).trim().toLowerCase();

    const user = await db.user.findUnique({
      where: { email: e },
      // Your DB column is "name" (not displayName)
      select: { id: true, name: true, isAdmin: true, adminPassword: true },
    });

    // must exist, be admin, and password must match adminPassword stored in DB
    if (!user || !user.isAdmin || !password || password !== (user.adminPassword ?? "")) {
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    // set same session cookie used for normal users
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, isAdmin: true },
    });

    res.cookies.set("sid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: !!process.env.VERCEL, // true on Vercel
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err) {
    console.error("ADMIN LOGIN ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}