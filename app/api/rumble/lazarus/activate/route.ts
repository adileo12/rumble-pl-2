import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getViewer() {
  try {
    const h = headers();
    const host = h.get("host");
    const protocol = process.env.VERCEL ? "https" : "http";
    const r = await fetch(`${protocol}://${host}/api/auth/me`, {
      headers: { cookie: cookies().toString() },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = await r.json();
    return (j?.user ?? j) as any;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { seasonId } = await req.json();
    if (!seasonId) return NextResponse.json({ ok: false, error: "Missing seasonId" }, { status: 400 });

    const anyDb = db as any;
    const lazClient = anyDb.rumbleLazarus ?? anyDb.RumbleLazarus ?? null;
    const elimClient = anyDb.rumbleElimination ?? anyDb.RumbleElimination ?? null;

    if (!lazClient) {
      return NextResponse.json({ ok: false, error: "Lazarus store not configured" }, { status: 409 });
    }

    const laz = await lazClient.findUnique({
      where: { seasonId_userId: { seasonId, userId: viewer.id } },
      select: { used: true, eligibleFrom: true, eligibleUntil: true },
    });

    if (!laz) {
      return NextResponse.json({ ok: false, error: "Not eligible" }, { status: 409 });
    }
    if (laz.used) {
      return NextResponse.json({ ok: false, error: "Already used" }, { status: 409 });
    }

    const now = new Date();
    if (laz.eligibleFrom && now < new Date(laz.eligibleFrom)) {
      return NextResponse.json({ ok: false, error: "Window not open yet" }, { status: 409 });
    }
    if (laz.eligibleUntil && now > new Date(laz.eligibleUntil)) {
      return NextResponse.json({ ok: false, error: "Window expired" }, { status: 409 });
    }

    // Mark lazarus used + clear elimination (if you persist eliminations)
    await lazClient.update({
      where: { seasonId_userId: { seasonId, userId: viewer.id } },
      data: { used: true, usedAt: now },
    });

    if (elimClient) {
      await elimClient.deleteMany({
        where: { seasonId, userId: viewer.id },
      });
    }

    return NextResponse.json({ ok: true, revived: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
