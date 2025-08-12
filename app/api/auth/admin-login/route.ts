import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();

    const user = await db.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      select: { id: true, displayName: true, isAdmin: true, adminPassword: true },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }
    if (!password || password !== (user.adminPassword ?? "")) {
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, user: { id: user.id, displayName: user.displayName, isAdmin: true } });
    res.cookies.set("sid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: !!process.env.VERCEL,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  } catch (e) {
    console.error("ADMIN LOGIN ERROR:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}