// src/lib/reports-core.ts
import { db } from "@/src/lib/db";
import { quickChartUrl } from "@/src/lib/quickchart";
import { eliminationSVG } from "@/src/lib/svg";

export type GeneratedPayload = {
  clubPieUrl: string;
  // legacy/admin fields (used by admin GW page tables)
  clubCounts?: { clubShort: string; count: number }[];
  sourceCounts?: { source: "manual" | "proxy"; count: number }[];
  totalPicks?: number;
  // players page fields
  sourcePieUrl: string;
  counts: { label: string; value: number }[];
  bySource: { USER: number; PROXY: number };
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

  // --- Picks by club (grouped) ---
  const clubCounts = await db.pick.groupBy({
    by: ["clubId"],
    where: { seasonId, gwId: gw.id },
    _count: { clubId: true },
  });

  // Resolve display labels from Club metadata (shortName > name > id)
  const clubIds = clubCounts.map((r) => r.clubId);
  const clubs = clubIds.length
    ? await db.club.findMany({
        where: { id: { in: clubIds } },
        select: { id: true, shortName: true, name: true },
      })
    : [];
  const clubShortById = new Map<string, string>(
    clubs.map((c) => [c.id, (c.shortName ?? c.name ?? "").toString()])
  );

  const clubLabels = clubCounts.map((r) => clubShortById.get(r.clubId) ?? r.clubId);
  const clubData = clubCounts.map((r) => r._count.clubId);
  const clubPieUrl = quickChartUrl(`Picks by club — GW ${gwNumber}`, clubLabels, clubData);

  // --- Manual vs Proxy ---
  const sourceCountsRaw = await db.pick.groupBy({
    by: ["source"], // "USER" | "PROXY"
    where: { seasonId, gwId: gw.id },
    _count: { source: true },
  });
  const sourceMap: Record<"USER" | "PROXY", number> = { USER: 0, PROXY: 0 };
  for (const r of sourceCountsRaw as any[]) {
    const key = ((r?.source ?? "") as string).toUpperCase();
    if (key === "USER" || key === "PROXY") sourceMap[key] = r._count.source;
  }
  const sourceLabels = ["Manual", "Proxy"];
  const sourceData = [sourceMap.USER ?? 0, sourceMap.PROXY ?? 0];
  const sourcePieUrl = quickChartUrl(`Manual vs Proxy — GW ${gwNumber}`, sourceLabels, sourceData);

  // --- Eliminations (only if graded) ---
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
      return (u?.name?.trim() || emailPrefix || "Unknown") as string;
    });
    eliminatedSvg = eliminationSVG({ seasonId, gwNumber, names });
  }

  // --- Admin-compatible arrays (legacy shape) ---
  const legacyClubCounts = clubCounts
    .map((r) => ({
      clubShort: clubShortById.get(r.clubId) ?? "UNK",
      count: r._count.clubId,
    }))
    .sort((a, b) => b.count - a.count);

  const legacySourceCounts = [
    { source: "manual" as const, count: sourceMap.USER ?? 0 },
    { source: "proxy" as const, count: sourceMap.PROXY ?? 0 },
  ];

  const legacyTotal = clubData.reduce((a, b) => a + b, 0);

  // --- Players page shape ---
  const counts = clubCounts.map((r) => ({
    label: clubShortById.get(r.clubId) ?? "UNK",
    value: r._count.clubId,
  }));
  const bySource = { USER: sourceMap.USER ?? 0, PROXY: sourceMap.PROXY ?? 0 };

  // --- Final payload (stores both formats) ---
  const payload: GeneratedPayload = {
    clubPieUrl,
    sourcePieUrl,
    counts,
    bySource,
    clubCounts: legacyClubCounts,
    sourceCounts: legacySourceCounts,
    totalPicks: legacyTotal,
    ...(eliminatedSvg ? { eliminatedSvg } : {}),
  };

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
