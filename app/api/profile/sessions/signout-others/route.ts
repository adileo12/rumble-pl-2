import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const sid = cookies().get("sid")?.value || null;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { isAdmin: true, id: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  // Clear any stored sessions for this user (no effect today if unused).
  await db.session.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ ok: true });
}
