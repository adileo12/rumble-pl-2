import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { sessionCookieOptionsForHost } from "@/src/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const anyDb: any = db;
    const adminClient = anyDb.admin ?? anyDb.Admin ?? anyDb.adminUser ?? anyDb.AdminUser;

    const admin = await adminClient.findUnique?.({ where: { email } })
               ?? await adminClient.findFirst?.({ where: { email } });
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash || admin.password || "");
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const host = req.headers.get("host");
    const opts = sessionCookieOptionsForHost(host);
    const jar = cookies();
    jar.set("session", String(admin.id), opts as any);
    jar.set("sid", String(admin.id), opts as any);

    return NextResponse.json({ ok: true, adminId: admin.id });
  } catch (err) {
    console.error("POST /api/auth/admin-login error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
