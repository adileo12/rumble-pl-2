import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { generateUniqueSecret } from "@/src/lib/secrets";

export async function POST(req: Request) {
  try {
    const { firstName, lastName } = await req.json();
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
    if (!fullName) {
      return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });
    }

    const secretCode = await generateUniqueSecret();
    if (!secretCode) {
      // extra safety – never call create() with a falsy code
      throw new Error("Secret code generation returned empty");
    }

    const created = await db.user.create({
      data: { displayName: fullName, secretCode },     // `displayName` is @map("name")
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
