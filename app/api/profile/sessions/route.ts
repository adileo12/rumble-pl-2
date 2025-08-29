import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const sid = cookies().get("sid")?.value || null;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { isAdmin: true, id: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  // If you later use Session-based auth, these will show.
  const sessions = await db.session.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, createdAt: true, expiresAt: true },
  });

  return NextResponse.json({ ok: true, currentDevice: true, sessions });
}
