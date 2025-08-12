import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

function mask(s?: string | null) {
  if (!s) return "<null>";
  if (s.length <= 2) return "*".repeat(s.length);
  return s[0] + "*".repeat(Math.max(0, s.length - 2)) + s[s.length - 1];
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "").trim();

    console.log("[ADMIN-LOGIN] req", { email, pwLen: password.length });

    if (!email || !password) {
      return NextResponse.json({ ok: false, reason: "missing-fields" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, displayName: true, isAdmin: true, adminPassword: true, email: true },
    });

    if (!user) {
      console.log("[ADMIN-LOGIN] user-not-found", { email });
      return NextResponse.json({ ok: false, reason: "user-not-found" }, { status: 401 });
    }

    if (!user.isAdmin) {
      console.log("[ADMIN-LOGIN] not-admin", { id: user.id, email: user.email });
      return NextResponse.json({ ok: false, reason: "not-admin" }, { status: 401 });
    }

    const stored = user.adminPassword ?? "";
    const match = stored === password;

    console.log("[ADMIN-LOGIN] found", {
      id: user.id,
      isAdmin: user.isAdmin,
      storedMasked: mask(stored),
      storedLen: stored.length,
      pwLen: password.length,
      match,
    });

    if (!match) {
      return NextResponse.json({ ok: false, reason: "bad-password" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.displayName, isAdmin: true } });
    res.cookies.set("sid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: !!process.env.VERCEL,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error("[ADMIN-LOGIN] error", err);
    return NextResponse.json({ ok: false, reason: "server-error" }, { status: 500 });
  }
}