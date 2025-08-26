import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";
import { sessionCookieOptionsForHost } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const e = String(body?.email || "").trim().toLowerCase();
    const p = String(body?.password || "");

    if (!e || !p) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // Be resilient to different Prisma model names
    const anyDb: any = db;
    const adminClient =
      anyDb.admin ??
      anyDb.Admin ??
      anyDb.adminUser ??
      anyDb.AdminUser ??
      anyDb.administrator ??
      anyDb.Administrator;

    let admin: any | null = null;
    if (adminClient?.findUnique) {
      admin = await adminClient.findUnique({ where: { email: e } }).catch(() => null);
    }
    if (!admin && adminClient?.findFirst) {
      admin = await adminClient.findFirst({ where: { email: e } }).catch(() => null);
    }

    // Optional ENV fallback (if you use it)
    if (!admin) {
      const envEmail = process.env.ADMIN_EMAIL?.toLowerCase();
      const envHash = process.env.ADMIN_PASSWORD_HASH;
      if (!envEmail || !envHash || e !== envEmail) {
        return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
      }
      const ok = await bcrypt.compare(p, envHash);
      if (!ok) return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });

      const host = req.headers.get("host") || "";
      const opts = sessionCookieOptionsForHost(host);
      const jar = cookies();
      jar.set("admin", "1", opts);
      jar.set("adminSession", "1", opts);
      return NextResponse.json({ ok: true });
    }

    const ok = await bcrypt.compare(p, admin.passwordHash ?? admin.password ?? "");
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const host = req.headers.get("host") || "";
    const opts = sessionCookieOptionsForHost(host);
    const jar = cookies();

    // Set admin cookies (keep legacy names to avoid regressions)
    jar.set("admin", String(admin.id), opts);
    jar.set("adminSession", String(admin.id), opts);
    // If your guards check 'sid' too, keep this
    jar.set("sid", String(admin.id), opts);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/admin-login error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
