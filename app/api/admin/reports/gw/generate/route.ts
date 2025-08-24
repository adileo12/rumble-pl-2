import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { quickChartUrl } from "@/src/lib/quickchart";
import { eliminationSVG } from "@/src/lib/svg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Prisma needs Node runtime

function assertCronAuth(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return; // allow local dev when not set
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) throw new Error("Unauthorized");
}

export async function POST(req: Request) {
  try {
    assertCronAuth(req);

    const { seasonId, gwNumber } = await req.json();
    if (!seasonId || typeof gwNumber !== "number") {
      return NextResponse.json({ ok: false, error: "seasonId and gwNumber required" }, { status: 400 });
    }

    // idempotent
    const existing = await db.rumbleReport.findUnique({
      where: { seasonId_gwNumber: { seasonId, gwNumber } },
      select: { seasonId: true },
    });
    if (existing) return NextResponse.json({ ok: true, already: true });

    const gw = await db.gameweek.findUnique({
      where: { seasonId_number: { seasonId, number: gwNumber } },
      select: { id: true, number: true, deadline: true, graded: true },
    });
    if (!gw) return NextResponse.json({ ok: false, error: "Gameweek not found" }, { status: 404 });
    if (gw.deadline > new Date()) {
      return NextResponse.json({ ok: false, error: "Deadline has not passed" }, { status: 409 });
    }

    // A) Picks by club (pie)
    const clubCounts = await db.pick.groupBy({
      by: ["clubId"],
      where: { seasonId, gwId: gw.id },
      _count: { clubId: true },
    });
    const clubIds = clubCounts.map(r => r.clubId);
    const clubs = clubIds.length
      ? await db.club.findMany({ where: { id: { in: clubIds } }, select: { id: true, shortName: true, name: true } })
      : [];
    const clubMeta = new Map(clubs.map(c => [c.id, c]));
    const clubLabels = clubCounts.map(r => {
      const c = clubMeta.get(r.clubId);
      return c?.shortName ?? c?.name ?? r.clubId;
    });
    const clubData = clubCounts.map(r => r._count.clubId);
    const clubPieUrl = quickChartUrl(`Picks by club — GW ${gwNumber}`, clubLabels, clubData);

    // B) Manual vs Proxy (pie)
    const sourceCounts = await db.pick.groupBy({
      by: ["source"], // 'USER' | 'PROXY'
      where: { seasonId, gwId: gw.id },
      _count: { source: true },
    });
    const bySrc = Object.fromEntries(sourceCounts.map(r => [(r.source || "").toUpperCase(), r._count.source]));
    const sourcePieUrl = quickChartUrl(
      `Manual vs Proxy — GW ${gwNumber}`,
      ["Manual", "Proxy"],
      [bySrc.USER ?? 0, bySrc.PROXY ?? 0]
    );

    // C) Eliminations (if graded)
    let eliminatedSvg: string | null = null;
    if (gw.graded) {
      const eliminated = await db.rumbleState.findMany({
        where: { seasonId, eliminatedAtGw: gwNumber },
        select: { userId: true },
        orderBy: { userId: "asc" },
      });
      const ids = eliminated.map(e => e.userId);
      const users = ids.length
        ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
        : [];
      const umap = new Map(users.map(u => [u.id, u]));
      const names = ids.map(id => {
        const u = umap.get(id);
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

    return NextResponse.json({ ok: true, ...payload }, { status: 200 });
  } catch (e: any) {
    const msg = e?.message || "Internal error";
    return NextResponse.json({ ok: false, error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
