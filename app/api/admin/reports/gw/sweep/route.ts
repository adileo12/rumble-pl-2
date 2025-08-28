import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { quickChartUrl } from "@/src/lib/quickchart";
import { eliminationSVG } from "@/src/lib/svg";

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

    // Sweep the last ~36h of deadlines
    const now = new Date();
    const since = new Date(now.getTime() - 36 * 60 * 60 * 1000);

    const gws = await db.gameweek.findMany({
      where: { deadline: { lte: now, gte: since } },
      select: { id: true, number: true, seasonId: true, graded: true },
      orderBy: [{ seasonId: "asc" }, { number: "asc" }],
    });

    const out: any[] = [];

    for (const gw of gws) {
      const exists = await db.rumbleReport.findUnique({
        where: { seasonId_gwNumber: { seasonId: gw.seasonId, gwNumber: gw.number } },
        select: { seasonId: true },
      });
      if (exists) { out.push({ seasonId: gw.seasonId, gw: gw.number, already: true }); continue; }

      // === A: club pie
      const clubCounts = await db.pick.groupBy({
        by: ["clubId"],
        where: { seasonId: gw.seasonId, gwId: gw.id },
        _count: { clubId: true },
      });
      const clubs = clubCounts.length
        ? await db.club.findMany({
            where: { id: { in: clubCounts.map(c => c.clubId) } },
            select: { id: true, shortName: true, name: true },
          })
        : [];
      const cMap = new Map(clubs.map(c => [c.id, c]));
      const clubLabels = clubCounts.map(c => cMap.get(c.clubId)?.shortName ?? cMap.get(c.clubId)?.name ?? c.clubId);
      const clubData = clubCounts.map(c => c._count.clubId);
      const clubPieUrl = quickChartUrl(`Picks by club — GW ${gw.number}`, clubLabels, clubData);

      // === B: user vs proxy
      const srcCounts = await db.pick.groupBy({
        by: ["source"],
        where: { seasonId: gw.seasonId, gwId: gw.id },
        _count: { source: true },
      });
      const bySrc: Record<string, number> = {};
      for (const row of srcCounts) bySrc[(row.source || "").toUpperCase()] = row._count.source;
      const sourcePieUrl = quickChartUrl(
        `Manual vs Proxy — GW ${gw.number}`,
        ["Manual", "Proxy"],
        [bySrc["USER"] ?? 0, bySrc["PROXY"] ?? 0]
      );

      // === C: eliminated
      let eliminatedSvg: string | undefined;
      if (gw.graded) {
        const eliminatedStates = await db.rumbleState.findMany({
          where: { seasonId: gw.seasonId, eliminatedAtGw: gw.number },
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
        eliminatedSvg = eliminationSVG({ seasonId: gw.seasonId, gwNumber: gw.number, names });
      }

      const payload: any = { clubPieUrl, sourcePieUrl };
      if (eliminatedSvg) payload.eliminatedSvg = eliminatedSvg;

      await db.rumbleReport.upsert({
        where: { seasonId_gwNumber: { seasonId: gw.seasonId, gwNumber: gw.number } },
        create: { seasonId: gw.seasonId, gwNumber: gw.number, payload },
        update: { payload },
      });

      out.push({ seasonId: gw.seasonId, gw: gw.number, created: true });
    }

    return NextResponse.json({ ok: true, gws: out }, { status: 200 });
  } catch (err: any) {
    const msg = err?.message === "Unauthorized" ? "Unauthorized" : (err?.message || "Internal error");
    return NextResponse.json({ ok: false, error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
