import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";
import { sessionCookieOptionsForHost } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // everything that needs `req` must be inside the handler
  const host = req.headers.get("host") || "";
  const opts = sessionCookieOptionsForHost(host);
  const jar = cookies();

  // parse and validate body
  const { email, password } = await req.json().catch(() => ({} as any));
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");
  if (!e || !p) {
    return NextResponse.json(
      { ok: false, error: "Missing fields" },
      { status: 400 }
    );
  }

  // handle both possible Prisma model names
  const anyDb: any = db;
  const adminClient =
    anyDb.admin ?? anyDb.Admin ?? anyDb.adminUser ?? anyDb.AdminUser;

  const admin = await adminClient.findUnique({ where: { email: e } });
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const ok = await bcrypt.compare(p, admin.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  // set both cookies (keep names used elsewhere in the app)
  jar.set("session", String(admin.id), opts);
  jar.set("sid", String(admin.id), opts);

  return NextResponse.json({ ok: true });
}
