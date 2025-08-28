// app/api/rumble/resolve/route.ts\
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getActiveSeason } from "@/src/lib/game";
import { resolveGameweek } from "@/src/lib/results";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { seasonId: seasonIdIn, gwId } = await req.json().catch(() => ({}));

    const season = seasonIdIn
      ? await db.season.findUniqueOrThrow({ where: { id: seasonIdIn } })
      : await getActiveSeason();

    if (!season) {
      return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });
    }
    if (!gwId) {
      return NextResponse.json({ ok: false, error: "gwId required" }, { status: 400 });
    }

    const summary = await resolveGameweek(season.id, gwId);
    return NextResponse.json({ ok: true, seasonId: season.id, gwId, summary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
