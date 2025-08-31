// app/api/admin/process-results/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { effectiveDeadline } from "@/src/lib/deadline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    // Auth: admin only
    const sid = cookies().get("sid")?.value ?? null;
    const viewer = sid
      ? await db.user.findUnique({ where: { id: sid }, select: { isAdmin: true } })
      : null;
    if (!viewer?.isAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { seasonId: bodySeasonId, gwNumber: bodyGwNumber } = (await req.json().catch(() => ({}))) as {
      seasonId?: string;
      gwNumber?: number;
    };

    // Active season fallback
    const season =
      bodySeasonId
        ? await db.season.findUnique({ where: { id: bodySeasonId }, select: { id: true } })
        : await db.season.findFirst({ where: { isActive: true }, select: { id: true } });

    if (!season) return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });

    // Target GW (by number or “latest passed effective deadline”)
    let target = null as null | { id: string; number: number };
    if (typeof bodyGwNumber === "number") {
      const byNum = await db.gameweek.findFirst({
        where: { seasonId: season.id, number: bodyGwNumber },
        select: { id: true, number: true },
      });
      if (byNum) target = byNum;
    }
    if (!target) {
      const gws = await db.gameweek.findMany({
        where: { seasonId: season.id },
        select: { id: true, number: true },
        orderBy: { number: "asc" },
      });
      const now = Date.now();
      let best: { id: string; number: number } | null = null;
      let bestEff: number | null = null;
      for (const gw of gws) {
        const eff = await effectiveDeadline(gw.id);
        if (!eff) continue;
        const t = eff.getTime();
        if (t <= now && (!bestEff || t > bestEff)) {
          best = gw;
          bestEff = t;
        }
      }
      if (best) target = best;
    }
    if (!target) {
      return NextResponse.json({ ok: true, info: "No passed deadlines to process" });
    }

    // Safety: don’t process results before effective deadline
    const eff = await effectiveDeadline(target.id);
    if (eff && eff.getTime() > Date.now()) {
      return NextResponse.json({ ok: false, error: "Deadline not passed yet" }, { status: 409 });
    }

    // === RESULTS/ELIMS COMPUTATION ===
    // Example structure — keep your grading logic, just fix filters:
    // 1) Pull picks by relation to GW number (NOT gwNumber on Pick)
    const picks = await db.pick.findMany({
      where: {
        seasonId: season.id,
        gw: { number: target.number },
      },
      select: {
        id: true,
        userId: true,
        clubId: true,
        source: true, // <-- use `source`, not `submissionSource`
      },
    });

    // TODO: If you have grading logic (match outcomes → win/draw/loss), keep it here.
    // The key fix is using `gw: { number: target.number }` and `source`.

    // Example elimination logic: if you already have grade flags use them.
    // Here we only demonstrate structure; keep your actual grading.
    const eliminated: string[] = [];
    // ... compute eliminated users into `eliminated`

    // Persist eliminated state
    if (eliminated.length > 0) {
      await db.user.updateMany({
        where: { id: { in: eliminated } },
        data: { alive: false },
      });
    }

    // Mark GW graded if you do that in your system
    await db.gameweek.update({ where: { id: target.id }, data: { graded: true } }).catch(() => {});

    return NextResponse.json({
      ok: true,
      processed: {
        seasonId: season.id,
        gwNumber: target.number,
        picks: picks.length,
        eliminated: eliminated.length,
      },
    });
  } catch (err: any) {
    console.error("PROCESS-RESULTS ERROR:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
