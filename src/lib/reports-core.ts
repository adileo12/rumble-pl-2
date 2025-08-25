// src/lib/reports-core.ts
import { db } from "@/src/lib/db";
import { quickChartUrl } from "@/src/lib/quickchart";
import { eliminationSVG } from "@/src/lib/svg";

export type GeneratedPayload = {
  clubPieUrl: string;
  sourcePieUrl: string;
  eliminatedSvg?: string;
};

export async function generateGwReportCore(params: { seasonId: string; gwNumber: number }) {
  const seasonId = params.seasonId?.trim();
  const gwNumber = Number(params.gwNumber);
  if (!seasonId || Number.isNaN(gwNumber)) {
    throw new Error("seasonId and gwNumber required");
  }

  // Load GW & ensure deadline passed
  const gw = await db.gameweek.findUnique({
    where: { seasonId_number: { seasonId, number: gwNumber } },
    select: { id: true, number: true, deadline: true, graded: true },
  });
  if (!gw) throw new Error("Gameweek not found");
  if (gw.deadline > new Date()) throw new Error("Deadline has not passed");

  // Picks by club
  const clubCounts = await db.pick.groupBy({
    by: ["clubId"],
    where: { seasonId, gwId: gw.id },
    _count: { clubId: true },
  });
  const clubIds = clubCounts.map((r) => r.clubId);
  const clubs = clubIds.length
    ? await db.club.findMany({
        where: { id: { in: clubIds } },
        select: { id: true, shortName: true, name: true },
      })
    : [];
  const clubMeta = new Map(clubs.map((c) => [c.id, c]));
  const clubLabels = clubCounts.map((r) => {
    const c = clubMeta.get(r.clubId);
    return c?.shortName ?? c?.name ?? r.clubId;
  });
  const clubData = clubCounts.map((r) => r._count.clubId);
  const clubPieUrl = quickChartUrl(`Picks by club — GW ${gwNumber}`, clubLabels, clubData);

  // Manual vs Proxy
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
  const sourcePieUrl = quickChartUrl(
    `Manual vs Proxy — GW ${gwNumber}`,
    ["Manual", "Proxy"],
    [sourceMap["USER"] ?? 0, sourceMap["PROXY"] ?? 0]
  );

  // Eliminations (only if graded)
  let eliminatedSvg: string | undefined;
  if (gw.graded) {
    const eliminatedStates = await db.rumbleState.findMany({
      where: { seasonId, eliminatedAtGw: gwNumber },
      select: { userId: true },
      orderBy: { userId: "asc" },
    });
    const userIds = eliminatedStates.map((e) => e.userId);
    const users = userIds.length
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userMeta = new Map(users.map((u) => [u.id, u]));
    const names = userIds.map((id) => {
      const u = userMeta.get(id);
      const emailPrefix = u?.email ? u.email.split("@")[0] : "";
      return u?.name?.trim() || emailPrefix || "Unknown";
    });
    eliminatedSvg = eliminationSVG({ seasonId, gwNumber, names });
  }

  const payload: GeneratedPayload = { clubPieUrl, sourcePieUrl, ...(eliminatedSvg ? { eliminatedSvg } : {}) };

  // Save (idempotent)
  await db.rumbleReport.upsert({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
    create: { seasonId, gwNumber, payload },
    update: { payload },
  });

  return { ok: true as const, seasonId, gwNumber, payload };
}

export async function sweepMissingReportsCore() {
  const now = new Date();

  // Find GWs whose deadlines have passed
  const gws = await db.gameweek.findMany({
    where: { deadline: { lt: now } },
    select: { seasonId: true, number: true },
    orderBy: [{ seasonId: "asc" }, { number: "asc" }],
  });

  let generated = 0;
  for (const gw of gws) {
    const exists = await db.rumbleReport.findUnique({
      where: { seasonId_gwNumber: { seasonId: gw.seasonId, gwNumber: gw.number } },
      select: { seasonId: true },
    });
    if (exists) continue;

    try {
      await generateGwReportCore({ seasonId: gw.seasonId, gwNumber: gw.number });
      generated++;
    } catch {
      // ignore failing GWs in sweep
    }
  }
  return { ok: true as const, generated };
}
