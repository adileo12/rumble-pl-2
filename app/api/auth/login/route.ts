// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

function cookieDomainForProd(host?: string | null) {
  const cfg = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  if (process.env.NODE_ENV !== "production") return undefined;
  if (cfg && cfg.trim()) return cfg.trim();
  if (!host) return undefined;
  const h = host.toLowerCase();
  if (h.endsWith(".havengames.org") || h === "havengames.org") return ".havengames.org";
  return undefined;
}

export async function POST(req: Request) {
  try {
    const { code, secret } = await req.json();

    const joinCode = String(code || "").trim();
    const secretCode = String(secret || "").trim();

    if (!joinCode || !secretCode) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // Your schema: User has joinCode and secretCode (both unique in practice)
    const user = await db.user.findFirst({
      where: { joinCode, secretCode },
      select: { id: true, name: true, email: true, isAdmin: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid code or secret" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, user });

    const host = req.headers.get("host");
    res.cookies.set({
      name: "sid",
      value: String(user.id),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      domain: cookieDomainForProd(host),
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
