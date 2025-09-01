// app/(protected)/rumble/reports/[seasonID]/[gwNumber]/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageParams = { params: { seasonID: string; gwNumber: string } };

function fmtDate(d?: Date | string | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Try to load a stored RumbleReport.
 * If none exists, compute a minimal live fallback from picks.
 */
async function fetchReportOrFallback(seasonId: string, gwNumber: number) {
  // 1) Try stored report first (no `select` so we tolerate schema differences)
  const stored = await db.rumbleReport.findFirst({
    where: { seasonId, gwNumber },
  });

  if (stored) {
    const anyPayload = (stored as any).payload ?? {};

    // Try to extract precomputed blobs if present; otherwise UI will still render safely.
    const anyStored = stored as any;
    const counts = anyStored.countsJson ?? anyPayload.counts ?? null;
    const bySource = anyStored.bySourceJson ?? anyPayload.bySource ?? null;

    return {
      source: "stored" as const,
      stored,
      fallback: null as null,
      counts,
      bySource,
    };
  }

  // 2) Fallback: compute from picks live
  const picks = await db.pick.findMany({
    where: { seasonId, gw: { number: gwNumber } },
    select: {
      clubId: true,
      source: true,
      club: { select: { shortName: true, name: true } },
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
    source: "fallback" as const,
    stored: null as null,
    fallback: {
      counts,
      bySource: { USER: userCount, PROXY: proxyCount },
      computedAt: new Date().toISOString(),
    },
    counts,
    bySource: { USER: userCount, PROXY: proxyCount },
  };
}

export default async function Page({ params }: PageParams) {
  const seasonId = decodeURIComponent(params?.seasonID ?? "");
  const gwNumber = Number.parseInt(params?.gwNumber ?? "", 10);

  if (!seasonId || !Number.isFinite(gwNumber)) {
    notFound();
  }

  const data = await fetchReportOrFallback(seasonId, gwNumber);

  const counts = data.counts ?? [];
  const bySource = data.bySource ?? { USER: 0, PROXY: 0 };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">GW {gwNumber} — Report</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border p-5 bg-white/70">
          <h2 className="font-semibold mb-2">Picks by Club</h2>
          { (data as any).clubPieUrl && (
            <img src={(data as any).clubPieUrl} alt="Picks by Club" className="w-full h-auto mb-3"/>
          )}
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

      {data.source === "stored" && data.stored ? (
        <p className="mt-6 text-sm text-slate-500">
          Report generated at: {fmtDate((data.stored as any).updatedAt)}
        </p>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          Live fallback (no stored report). Computed at: {fmtDate((data.fallback as any)?.computedAt)}
        </p>
      )}
    </div>
  );
}
