// app/api/auth/admin-login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";
import { sessionCookieOptionsForHost } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({}));
    const e = String(email || "").trim().toLowerCase();
    const p = String(password || "");

    if (!e || !p) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // Be resilient to model naming differences
    const anyDb: any = db;
    const AdminModel =
      anyDb.admin ?? anyDb.Admin ?? anyDb.adminUser ?? anyDb.AdminUser ?? anyDb.user;

    let admin: any = null;
    if (AdminModel === anyDb.user) {
      // Fall back: look for role 'ADMIN' on User
      admin = await anyDb.user.findFirst({ where: { email: e, role: "ADMIN" } });
    } else {
      admin = await AdminModel.findUnique({ where: { email: e } });
    }

    if (!admin) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const hash = admin.passwordHash ?? admin.password ?? "";
    const ok = hash && (await bcrypt.compare(p, String(hash)));
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Set cookies INSIDE the handler using the request host
    const host = req.headers.get("host") || "";
    const opts = sessionCookieOptionsForHost(host);
    const jar = cookies();

    // Write both names if your app reads either
    jar.set("session", String(admin.id), opts);
    jar.set("sid", String(admin.id), opts);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/admin-login error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}