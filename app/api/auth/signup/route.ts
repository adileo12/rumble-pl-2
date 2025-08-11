import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateUniqueSecret } from "@/src/lib/secret";

export async function POST(req: Request) {
  try {
    const { firstName, lastName } = await req.json();
    if (!firstName || !lastName) {
      return NextResponse.json({ ok: false, error: "firstName and lastName are required" }, { status: 400 });
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const secretCode = await generateUniqueSecret(db);

    const user = await db.user.create({
      data: {
        name: fullName,     // or displayName if that’s your column
        secretCode,
        // joinCode: "PUBLIC", // include only if your schema requires it
      },
      select: { id: true, name: true, secretCode: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Signup failed" }, { status: 500 });
  }
}
