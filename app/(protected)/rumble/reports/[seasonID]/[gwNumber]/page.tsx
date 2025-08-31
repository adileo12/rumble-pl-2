// app/rumble/reports/[seasonId]/[gwNumber]/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type RouteParams = { params: { seasonId: string; gwNumber: string } };

export default async function ReportPage({ params }: RouteParams) {
  // Robust params
  const seasonId = decodeURIComponent(params.seasonId || "");
  const gwNumber = Number.parseInt(params.gwNumber || "", 10);

  if (!seasonId || !Number.isFinite(gwNumber)) {
    // Bad URL → 404 instead of server error
    notFound();
  }

  // Fetch the report safely; only select fields we actually render
  // If your schema uses a different model name, adjust `db.rumbleReport`.
  const report = await db.rumbleReport.findFirst({
    where: { seasonId, gwNumber },
    select: {
      seasonId: true,
      gwNumber: true,
      updatedAt: true,
      // OPTIONAL JSON-ish fields — these are guarded at runtime below.
      // Adjust names to match your schema (e.g., data, payload, summary, topPicks, eliminations, etc.)
      title: true,
      summary: true,
      payload: true as any, // tolerate absence; TS will see `any`
      data: true as any,
      json: true as any,
    },
  });

  if (!report) {
    // Friendly empty state instead of exception
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-2">Report not found</h1>
        <p className="text-slate-700">
          We couldn’t find a report for season <code className="px-1 py-0.5 bg-slate-100 rounded">{seasonId}</code> &nbsp;
          gameweek <strong>GW {gwNumber}</strong>. It may not have been generated yet.
        </p>
      </div>
    );
  }

  // Try to discover a data blob if your schema stores it.
  // We check a few common field names and fall back to nothing.
  const blob =
    (report as any).payload ??
    (report as any).data ??
    (report as any).json ??
    null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Rumble Report — GW {report.gwNumber}
        </h1>
        <div className="text-slate-600">
          Season: <span className="font-mono">{report.seasonId}</span> • Updated: {fmtDate(report.updatedAt)}
        </div>
        {report.title ? (
          <div className="mt-2 text-lg font-semibold">{report.title}</div>
        ) : null}
        {report.summary ? (
          <p className="mt-2 text-slate-700">{report.summary}</p>
        ) : null}
      </div>

      {/* Minimal, robust rendering. Add richer UI later once fields are confirmed */}
      {blob ? (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-2">Details</h2>
          <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
            {JSON.stringify(blob, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-4 text-slate-700">
          No structured details were attached to this report.
        </div>
      )}
    </div>
  );
}
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
