import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";
import { sessionCookieOptions } from "@/src/lib/session-cookie";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();
    const e = String(email).trim().toLowerCase();
    const p = String(password);

    if (!e || !p) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // ✅ Your schema has no `Admin` model; use `user` with isAdmin flag.
    // Use `any` so this works whether or not you have a passwordHash column.
    const anyDb = db as any;
    const admin = await anyDb.user.findFirst({
      where: { email: e, isAdmin: true },
      // don't select passwordHash to avoid schema mismatch; access via (admin as any)
      select: { id: true, email: true, name: true, isAdmin: true },
    });

    if (!admin) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    // If your User model has `passwordHash`, we'll use it. Otherwise fallback to ADMIN_PASSWORD env.
    const hash: string | undefined = (admin as any).passwordHash;
    let ok = false;

    if (hash) {
      ok = await bcrypt.compare(p, hash);
    } else if (process.env.ADMIN_PASSWORD) {
      ok = p === process.env.ADMIN_PASSWORD;
    }

    if (!ok) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Set session cookie (valid on apex + www in prod)
    cookies().set("sid", String(admin.id), sessionCookieOptions());

    return NextResponse.json({
      ok: true,
      user: { id: admin.id, email: admin.email, name: admin.name, isAdmin: true },
    });
  } catch (err) {
    console.error("[admin-login] ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
