import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

function mask(s?: string | null) {
  if (!s) return "<null>";
  if (s.length <= 2) return "*".repeat(s.length);
  return s[0] + "*".repeat(Math.max(0, s.length - 2)) + s[s.length - 1];
}

async function readCredentials(req: Request) {
  const ct = req.headers.get("content-type") || "";
  let email = "";
  let password = "";

  try {
    if (ct.includes("application/json")) {
      const b = await req.json();
      email = String(b?.email || "").trim().toLowerCase();
      password = String(b?.password || "").trim();
      return { email, password, source: "json" as const, ct };
    }

    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      email = String(fd.get("email") || "").trim().toLowerCase();
      password = String(fd.get("password") || "").trim();
      return { email, password, source: "form" as const, ct };
    }

    // Fallback: try JSON anyway
    const b = await req.json().catch(() => ({}));
    email = String(b?.email || "").trim().toLowerCase();
    password = String(b?.password || "").trim();
    return { email, password, source: "fallback-json" as const, ct };
  } catch {
    return { email: "", password: "", source: "parse-error" as const, ct };
  }
}

export async function POST(req: Request) {
  try {
    const { email, password, source, ct } = await readCredentials(req);
    console.log("[ADMIN-LOGIN] headers.ct:", ct, "source:", source, "email:", email, "pwLen:", password.length);

    if (!email || !password) {
      return NextResponse.json({ ok: false, reason: "missing-fields", debug: { ct, source } }, { status: 400 });
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