// app/api/auth/admin-login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";
import { sessionCookieOptionsForHost } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Accept JSON *or* form-encoded POST
    const ct = req.headers.get("content-type") || "";
    let email = "";
    let password = "";

    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({} as any));
      if (typeof body?.email === "string") email = body.email.trim().toLowerCase();
      if (typeof body?.password === "string") password = body.password;
    } else {
      const form = await req.formData().catch(() => null);
      const e = form?.get("email");
      const p = form?.get("password");
      if (typeof e === "string") email = e.trim().toLowerCase();
      if (typeof p === "string") password = p;
    }

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // Flexible model resolution
    const anyDb: any = db;
    const adminClient =
      anyDb.admin ?? anyDb.Admin ?? anyDb.user ?? anyDb.User ?? anyDb.users ?? anyDb.Users;

    if (!adminClient?.findFirst && !adminClient?.findUnique) {
      return NextResponse.json({ ok: false, error: "Admin model not found" }, { status: 500 });
    }

    // Find by email (try unique, else first)
    const admin =
      (await adminClient.findUnique?.({ where: { email } })) ??
      (await adminClient.findFirst?.({ where: { email } })) ??
      null;

    if (!admin) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Support several hash field names
    const hash: string | undefined =
      admin.passwordHash ?? admin.password ?? admin.passhash ?? undefined;

    if (!hash) {
      return NextResponse.json({ ok: false, error: "Password not configured" }, { status: 500 });
    }

    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const host = req.headers.get("host") || "";
    const opts = sessionCookieOptionsForHost(host);

    const jar = cookies();
    jar.set("session", String(admin.id), opts);
    jar.set("sid", String(admin.id), opts);

    return NextResponse.json({ ok: true, adminId: admin.id });
  } catch (err) {
    console.error("POST /api/auth/admin-login error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}