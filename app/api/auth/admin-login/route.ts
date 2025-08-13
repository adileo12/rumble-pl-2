import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import bcrypt from "bcryptjs";

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

    // get admin by email with both hash (new) and legacy plaintext (if you still keep it)
    const user = await db.user.findUnique({
      where: { email: e },
      select: {
        id: true,
        displayName: true, // Prisma field mapped to DB "name"
        isAdmin: true,
        adminPasswordHash: true,
        // adminPassword: true, // uncomment only if you still have legacy plaintext column
      },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    let ok = false;

    // prefer verifying with hash
    if (user.adminPasswordHash) {
      ok = await bcrypt.compare(p, user.adminPasswordHash);
    } else {
      // ---- Legacy fallback (optional) ----
      // If you still have a legacy plaintext column (e.g., adminPassword),
      // you can temporarily compare then backfill the hash:
      //
      // if (user.adminPassword && user.adminPassword === p) {
      //   ok = true;
      //   const hash = await bcrypt.hash(p, 12);
      //   await db.user.update({
      //     where: { id: user.id },
      //     data: { adminPasswordHash: hash },
      //   });
      // }
      //
      // If you no longer keep plaintext, just leave ok = false.
    }

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // set the same cookie your normal login uses
    const res = NextResponse.json(
      { ok: true, user: { id: user.id, displayName: user.displayName, isAdmin: true } },
      { status: 200 }
    );

    res.cookies.set("sid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err: any) {
    console.error("ADMIN LOGIN ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}