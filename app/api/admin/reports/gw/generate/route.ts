// app/api/admin/reports/gw/generate/route.ts
import { NextResponse } from "next/server";
import { quickChartUrl } from "@/src/lib/quickchart";
import { eliminationSVG } from "@/src/lib/svg";
import { db } from "@/src/lib/db";

/**
 * Protects this endpoint for schedulers (GitHub Actions, Vercel Cron, etc.)
 * If CRON_SECRET is not set, auth is skipped (useful for local dev).
 */
function assertCronAuth(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return;
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    throw new Error("Unauthorized");
  }
}

export const dynamic = "force-dynamic";
export const revalidate = false;

export async function POST(req: Request) {
  try {
    assertCronAuth(req);

    const { seasonId, gwNumber } = await req.json();
    if (!seasonId || typeof gwNumber !== "number") {
      return NextResponse.json(
        { ok: false, error: "seasonId and gwNumber required" },
        { status: 400 }
      );
    }

    // Idempotency: do nothing if report exists
    const existing = await db.rumbleReport.findUnique({
      where: { seasonId_gwNumber: { seasonId, gwNumber } },
      select: { seasonId: true },
    });
    if (existing) {
      return NextResponse.json({ ok: true, already: true });
    }

    // Load GW & validate deadline
    const gw = await db.gameweek.findUnique({
      where: { seasonId_number: { seasonId, number: gwNumber } },
      select: { id: true, number: true, deadline: true, graded: true },
    });
    if (!gw) {
      return NextResponse.json(
        { ok: false, error: "Gameweek not found" },
        { status: 404 }
      );
    }
    if (gw.deadline > new Date()) {
      return NextResponse.json(
        { ok: false, error: "Deadline has not passed" },
        { status: 409 }
      );
    }

    // A) Picks by club (pie)
    const clubCounts = await db.pick.groupBy({
      by: ["clubId"],
      where: { seasonId, gwId: gw.id },
      _count: { clubId: true },
    });

    const clubIds = clubCounts.map((r) => r.clubId);
    const clubs = clubIds.length
      ? await db.club.findMany({
          where: { id: { in: clubIds } },
          // Your schema uses shortName (not short)
          select: { id: true, shortName: true, name: true },
        })
      : [];
    const clubMeta = new Map(clubs.map((c) => [c.id, c]));

    const clubLabels = clubCounts.map((r) => {
      const c = clubMeta.get(r.clubId);
      return c?.shortName ?? c?.name ?? r.clubId;
    });
    const clubData = clubCounts.map((r) => r._count.clubId);

    const clubPieUrl = quickChartUrl(
      `Picks by club — GW ${gwNumber}`,
      clubLabels,
      clubData
    );

    // B) Manual vs Proxy (pie)
    const sourceCounts = await db.pick.groupBy({
      by: ["source"], // "USER" | "PROXY"
      where: { seasonId, gwId: gw.id },
      _count: { source: true },
    });
    const sourceMap: Record<string, number> = {};
    for (const r of sourceCounts) {
      const key = (r.source || "").toUpperCase();
      sourceMap[key] = r._count.source;
    }
    const sourceLabels = ["Manual", "Proxy"];
    const sourceData = [sourceMap["USER"] ?? 0, sourceMap["PROXY"] ?? 0];

    const sourcePieUrl = quickChartUrl(
      `Manual vs Proxy — GW ${gwNumber}`,
      sourceLabels,
      sourceData
    );

    // C) Eliminated names (only when graded)
    let eliminatedSvg: string | null = null;
    if (gw.graded) {
      // 1) get eliminated userIds from RumbleState
      const eliminatedStates = await db.rumbleState.findMany({
        where: { seasonId, eliminatedAtGw: gwNumber },
        select: { userId: true },
        orderBy: { userId: "asc" },
      });
      const userIds = eliminatedStates.map((e) => e.userId);

      // 2) fetch user names in one query
      const users = userIds.length
        ? await db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, displayName: true, name: true, username: true },
          })
        : [];
      const userMeta = new Map(users.map((u) => [u.id, u]));
      const names = userIds.map((id) => {
        const u = userMeta.get(id);
        return (
          u?.displayName?.trim() ||
          u?.name?.trim() ||
          u?.username?.trim() ||
          "Unknown"
        );
      });

      eliminatedSvg = eliminationSVG({ seasonId, gwNumber, names });
    }

    const payload: any = { clubPieUrl, sourcePieUrl };
    if (eliminatedSvg) payload.eliminatedSvg = eliminatedSvg;

    await db.rumbleReport.upsert({
      where: { seasonId_gwNumber: { seasonId, gwNumber } },
      create: { seasonId, gwNumber, payload },
      update: { payload },
    });

    return NextResponse.json({ ok: true, ...payload }, { status: 200 });
  } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : "Internal error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
