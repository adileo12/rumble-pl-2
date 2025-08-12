// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateUniqueSecret } from "@/src/lib/secrets";

export async function POST(req: Request) {
  try {
    const { firstName, lastName } = await req.json();
    if (!firstName || !lastName) {
      return NextResponse.json(
        { ok: false, error: "First and last name required" },
        { status: 400 }
      );
    }

    const fullName = `${String(firstName).trim()} ${String(lastName).trim()}`.trim();

    // 1) block duplicate sign‑ups by name (case-insensitive match)
    const existing = await db.user.findFirst({
      where: { displayName: { equals: fullName, mode: "insensitive" } },
      select: { id: true, displayName: true }
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "User already exists. Please log in with your secret code." },
        { status: 409 }
      );
    }

    // 2) generate a unique secret code
    const secretCode = await generateUniqueSecret();
    if (!secretCode) {
      return NextResponse.json(
        { ok: false, error: "Failed to generate secret" },
        { status: 500 }
      );
    }

    // 3) create the user writing to *model* fields that map to your columns
    const created = await db.user.create({
      data: {
        name: fullName,         // -> column "name"
        secretCode: secretCode, // -> column "secretcode"
      },
      select: { id: true, name: true, secretCode: true }
    });

    return NextResponse.json({ ok: true, user: created }, { status: 200 });
  } catch (err: any) {
    console.error("SIGNUP ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Signup failed" },
      { status: 500 }
    );
  }
}
