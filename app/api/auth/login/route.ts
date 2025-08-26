// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { sessionCookieOptionsForHost } from "@/src/lib/auth";

const COOKIE = "sid";

function cookieOptions(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const isProd = process.env.NODE_ENV === "production";
  const prodDomain =
    isProd && (host.endsWith("havengames.org") || host.endsWith("www.havengames.org"))
      ? ".havengames.org"
      : undefined;

  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    ...(prodDomain ? { domain: prodDomain } : {}),
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}

// Read code from JSON or form-encoded bodies; accept `secretCode` or `code`
async function readCode(req: NextRequest): Promise<string> {
  // Try JSON
  try {
    const body = await req.json();
    const sc = String(body?.secretCode ?? body?.code ?? "").trim();
    if (sc) return sc;
  } catch {
    /* continue */
  }
  // Try form data
  try {
    const form = await req.formData();
    const sc = String(form.get("secretCode") ?? form.get("code") ?? "").trim();
    if (sc) return sc;
  } catch {
    /* continue */
  }
  return "";
}

export async function POST(req: NextRequest) {
  const sc = await readCode(req);
  const opts = sessionCookieOptionsForHost(req.headers.get("host") || "");
  if (!sc) {
    return NextResponse.json({ ok: false, error: "Missing secretCode" }, { status: 400 });
  }

  // Look up user by secret code
  const user = await db.user.findUnique({
    where: { secretCode: sc },
    select: { id: true, name: true, isAdmin: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 401 });
  }

  // Set session cookie
 cookies().set("session", String(user.id), opts);
cookies().set("sid", String(user.id), opts);

  return NextResponse.json({ ok: true, user });
}
