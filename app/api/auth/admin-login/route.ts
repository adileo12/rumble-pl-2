import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CookieSetOptions = Parameters<ReturnType<typeof cookies>["set"]>[2];

export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();
    const e = String(email).trim().toLowerCase();
    const p = String(password);

    if (!e || !p) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // If your schema uses a different model name, adjust here (e.g., db.adminUser)
    const admin = await db.admin.findUnique({ where: { email: e } });
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await bcrypt.compare(p, admin.passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const host = req.headers.get("host") || "";
    const cookieOptions: CookieSetOptions = {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      ...(host.endsWith("havengames.org") ? { domain: ".havengames.org" } : {}),
    };

    cookies().set("sid", String(admin.id), cookieOptions);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[admin-login] ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
