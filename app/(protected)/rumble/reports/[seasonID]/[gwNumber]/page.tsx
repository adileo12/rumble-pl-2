import { notFound } from "next/navigation";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const eliminatedUrl = eliminatedSvg
    ? `data:image/svg+xml;utf8,${encodeURIComponent(eliminatedSvg)}`
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">
        {rep.seasonId} — GW {rep.gwNumber}
      </h1>
      <p className="text-sm text-slate-600">
        Last updated {rep.updatedAt.toISOString()}
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">Picks by Club</h2>
          {clubPieUrl ? (
            <img src={clubPieUrl} alt="Picks by Club" className="w-full h-auto" />
          ) : (
            <p>No data.</p>
          )}
        </div>

        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">Manual vs Proxy</h2>
          {sourcePieUrl ? (
            <img src={sourcePieUrl} alt="Manual vs Proxy" className="w-full h-auto" />
          ) : (
            <p>No data.</p>
          )}
        </div>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-medium mb-2">Eliminations</h2>
        {eliminatedUrl ? (
          <img src={eliminatedUrl} alt="Eliminations" className="max-w-full h-auto" />
        ) : (
          <p>
            Eliminations show up once this gameweek is fully graded. Check back later.
          </p>
        )}
      </div>
    </div>
  );
}
