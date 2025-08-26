// app/api/auth/admin-login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";// keep your existing prisma client import

// make cookie valid on apex + www in prod
function cookieOptsFor(host: string) {
  const domain =
    host.endsWith("havengames.org") ? ".havengames.org" :
    host.endsWith(".vercel.app")   ? undefined : undefined;

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    ...(domain ? { domain } : {}),
  };
}

export async function POST(req: NextRequest) {
  try {
    // accept both JSON and form posts
    const ct = req.headers.get("content-type") || "";
    let email = "", password = "";
    if (ct.includes("application/json")) {
      const j = (await req.json()) ?? {};
      email = String(j.email || "").trim().toLowerCase();
      password = String(j.password || "");
    } else {
      const fd = await req.formData();
      email = String(fd.get("email") || "").trim().toLowerCase();
      password = String(fd.get("password") || "");
    }

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // If your model is Admin or AdminUser, both variants are handled below.
    const admin =
      (db as any).admin?.findUnique
        ? await (db as any).admin.findUnique({ where: { email } })
        : await (db as any).adminUser.findUnique({ where: { email } });

    if (!admin) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    // ⬇️ only set cookies AFTER admin is known and validated
    const jar = cookies();
    const opts = cookieOptsFor(req.headers.get("host") || "");
    jar.set("session", String(admin.id), opts);
    jar.set("sid", String(admin.id), opts); // keep for back-compat if you use it elsewhere

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
