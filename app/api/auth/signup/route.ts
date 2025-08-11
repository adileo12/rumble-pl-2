import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateSecretCode } from "@/src/lib/secret"; // <- make sure this path matches your file

export async function POST(req: Request) {
  const { firstName, lastName } = await req.json();

  if (!firstName || !lastName) {
    return NextResponse.json(
      { ok: false, error: "firstName and lastName are required" },
      { status: 400 }
    );
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const secretCode = await generateSecretCode();

  const user = await db.user.create({
  data: {
    name: fullName,         // keep if you also store `name`
    displayName: fullName,  // <-- add this line
    secretCode,
    joinCode: "PUBLIC",
  },
  select: { id: true, name: true, displayName: true, secretCode: true },
});

  return NextResponse.json({ ok: true, user });
}
