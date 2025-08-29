import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function makeCode() {
  // 6-digit numeric
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST() {
  const sid = cookies().get("sid")?.value || null;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { id: true, isAdmin: true, email: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  if (!user.email) return NextResponse.json({ ok: false, error: "NO_EMAIL_ON_FILE" }, { status: 400 });

  const code = makeCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.emailVerification.create({
    data: { userId: user.id, email: user.email, code, expiresAt },
  });

  // Wire your email provider here. For now we log (dev-safe).
  console.log(`[EmailVerification] to=${user.email} code=${code}`);

  return NextResponse.json({ ok: true });
}
