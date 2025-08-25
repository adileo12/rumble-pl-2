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
      select: { id: true, name: true, isAdmin: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 401 });
    }

    // ⬇️ Make cookie valid for both apex + www only in production
    const host = req.headers.get("host") || "";
    const cookieOptions: Parameters<typeof cookies.set>[2] = {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      ...(host.endsWith("havengames.org") ? { domain: ".havengames.org" } : {}),
    };

    cookies().set("sid", user.id, cookieOptions);

    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
