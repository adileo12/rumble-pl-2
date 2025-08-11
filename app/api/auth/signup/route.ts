import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateUniqueSecret } from "@/src/lib/secrets"; // ← file name: secrets.ts

export async function POST(req: Request) {
  try {
    const { firstName, lastName } = await req.json();
    if (!firstName || !lastName) {
      return NextResponse.json(
        { ok: false, error: "First and last name are required" },
        { status: 400 }
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const secretCode = await generateUniqueSecret();
    if (!secretCode) {
      throw new Error("Secret code generation returned empty");
    }
    // Debug (visible in Vercel logs)
    console.log("Generated secret:", secretCode);

    const created = await db.user.create({
      data: {
        displayName: fullName,       // your Prisma model maps to column "name"
        secretCode,                  // ← make sure this is present
        joinCode: "PUBLIC",          // safe default; exists in your schema
      },
      select: { id: true, displayName: true, secretCode: true },
    });

    return NextResponse.json({ ok: true, user: created }, { status: 200 });
  } catch (err: any) {
    console.error("SIGNUP ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Signup failed" },
      { status: 500 }
    );
  }
}