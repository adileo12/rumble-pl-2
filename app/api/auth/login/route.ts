// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const secretCode = (body?.secretCode || "").trim();

    if (!secretCode) {
      return NextResponse.json(
        { ok: false, error: "Missing secretCode" },
        { status: 400 }
      );
    }

    // secretCode must be @unique in your Prisma schema
    const user = await db.user.findUnique({
      where: { secretCode }, // <-- be sure the Prisma field is `secretCode`
      select: { id: true, displayName: true, isAdmin: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid secret code" },
        { status: 401 }
      );
    }

    // simple cookie-based session (no DB write)
    const res = NextResponse.json({ ok: true, user }, { status: 200 });
    res.cookies.set("sid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  } catch (err: any) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}