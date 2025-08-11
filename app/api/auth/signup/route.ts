import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateUniqueSecret } from "@/src/lib/secrets";

export async function POST(req: Request) {
  try {
    const { firstName, lastName } = await req.json();
    if (!firstName || !lastName) {
      return NextResponse.json({ ok: false, error: "First and last name required" }, { status: 400 });
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const secretCode = await generateUniqueSecret();
    if (!secretCode) {
      return NextResponse.json({ ok: false, error: "Failed to generate secret" }, { status: 500 });
    }

    const created = await db.user.create({
      data: {
        displayName: fullName,  // maps to column "name" via @map("name")
        secretCode,             // maps to column "secretcode" via @map("secretcode")
        // joinCode: "PUBLIC",   // keep if your schema requires it
      },
      select: { id: true, displayName: true, secretCode: true },
    });

    return NextResponse.json({ ok: true, user: created }, { status: 200 });
  } catch (err: any) {
    console.error("SIGNUP ERROR:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Signup failed" }, { status: 500 });
  }
}
