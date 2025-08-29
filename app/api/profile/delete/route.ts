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
    select: { id: true, isAdmin: true, name: true },
  });
  if (!viewer) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (viewer.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { confirm = "" } = await req.json().catch(() => ({}));
  if (String(confirm).trim() !== viewer.name && String(confirm).trim() !== "DELETE") {
    return NextResponse.json({ ok: false, error: "CONFIRMATION_MISMATCH" }, { status: 400 });
  }

  await db.user.delete({ where: { id: viewer.id } });
  cookies().delete("sid");

  return NextResponse.json({ ok: true });
}
