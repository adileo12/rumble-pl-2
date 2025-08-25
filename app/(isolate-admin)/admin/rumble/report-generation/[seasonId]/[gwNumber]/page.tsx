import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function FileButton({
  href,
  filename,
  label,
}: {
  href: string;
  filename: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 px-3 py-1.5 border rounded hover:bg-slate-50 text-sm"
      download={filename}
    >
      ⬇ {label}
    </a>
  );
}

type ClubRow = { clubShort: string; count: number };
type SourceRow = { source: "manual" | "proxy"; count: number };

function aggregateCounts(picks: any[]) {
  const clubMap = new Map<string, number>();
  for (const pk of picks) {
    const short = pk?.club?.short ?? pk?.clubShort ?? pk?.clubId ?? "UNK";
    clubMap.set(short, (clubMap.get(short) ?? 0) + 1);
  }
  const clubCounts: ClubRow[] = [...clubMap.entries()]
    .map(([clubShort, count]) => ({ clubShort, count }))
    .sort((a, b) => b.count - a.count);

  const srcCount: Record<"manual" | "proxy", number> = { manual: 0, proxy: 0 };
  for (const pk of picks) {
    const key = pk?.submissionSource === "proxy" ? "proxy" : "manual";
    srcCount[key]++;
  }
  const sourceCounts: SourceRow[] = (Object.entries(srcCount) as [(
    | "manual"
    | "proxy"
  ), number][])
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return { clubCounts, sourceCounts, totalPicks: picks.length };
}

async function getCountsSafe(
  seasonId: string,
  gwNumber: number,
  payload: any
): Promise<{ clubCounts: ClubRow[]; sourceCounts: SourceRow[]; totalPicks: number }> {
  // 1) Prefer counts already saved in payload
  const pClub = payload?.clubCounts as ClubRow[] | undefined;
  const pSource = payload?.sourceCounts as SourceRow[] | undefined;
  const pTotal = payload?.totalPicks as number | undefined;
  if (pClub && pSource && typeof pTotal === "number") {
    return { clubCounts: pClub, sourceCounts: pSource, totalPicks: pTotal };
  }

  // 2) Fallback: query whichever Pick model exists; try a couple of select shapes
  const anyDb = db as any;
  const candidates = ["rumblePick", "pick", "picks", "RumblePick", "Pick"];

  for (const model of candidates) {
    if (!anyDb?.[model]?.findMany) continue;

    // Try with relation
    try {
      const picks = await anyDb[model].findMany({
        where: { seasonId, gwNumber },
        select: {
          submissionSource: true,
          clubShort: true,
          clubId: true,
          club: { select: { short: true } },
        },
      });
      return aggregateCounts(picks);
    } catch {
      // Try without relation
      try {
        const picks = await anyDb[model].findMany({
          where: { seasonId, gwNumber },
          select: {
            submissionSource: true,
            clubShort: true,
            clubId: true,
          },
        });
        return aggregateCounts(picks);
      } catch {
        // keep looping
      }
    }
  }

  // 3) Last resort
  return { clubCounts: [], sourceCounts: [], totalPicks: 0 };
}

export default async function ReportView({
  params,
}: {
  params: { seasonId: string; gwNumber: string };
}) {
  const seasonId = decodeURIComponent(params.seasonId);
  const gwNumber = parseInt(params.gwNumber, 10);
  if (!seasonId || Number.isNaN(gwNumber)) notFound();

  const report = await db.rumbleReport.findUnique({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
    select: { payload: true, seasonId: true, gwNumber: true, updatedAt: true },
  });
  if (!report) notFound();

  const payload = (report.payload as any) ?? {};
  const clubPieUrl = payload?.clubPieUrl as string | undefined;
  const sourcePieUrl = payload?.sourcePieUrl as string | undefined;
  const eliminatedSvg = payload?.eliminatedSvg as string | undefined;

  const { clubCounts, sourceCounts, totalPicks } = await getCountsSafe(
    seasonId,
    gwNumber,
    payload
  );

  // Admin-only download links (PNG for all three)
  const clubDl = clubPieUrl
    ? `/api/admin/reports/${encodeURIComponent(
        seasonId
      )}/${gwNumber}/download?type=club`
    : null;
  const sourceDl = sourcePieUrl
    ? `/api/admin/reports/${encodeURIComponent(
        seasonId
      )}/${gwNumber}/download?type=source`
    : null;
  const elimDl = eliminatedSvg
    ? `/api/admin/reports/${encodeURIComponent(
        seasonId
      )}/${gwNumber}/download?type=elims`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            GW {report.gwNumber} — {report.seasonId}
          </h1>
          <p className="text-sm text-slate-600">
            Last updated {report.updatedAt.toISOString()}
          </p>
        </div>
        <Link
          href="/admin/rumble/report-generation"
          className="text-sm underline"
        >
          ← Back
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Picks by Club */}
        <div className="border rounded p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium mb-2">Picks by Club</h2>
            {clubDl && (
              <FileButton
                href={clubDl}
                filename={`${seasonId}-GW${gwNumber}-picks-by-club.png`}
                label="Download PNG"
              />
            )}
          </div>

          {clubPieUrl ? (
            <>
              <img
                src={clubPieUrl}
                alt="Picks by Club"
                className="w-full h-auto mb-3"
              />
              <CountsTable
                rows={clubCounts.map(({ clubShort, count }) => ({
                  label: clubShort,
                  count,
                  pct: totalPicks ? (count * 100) / totalPicks : null,
                }))}
                total={totalPicks}
                leftHeader="Club"
              />
            </>
          ) : (
            <p>No data.</p>
          )}
        </div>

        {/* Manual vs Proxy */}
        <div className="border rounded p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium mb-2">Manual vs Proxy</h2>
            {sourceDl && (
              <FileButton
                href={sourceDl}
                filename={`${seasonId}-GW${gwNumber}-manual-vs-proxy.png`}
                label="Download PNG"
              />
            )}
          </div>

          {sourcePieUrl ? (
            <>
              <img
                src={sourcePieUrl}
                alt="Manual vs Proxy"
                className="w-full h-auto mb-3"
              />
              <CountsTable
                rows={sourceCounts.map(({ source, count }) => ({
                  label: source === "proxy" ? "Proxy" : "Manual",
                  count,
                  pct: totalPicks ? (count * 100) / totalPicks : null,
                }))}
                total={totalPicks}
                leftHeader="Source"
              />
            </>
          ) : (
            <p>No data.</p>
          )}
        </div>
      </div>

      {/* Eliminations */}
      <div className="border rounded p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium mb-2">Eliminations</h2>
        {elimDl && (
          <FileButton
            href={elimDl}
            filename={`${seasonId}-GW${gwNumber}-eliminations.png`}
            label="Download PNG"
          />
        )}
        </div>
        {eliminatedSvg ? (
          <div dangerouslySetInnerHTML={{ __html: eliminatedSvg }} />
        ) : (
          <p>Not available until this GW is graded.</p>
        )}
      </div>
    </div>
  );
}

function CountsTable({
  rows,
  total,
  leftHeader,
}: {
  rows: { label: string; count: number; pct: number | null }[];
  total: number;
  leftHeader: string;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b">
          <th className="py-1">{leftHeader}</th>
          <th className="py-1 text-right">Count</th>
          <th className="py-1 text-right">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, count, pct }) => (
          <tr key={label} className="border-b last:border-b-0">
            <td className="py-1">{label}</td>
            <td className="py-1 text-right">{count}</td>
            <td className="py-1 text-right">
              {pct != null ? pct.toFixed(1) + "%" : "—"}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td className="py-1 font-medium">Total</td>
          <td className="py-1 text-right font-medium">{total}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}
