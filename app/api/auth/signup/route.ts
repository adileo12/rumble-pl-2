import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateUniqueSecret } from "@/src/lib/secret";

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

    const user = await db.user.create({
      data: {
        // include whatever your schema requires:
        name: fullName,
        displayName: fullName,   // if your Prisma types require this
        secretCode,
        joinCode: "PUBLIC",      // only if your schema requires it
      },
      select: { id: true, name: true, displayName: true, secretCode: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
