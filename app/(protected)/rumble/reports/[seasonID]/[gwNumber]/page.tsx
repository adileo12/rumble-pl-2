// app/(protected)/rumble/reports/[seasonID]/[gwNumber]/page.tsx
import React from "react";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageParams = { seasonID: string; gwNumber: string };

async function fetchReport(seasonId: string, gwNumber: number) {
  // Try prebuilt report first
  const report = await db.rumbleReport.findFirst({
    where: { seasonId, gwNumber },
    select: {
      seasonId: true,
      gwNumber: true,
      updatedAt: true,
      countsJson: true,
      bySourceJson: true,
      // Add any other fields your page uses (e.g., chart URLs)
    } as any,
  });

  if (report) return { report, fallback: null };

  // Fallback: compute from picks
  const picks = await db.pick.findMany({
    where: { seasonId, gw: { number: gwNumber } }, // <-- relation filter (fix)
    select: {
      clubId: true,
      source: true, // <-- correct field
      club: { select: { shortName: true, name: true } }, // <-- shortName not short
    },
  });

  const countsMap = new Map<string, number>();
  let userCount = 0;
  let proxyCount = 0;

  for (const p of picks) {
    const label = p.club?.shortName ?? p.club?.name ?? p.clubId;
    countsMap.set(label, (countsMap.get(label) ?? 0) + 1);
    if (p.source === "USER") userCount += 1;
    else if (p.source === "PROXY") proxyCount += 1;
  }

  const counts = Array.from(countsMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    report: null,
    fallback: {
      counts,
      bySource: { USER: userCount, PROXY: proxyCount },
      computedAt: new Date().toISOString(),
    },
  };
}

export default async function Page({ params }: { params: PageParams }) {
  const seasonId = params.seasonID;
  const gwNumber = Number(params.gwNumber);
  const data = await fetchReport(seasonId, gwNumber);

  const counts = data.report?.countsJson ?? data.fallback?.counts ?? [];
  const bySource = (data.report?.bySourceJson as any) ?? data.fallback?.bySource ?? { USER: 0, PROXY: 0 };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">GW {gwNumber} — Report</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border p-5 bg-white/70">
          <h2 className="font-semibold mb-2">Picks by Club</h2>
          {counts.length ? (
            <ul className="space-y-1">
              {counts.map((row: any) => (
                <li key={row.label} className="flex justify-between">
                  <span>{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-slate-600">No data.</div>
          )}
        </div>

        <div className="rounded-2xl border p-5 bg-white/70">
          <h2 className="font-semibold mb-2">Submissions by Source</h2>
          <ul className="space-y-1">
            <li className="flex justify-between">
              <span>User picks</span>
              <span className="font-semibold">{bySource.USER ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Proxy picks</span>
              <span className="font-semibold">{bySource.PROXY ?? 0}</span>
            </li>
          </ul>
        </div>
      </div>

      {data.report ? (
        <p className="mt-6 text-sm text-slate-500">
          Report generated at: {new Date(data.report.updatedAt as any).toLocaleString()}
        </p>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          Live fallback (no stored report). Computed at: {data.fallback?.computedAt}
        </p>
      )}
    </div>
  );
}
