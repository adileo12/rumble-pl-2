// app/api/auth/admin-login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";
import { sessionCookieOptionsForHost } from "@/src/lib/auth";

function cookieDomainForProd(host?: string | null) {
  // Use env for consistency (set on Vercel -> .env): .havengames.org
  const cfg = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  if (process.env.NODE_ENV !== "production") return undefined;
  if (cfg && cfg.trim()) return cfg.trim();
  // fallback: infer from host header (apex or www)
  if (!host) return undefined;
  const h = host.toLowerCase();
  if (h.endsWith(".havengames.org") || h === "havengames.org") return ".havengames.org";
  return undefined;
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const opts = sessionCookieOptionsForHost(req.headers.get("host") || "");
    const e = String(email || "").trim().toLowerCase()
    const p = String(password || "");

    cookies().set("session", String(admin.id), opts);
cookies().set("sid", String(admin.id), opts);

    if (!e || !p) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // Your schema: User with isAdmin/email/adminPasswordHash
    const user = await db.user.findUnique({
      where: { email: e },
      select: { id: true, email: true, isAdmin: true, adminPasswordHash: true, adminPassword: true },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Prefer the hash; fall back to plain (if present) for legacy data only.
    let isValid = false;
    if (user.adminPasswordHash) {
      isValid = await bcrypt.compare(p, user.adminPasswordHash);
    } else if (user.adminPassword) {
      isValid = p === user.adminPassword;
    }

    if (!isValid) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Set the session cookie on the response
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, isAdmin: true } });

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
    console.error("admin-login error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
