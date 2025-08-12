import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();
    const e = String(email).trim().toLowerCase();

    const user = await db.user.findUnique({
      where: { email: e },
      // NOTE: Prisma field is displayName (mapped to DB column "name")
      // and adminPassword (mapped to "admin_password" if you set @map).
      select: { id: true, displayName: true, isAdmin: true, adminPassword: true },
    });

    if (!user || !user.isAdmin || password !== (user.adminPassword ?? "")) {
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.displayName, isAdmin: true },
    });

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