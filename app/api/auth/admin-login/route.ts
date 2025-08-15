// app/api/auth/admin-login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db"; // <- keep this path consistent with your project

export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();
    const e = String(email).trim().toLowerCase();
    const p = String(password);

    if (!e || !p) {
      return NextResponse.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    // Look up by unique email
    const user = await db.user.findUnique({
      where: { email: e },
      // NOTE: Prisma field names here should match your schema.
      // If your Prisma model maps DB columns, this assumes:
      //   name -> maps to "name"
      //   adminPassword -> maps to "adminpassword"
      select: { id: true, name: true, isAdmin: true, adminPassword: true },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Accept either a hashed adminPassword or (as a fallback) plain equality
    let valid = false;
    if (user.adminPassword?.startsWith("$2")) {
      valid = await bcrypt.compare(p, user.adminPassword);
    } else {
      valid = user.adminPassword === p;
    }

    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const res = NextResponse.json(
      { ok: true, user: { id: user.id, name: user.name, isAdmin: user.isAdmin } },
      { status: 200 }
    );

    // Set the same session cookie your protected layout expects
    res.cookies.set("sid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: !!process.env.VERCEL, // true on Vercel (HTTPS), false locally
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err) {
    console.error("[admin-login] ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
