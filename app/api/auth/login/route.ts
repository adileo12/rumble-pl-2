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

type LooseLoginBody = Partial<{
  code: string;
  joinCode: string;
  join_code: string;
  secret: string;
  secretCode: string;
  secret_code: string;
}>;

function pickFirst(...vals: (string | null | undefined)[]) {
  for (const v of vals) {
    const s = typeof v === "string" ? v.trim() : "";
    if (s) return s;
  }
  return "";
}

export async function POST(req: Request) {
  try {
    let body: LooseLoginBody = {};
    const ct = req.headers.get("content-type") || "";

    // Accept JSON
    if (ct.includes("application/json")) {
      try {
        body = (await req.json()) ?? {};
      } catch {
        body = {};
      }
    }
    // Accept form posts (default <form method="POST">)
    else if (
      ct.includes("application/x-www-form-urlencoded") ||
      ct.includes("multipart/form-data")
    ) {
      const form = await req.formData();
      body = {
        code: (form.get("code") as string) ?? undefined,
        joinCode: (form.get("joinCode") as string) ?? undefined,
        join_code: (form.get("join_code") as string) ?? undefined,
        secret: (form.get("secret") as string) ?? undefined,
        secretCode: (form.get("secretCode") as string) ?? undefined,
        secret_code: (form.get("secret_code") as string) ?? undefined,
      };
    }
    // As a last resort, accept query params (handy for quick tests)
    else {
      const url = new URL(req.url);
      body = {
        code: url.searchParams.get("code") ?? undefined,
        joinCode: url.searchParams.get("joinCode") ?? undefined,
        join_code: url.searchParams.get("join_code") ?? undefined,
        secret: url.searchParams.get("secret") ?? undefined,
        secretCode: url.searchParams.get("secretCode") ?? undefined,
        secret_code: url.searchParams.get("secret_code") ?? undefined,
      };
    }

    const code = pickFirst(body.code, body.joinCode, body.join_code);
    const secret = pickFirst(body.secret, body.secretCode, body.secret_code);

    if (!code || !secret) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // Your schema: User has joinCode + secretCode
    const user = await db.user.findFirst({
      where: { joinCode: code, secretCode: secret },
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
