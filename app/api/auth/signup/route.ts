import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateUniqueSecret } from "@/src/lib/secrets"; // <- make sure this path matches your file

export async function POST(req: Request) {
  const { firstName, lastName } = await req.json();

  if (!firstName || !lastName) {
    return NextResponse.json(
      { ok: false, error: "firstName and lastName are required" },
      { status: 400 }
    );
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const secretCode = await generateUniqueSecret();

  const user = await db.user.create({
    data: {
      name: fullName,       // use `name` since your DB doesn't have displayName
      secretCode,
      joinCode: "PUBLIC",   // keep/remove depending on your schema
    },
    select: { id: true, name: true, secretCode: true }, // <-- inside the same object
  });

  return NextResponse.json({ ok: true, user });
}
