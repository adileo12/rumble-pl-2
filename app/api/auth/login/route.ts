// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { sessionCookieOptionsForHost } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Accept JSON *or* form-encoded POST
    const ct = req.headers.get("content-type") || "";
    let code: string | undefined;

    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({} as any));
      if (typeof body?.code === "string") code = body.code.trim();
    } else {
      const form = await req.formData().catch(() => null);
      const raw = form?.get("code");
      if (typeof raw === "string") code = raw.trim();
    }

    if (!code) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // Flexible model resolution
    const anyDb: any = db;
    const userClient =
      anyDb.user ?? anyDb.User ?? anyDb.users ?? anyDb.Users ?? anyDb.player ?? anyDb.Player;

    if (!userClient?.findFirst) {
      return NextResponse.json({ ok: false, error: "User model not found" }, { status: 500 });
    }

    // Accept either `secretCode` or `code` fields
    let user =
      (await userClient.findFirst({ where: { secretCode: code } })) ??
      (await userClient.findFirst({ where: { code } }));

    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 401 });
    }

    // Build cookie options from the *request host*
    const host = req.headers.get("host") || "";
    const opts = sessionCookieOptionsForHost(host);

    // Set auth cookies (request-scoped)
    const jar = cookies();
    jar.set("session", String(user.id), opts);
    jar.set("sid", String(user.id), opts);

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err) {
    console.error("POST /api/auth/login error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}