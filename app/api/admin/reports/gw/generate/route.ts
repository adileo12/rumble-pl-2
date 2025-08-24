import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { quickChartUrl } from "@/src/lib/quickchart";
import { eliminationSVG } from "@/src/lib/svg";

/** Bearer-protect for schedulers; skipped if CRON_SECRET is unset (local dev). */
function assertCronAuth(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return;
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) throw new Error("Unauthorized");
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    assertCronAuth(req);

    const { seasonId, gwNumber } = await req.json?.() ?? {};
    if (!seasonId || typeof gwNumber !== "number" || !Number.isInteger(gwNumber)) {
      return NextResponse.json({ ok: false, error: "seasonId and gwNumber required" }, { status: 400 });
    }

    // Idempotent: if a report row exists, short-circuit.
    const existing = await db.rumbleReport.findUnique({
      where: { seasonId_gwNumber: { seasonId, gwNumber } },
      select: { seasonId: true },
    });
    if (existing) return NextResponse.json({ ok: true, already: true });

    // Load GW; validate deadline has passed.
    const gw = await db.gameweek.findUnique({
      where: { seasonId_number: { seasonId, number: gwNumber } },
      select: { id: true, number: true, deadline: true, graded: true },
    });
    if (!gw) return NextResponse.json({ ok: false, error: "Gameweek not found" }, { status: 404 });
    if (gw.deadline > new Date()) {
      return NextResponse.json({ ok: false, error: "Deadline has not passed" }, { status: 409 });
    }

    // === Report A: Picks-by-club pie ========================================
    const clubCounts = await db.pick.groupBy({
      by: ["clubId"],
      where: { seasonId, gwId: gw.id },
      _count: { clubId: true },
    });

    const clubs = clubCounts.length
      ? await db.club.findMany({
          where: { id: { in: clubCounts.map(c => c.clubId) } },
          select: { id: true, shortName: true, name: true },
        })
      : [];

    const clubMeta = new Map(clubs.map(c => [c.id, c]));
    const clubLabels = clubCounts.map(c => {
      const club = clubMeta.get(c.clubId);
      return club?.shortName ?? club?.name ?? c.clubId;
    });
    const clubData = clubCounts.map(c => c._count.clubId);
    const clubPieUrl = quickChartUrl(`Picks by club — GW ${gwNumber}`, clubLabels, clubData);

    // === Report B: Manual vs Proxy pie ======================================
    const sourceCounts = await db.pick.groupBy({
      by: ["source"],            // "USER" | "PROXY"
      where: { seasonId, gwId: gw.id },
      _count: { source: true },
    });
    const bySrc: Record<string, number> = {};
    for (const row of sourceCounts) {
      bySrc[(row.source || "").toUpperCase()] = row._count.source;
    }
    const sourcePieUrl = quickChartUrl(
      `Manual vs Proxy — GW ${gwNumber}`,
      ["Manual", "Proxy"],
      [bySrc["USER"] ?? 0, bySrc["PROXY"] ?? 0]
    );

    // === Report C: Eliminations graphic (only when graded) ===================
    let eliminatedSvg: string | undefined;
    if (gw.graded) {
      const eliminatedStates = await db.rumbleState.findMany({
        where: { seasonId, eliminatedAtGw: gwNumber },
        select: { userId: true },
        orderBy: { userId: "asc" },
      });
      const userIds = eliminatedStates.map(e => e.userId);

      const users = userIds.length
        ? await db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
      const uMap = new Map(users.map(u => [u.id, u]));

      const names = userIds.map(id => {
        const u = uMap.get(id);
        const emailPrefix = u?.email?.split("@")[0] ?? "";
        return (u?.name?.trim() || emailPrefix || "Unknown");
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

    return NextResponse.json({ ok: true, payload }, { status: 200 });
  } catch (err: any) {
    const msg = err?.message === "Unauthorized" ? "Unauthorized" : (err?.message || "Internal error");
    return NextResponse.json({ ok: false, error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
