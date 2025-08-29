// app/api/profile/email/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const EMAIL_RX =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i; // simple, standard format check

export async function GET() {
  const sid = cookies().get("sid")?.value || null;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { id: true, isAdmin: true, email: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ ok: true, email: user.email ?? "" });
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

  const { email = "" } = await req.json().catch(() => ({ email: "" }));
  const value = String(email).trim();

  if (value && !EMAIL_RX.test(value)) {
    return NextResponse.json({ ok: false, error: "INVALID_EMAIL_FORMAT" }, { status: 400 });
  }

  try {
    const updated = await db.user.update({
      where: { id: viewer.id },
      data: { email: value || null },
      select: { email: true },
    });
    return NextResponse.json({ ok: true, email: updated.email ?? "" });
  } catch (err: any) {
    // Unique violation (email already in use)
    if (err?.code === "P2002" || String(err?.message).includes("Unique")) {
      return NextResponse.json({ ok: false, error: "EMAIL_ALREADY_IN_USE" }, { status: 409 });
    }
    console.error("EMAIL_UPDATE_ERROR:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
