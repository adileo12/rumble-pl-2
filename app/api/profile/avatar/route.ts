import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Accept data URL images (png/jpg/webp) up to ~250KB to keep DB small
const DATAURL_RX = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i;
const MAX_LEN = 260_000;

export async function GET() {
  const sid = cookies().get("sid")?.value || null;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { isAdmin: true, avatarUrl: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ ok: true, avatarUrl: user.avatarUrl ?? "" });
}

export async function POST(req: Request) {
  const sid = cookies().get("sid")?.value || null;
  if (!sid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const viewer = await db.user.findUnique({ where: { id: sid }, select: { id: true, isAdmin: true } });
  if (!viewer) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (viewer.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { dataUrl = "" } = await req.json().catch(() => ({}));
  const val = String(dataUrl);
  if (!val) return NextResponse.json({ ok: false, error: "MISSING_IMAGE" }, { status: 400 });
  if (val.length > MAX_LEN) return NextResponse.json({ ok: false, error: "IMAGE_TOO_LARGE" }, { status: 400 });
  if (!DATAURL_RX.test(val)) return NextResponse.json({ ok: false, error: "INVALID_IMAGE" }, { status: 400 });

  await db.user.update({ where: { id: viewer.id }, data: { avatarUrl: val } });
  return NextResponse.json({ ok: true, avatarUrl: val });
}
