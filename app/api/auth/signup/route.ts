import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateUniqueSecret } from "@/src/lib/secret";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const firstName = body?.firstName?.trim();
    const lastName = body?.lastName?.trim();
    if (!firstName || !lastName) {
      return NextResponse.json({ ok: false, error: "Missing first/last name" }, { status: 400 });
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const secretCode = await generateUniqueSecret(db); // <-- pass db

    const user = await db.user.create({
      data: {
        displayName: fullName, // <-- required (maps to DB column "name")
        secretCode,            // <-- @unique in your schema
        // joinCode: "PUBLIC",  // optional because you set a default
      },
      select: { id: true, secretCode: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (err: any) {
    console.error("SIGNUP ERROR:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Signup failed" }, { status: 500 });
  }
}