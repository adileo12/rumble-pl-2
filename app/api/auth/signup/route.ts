import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateUniqueSecret } from "@/src/lib/secret";

// POST /api/auth/signup  { firstName, lastName }
export async function POST(req: Request) {
  try {
    const { firstName, lastName } = await req.json();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { ok: false, error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

    // make a unique animal+NN code (checks DB for collisions)
    const secretCode = await generateUniqueSecret(db);

    // create the user
    const user = await db.user.create({
      data: {
        displayName: fullName,   // Prisma field (mapped to DB column "name")
        secretCode,              // requires the column in DB
        // joinCode: "PUBLIC",    // uncomment ONLY if your DB has this column
      },
      select: { id: true, displayName: true, secretCode: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (err: any) {
    console.error("SIGNUP ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Signup failed" },
      { status: 500 }
    );
  }
}