import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateSecretCode } from "@/src/lib/secret";

// Adjust these types/fields to your actual Prisma User model.
// This code assumes you have at least: id, displayName (or name), secretCode (preferably @unique), isAdmin (default false)
export async function POST(req: Request) {
  try {
    const { firstName, lastName } = await req.json();
    if (!firstName || !lastName) {
      return NextResponse.json({ ok: false, error: "firstName and lastName are required" }, { status: 400 });
    }

    const displayName = `${firstName} ${lastName}`.trim();
    const secretCode = await generateSecretCode();
    const fullName = `${firstName} ${lastName}`.trim();

    // If your User model has different required fields (e.g., joinCode),
    // add them here with a sensible default.
    const user = await db.user.create({
  data: {
    name: fullName,        // ← use `name` instead of `displayName`
    secretCode,            // keep this
    joinCode: "PUBLIC",    // include if your schema requires it
  },
});
      select: { id: true, name: true, secretCode: true }
    });

    // (Optional) set a simple session cookie so they’re “logged in” right away
    // If you already have your own session logic, skip this.
    const res = NextResponse.json({ ok: true, user });
    // res.cookies.set("sid", user.id, { httpOnly: true, sameSite: "lax", maxAge: 60*60*24*30 });

    return res;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "signup failed" }, { status: 500 });
  }
}
