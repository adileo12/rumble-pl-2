import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const sid = cookies().get("sid")?.value || null;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const viewer = await db.user.findUnique({
    where: { id: sid },
    select: { id: true, isAdmin: true, email: true },
  });
  if (!viewer) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (viewer.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  if (!viewer.email) return NextResponse.json({ ok: false, error: "NO_EMAIL_ON_FILE" }, { status: 400 });

  const { code = "" } = await req.json().catch(() => ({}));
  const val = String(code).trim();

  const record = await db.emailVerification.findFirst({
    where: { userId: viewer.id, email: viewer.email, code: val },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return NextResponse.json({ ok: false, error: "CODE_INVALID" }, { status: 400 });
  if (record.expiresAt <= new Date()) return NextResponse.json({ ok: false, error: "CODE_EXPIRED" }, { status: 400 });

  await db.$transaction([
    db.user.update({ where: { id: viewer.id }, data: { emailVerifiedAt: new Date() } }),
    db.emailVerification.deleteMany({ where: { userId: viewer.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
