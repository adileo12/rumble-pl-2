import { notFound } from "next/navigation";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClubRow = { clubShort: string; count: number };
type SourceRow = { source: "manual" | "proxy"; count: number };

export default async function PublicReportView({
  params,
}: { params: { seasonId: string; gwNumber: string } }) {
  const seasonId = decodeURIComponent(params.seasonId);
  const gwNumber = Number(params.gwNumber);
  if (!seasonId || Number.isNaN(gwNumber)) notFound();

  const rep = await db.rumbleReport.findUnique({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
    select: { payload: true, seasonId: true, gwNumber: true, updatedAt: true },
  });
  if (!rep) notFound();

  const payload = rep.payload as any;
  const clubPieUrl = payload?.clubPieUrl as string | undefined;
  const sourcePieUrl = payload?.sourcePieUrl as string | undefined;
  const eliminatedSvg = payload?.eliminatedSvg as string | undefined;

  // Derive counts on the fly
  const picks = await db.rumblePick.findMany({
    where: { seasonId, gwNumber },
    select: {
      submissionSource: true,
      clubId: true,
      club: { select: { short: true, name: true } },
    },
  });

  const clubMap = new Map<string, number>();
  for (const pk of picks) {
    const short = pk.club?.short ?? (pk as any).clubShort ?? pk.clubId;
    clubMap.set(short, (clubMap.get(short) ?? 0) + 1);
  }
  const clubCounts: ClubRow[] = [...clubMap.entries()]
    .map(([clubShort, count]) => ({ clubShort, count }))
    .sort((a, b) => b.count - a.count);

  const srcMap = new Map<"manual" | "proxy", number>();
  for (const pk of picks) {
    const key = pk.submissionSource === "proxy" ? "proxy" : "manual";
    srcMap.set(key, (srcMap.get(key) ?? 0) + 1);
  }
  const sourceCounts: SourceRow[] = [...srcMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const totalPicks = picks.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{rep.seasonId} — GW {rep.gwNumber}</h1>
        <p className="text-sm text-slate-600">Last updated {rep.updatedAt.toISOString()}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">Picks by Club</h2>
          {clubPieUrl ? (
            <>
              <img src={clubPieUrl} alt="Picks by Club" className="w-full h-auto mb-3" />
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-1">Club</th>
                    <th className="py-1 text-right">Count</th>
                    <th className="py-1 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {clubCounts.map(({ clubShort, count }) => (
                    <tr key={clubShort} className="border-b last:border-b-0">
                      <td className="py-1">{clubShort}</td>
                      <td className="py-1 text-right">{count}</td>
                      <td className="py-1 text-right">
                        {totalPicks ? ((count * 100) / totalPicks).toFixed(1) + "%" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>No data.</p>
          )}
        </div>

        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">Manual vs Proxy</h2>
          {sourcePieUrl ? (
            <>
              <img src={sourcePieUrl} alt="Manual vs Proxy" className="w-full h-auto mb-3" />
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-1">Source</th>
                    <th className="py-1 text-right">Count</th>
                    <th className="py-1 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceCounts.map(({ source, count }) => (
                    <tr key={source} className="border-b last:border-b-0">
                      <td className="py-1">{source === "proxy" ? "Proxy" : "Manual"}</td>
                      <td className="py-1 text-right">{count}</td>
                      <td className="py-1 text-right">
                        {totalPicks ? ((count * 100) / totalPicks).toFixed(1) + "%" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>No data.</p>
          )}
        </div>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-medium mb-2">Eliminations</h2>
        {eliminatedSvg ? (
          <div dangerouslySetInnerHTML={{ __html: eliminatedSvg }} />
        ) : (
          <p>Eliminations appear once this gameweek is graded.</p>
        )}
      </div>
    </div>
  );
}
