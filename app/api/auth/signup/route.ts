// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateUniqueSecret } from "@/src/lib/secrets";

export async function POST(req: Request) {
  try {
    const { firstName = "", lastName = "" } = await req.json();

    const fn = String(firstName).trim();
    const ln = String(lastName).trim();
    if (!fn || !ln) {
      return NextResponse.json(
        { ok: false, error: "First and last name required" },
        { status: 400 }
      );
    }

    const fullName = `${fn} ${ln}`.replace(/\s+/g, " ").trim();

    // 1) BLOCK DUPLICATES — case-insensitive match on name/displayName
    const existing = await db.user.findFirst({
      where: {
        // If your Prisma model uses `name` (not `displayName`), change this field.
        displayName: { equals: fullName, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "User already exists" },
        { status: 409 }
      );
    }

    // 2) Make a new unique secret
    const secretCode = await generateUniqueSecret();
    if (!secretCode) {
      return NextResponse.json(
        { ok: false, error: "Failed to generate secret" },
        { status: 500 }
      );
    }

    // 3) Create the user
    const created = await db.user.create({
      data: {
        // If your Prisma model maps this to column "name" via @map("name"),
        // keep using `displayName` here. Otherwise change to `name`.
        displayName: fullName,
        // If mapped via @map("secretcode"), keep using `secretCode` here.
        secretCode,
        isAdmin: false,
      },
      select: { id: true, displayName: true, secretCode: true },
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