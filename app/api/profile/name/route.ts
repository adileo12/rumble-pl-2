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
    select: { isAdmin: true, name: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ ok: true, name: user.name });
}

export async function POST(req: Request) {
  const sid = cookies().get("sid")?.value || null;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const viewer = await db.user.findUnique({ where: { id: sid }, select: { id: true, isAdmin: true } });
  if (!viewer) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (viewer.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { name = "" } = await req.json().catch(() => ({}));
  const value = String(name).trim();
  if (!value) return NextResponse.json({ ok: false, error: "NAME_REQUIRED" }, { status: 400 });
  if (value.length > 40) return NextResponse.json({ ok: false, error: "NAME_TOO_LONG" }, { status: 400 });

  await db.user.update({ where: { id: viewer.id }, data: { name: value } });
  return NextResponse.json({ ok: true, name: value });
}
