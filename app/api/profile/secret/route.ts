// app/api/profile/secret/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// at least 8 chars, has letters, numbers, special characters
const NEW_SECRET_RX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export async function POST(req: Request) {
  const sid = cookies().get("sid")?.value || null;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const viewer = await db.user.findUnique({
    where: { id: sid },
    select: { id: true, isAdmin: true, secretCode: true },
  });
  if (!viewer) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (viewer.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { currentSecret = "", newSecret = "" } = await req.json().catch(() => ({}));

  // Validate current secret
  if (String(currentSecret) !== viewer.secretCode) {
    return NextResponse.json({ ok: false, error: "CURRENT_SECRET_INCORRECT" }, { status: 400 });
  }

  // Validate new secret policy
  if (!NEW_SECRET_RX.test(String(newSecret))) {
    return NextResponse.json({ ok: false, error: "NEW_SECRET_WEAK" }, { status: 400 });
  }

  // Update secret
  await db.user.update({
    where: { id: viewer.id },
    data: { secretCode: String(newSecret) },
  });

  // From now on, login uses the new secretCode (your auth already matches by secretCode)
  return NextResponse.json({ ok: true });
}
