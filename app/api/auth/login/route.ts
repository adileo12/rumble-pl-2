import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    // Make cookie work for both apex + www only in production
    const host = req.headers.get("host") || "";
    const cookieOptions: ResponseCookie = {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      ...(host.endsWith("havengames.org") ? { domain: ".havengames.org" } : {}),
    };

    cookies().set("sid", String(user.id), cookieOptions);

    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (err) {
    console.error("[login] ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
