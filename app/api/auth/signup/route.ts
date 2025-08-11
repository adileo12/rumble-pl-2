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
    const secretCode = await generateUniqueSecret(db); // NOTE: pass db here

    // ⚠️ Insert ONLY the fields your DB actually has/needs.
    // If your User model does NOT require joinCode or displayName, don't include them.
    const user = await db.user.create({
      data: {
        name: fullName,       // if your table uses `name`
        secretCode,           // must exist and ideally be @unique in Prisma
        // joinCode: "PUBLIC", // uncomment ONLY if your Prisma model requires it
        // displayName: fullName, // add ONLY if your DB really has this column
      },
      select: { id: true, secretCode: true },
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