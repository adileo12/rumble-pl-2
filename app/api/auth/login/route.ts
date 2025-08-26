// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Read "code" from JSON or form-data so either kind of client works.
 * Accepts keys: code | secret | token (all common variants).
 */
async function readSecretCode(req: NextRequest) {
  let code = "";

  // Try JSON first
  try {
    if ((req.headers.get("content-type") || "").includes("application/json")) {
      const j = await req.json();
      code = j?.code ?? j?.secret ?? j?.token ?? "";
    }
  } catch {
    /* ignore */
  }

  // Fallback to form-data / urlencoded
  if (!code) {
    try {
      const fd = await req.formData();
      code = (fd.get("code") ?? fd.get("secret") ?? fd.get("token") ?? "") as string;
    } catch {
      /* ignore */
    }
  }

  return String(code || "").trim();
}

/**
 * In prod we validate against an env var.
 * Use any one of these names, whichever you prefer to set in Vercel:
 *   SECRET_LOGIN_CODE, LOGIN_CODE, USER_LOGIN_CODE, HAVEN_LOGIN_CODE
 * In development (no env), any code is accepted to keep you moving.
 */
function isValid(code: string) {
  const envCode =
    process.env.SECRET_LOGIN_CODE ||
    process.env.LOGIN_CODE ||
    process.env.USER_LOGIN_CODE ||
    process.env.HAVEN_LOGIN_CODE ||
    "";

  if (!envCode) {
    // No env set -> allow in dev
    return process.env.NODE_ENV !== "production" && !!code;
  }
  return code === envCode;
}

/**
 * Make cookie options work for both apex + www in production.
 */
function cookieOptionsForHost(host: string) {
  const onProdDomain = /(^|\.)havengames\.org$/i.test(host);
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    ...(onProdDomain ? { domain: ".havengames.org" } : {}),
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}

export async function POST(req: NextRequest) {
  const code = await readSecretCode(req);
  if (!code) {
    // <-- This used to trigger your "Missing fields" error.
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  if (!isValid(code)) {
    return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 401 });
  }

  // If your app only checks for presence of "session" cookie, using the code is fine.
  // If you later switch to DB-backed sessions, you can drop a token here instead.
  const res = NextResponse.json({ ok: true });
  const host = req.headers.get("host") || "";
  res.cookies.set("session", code, cookieOptionsForHost(host));
  return res;
}
