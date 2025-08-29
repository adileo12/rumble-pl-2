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
    select: {
      isAdmin: true,
      notifyDeadline: true,
      notifyReport: true,
      notifyElimination: true,
    },
  });
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    ok: true,
    prefs: {
      notifyDeadline: user.notifyDeadline,
      notifyReport: user.notifyReport,
      notifyElimination: user.notifyElimination,
    },
  });
}

export async function POST(req: Request) {
  const sid = cookies().get("sid")?.value || null;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const viewer = await db.user.findUnique({
    where: { id: sid },
    select: { id: true, isAdmin: true },
  });
  if (!viewer) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (viewer.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { notifyDeadline = false, notifyReport = false, notifyElimination = false } = body ?? {};

  const updated = await db.user.update({
    where: { id: viewer.id },
    data: { notifyDeadline, notifyReport, notifyElimination },
    select: { notifyDeadline: true, notifyReport: true, notifyElimination: true },
  });

  return NextResponse.json({ ok: true, prefs: updated });
}
