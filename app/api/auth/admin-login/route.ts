import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();
    const user = await db.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      select : { id: true, displayName: true, isAdmin: true, adminPassword: true},
    });
    
    if (!user || !user.isAdmin || !password || password !== user.adminPassword) {
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    const admin = await db.user.findFirst({
      where: { email, lastName, isAdmin: true },
      select: { id: true }
    });
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, user: { id: user.id, displayName, isAdmin: true }});
    res.cookies.set("sid", user.id, {
      httpOnly: true, sameSite: "lax", secure: !!process.env.Vercel, path: "/", maxAge: 60*60*24*30,
    });
    return res;
  } catch (e) {
    console.error("ADMIN LOGIN ERROR", err);
    return NextResponse.json({ ok: false, error: "Server Error" }, { status: 500 });
  }
}
