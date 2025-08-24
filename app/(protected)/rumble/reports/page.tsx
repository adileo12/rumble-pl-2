import Link from "next/link";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportsIndex() {
  // pull all available reports
  const reports = await db.rumbleReport.findMany({
    select: { seasonId: true, gwNumber: true, updatedAt: true },
    orderBy: [{ seasonId: "asc" }, { gwNumber: "asc" }],
  });

  // group by season
  const bySeason = new Map<string, { gw: number; updatedAt: Date }[]>();
  for (const r of reports) {
    if (!bySeason.has(r.seasonId)) bySeason.set(r.seasonId, []);
    bySeason.get(r.seasonId)!.push({ gw: r.gwNumber, updatedAt: r.updatedAt });
  }

  // choose a default: latest report if any
  const last = reports.at(-1);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Reports</h1>

      {reports.length === 0 ? (
        <p>No reports are available yet. Check back after the next deadline.</p>
      ) : (
        <>
          <div className="border rounded p-4">
            <h2 className="font-medium mb-3">Browse by Season</h2>
            <div className="space-y-6">
              {[...bySeason.entries()].map(([seasonId, items]) => (
                <div key={seasonId}>
                  <div className="font-medium mb-2">{seasonId}</div>
                  <div className="flex flex-wrap gap-2">
                    {items.map(({ gw }) => (
                      <Link
                        key={gw}
                        href={`/rumble/reports/${encodeURIComponent(seasonId)}/${gw}`}
                        className="px-3 py-1 border rounded hover:bg-slate-50"
                      >
                        GW {gw}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {last && (
            <div className="border rounded p-4">
              <div className="text-sm text-slate-600 mb-1">Quick link</div>
              <Link
                href={`/rumble/reports/${encodeURIComponent(last.seasonId)}/${last.gwNumber}`}
                className="underline"
              >
                View latest: {last.seasonId} — GW {last.gwNumber}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
