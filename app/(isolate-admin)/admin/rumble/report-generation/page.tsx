import { notFound } from "next/navigation";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportPage({
  params,
}: {
  params: { seasonId: string; gwNumber: string };
}) {
  const seasonId = decodeURIComponent(params.seasonId);
  const gwNumber = Number(params.gwNumber);

  const report = await db.rumbleReport.findUnique({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
    select: { payload: true, seasonId: true, gwNumber: true },
  });

  if (!report) notFound();

  const payload = report.payload as any;
  const clubPieUrl = payload?.clubPieUrl as string | undefined;
  const sourcePieUrl = payload?.sourcePieUrl as string | undefined;
  const eliminatedSvg = payload?.eliminatedSvg as string | undefined;
  const svgDataUrl = eliminatedSvg
    ? `data:image/svg+xml;utf8,${encodeURIComponent(eliminatedSvg)}`
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">
        GW {report.gwNumber} — {report.seasonId}
      </h1>

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
        {svgDataUrl ? (
          <img src={svgDataUrl} alt="Eliminations" className="max-w-full h-auto" />
        ) : (
          <p>Not available until this GW is graded.</p>
        )}
      </div>
    </div>
  );
}
