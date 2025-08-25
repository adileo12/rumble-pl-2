// app/api/auth/admin-login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();
    const e = String(email).trim().toLowerCase();
    const p = String(password);
    if (!e || !p) return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });

    const admin = await db.admin.findUnique({ where: { email: e } });
    if (!admin) return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    const ok = await bcrypt.compare(p, admin.passwordHash);
    if (!ok) return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });

    const res = NextResponse.json({ ok: true, user: { id: admin.id, email: admin.email } }, { status: 200 });

    // ⬇️ Domain for apex + www only in prod
    const host = new URL(req.url).host || "";
    const cookieOptions: Parameters<typeof res.cookies.set>[2] = {
      httpOnly: true,
      sameSite: "lax",
      secure: !!process.env.VERCEL,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      ...(host.endsWith("havengames.org") ? { domain: ".havengames.org" } : {}),
    };

    res.cookies.set("sid", admin.id, cookieOptions);
    return res;
  } catch (err) {
    console.error("[admin-login] ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
