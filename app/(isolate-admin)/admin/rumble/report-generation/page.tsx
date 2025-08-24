import ActionForms from "./ActionForms";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const seasons = (await db.season.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  })).map(s => s.id);

  const recent = await db.rumbleReport.findMany({
    select: { seasonId: true, gwNumber: true, updatedAt: true },
    orderBy: [{ updatedAt: "desc" }, { seasonId: "asc" }, { gwNumber: "desc" }],
    take: 12,
  });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Report Generation</h1>

      <ActionForms seasons={seasons} />

      <div className="border rounded p-4">
        <h2 className="font-medium mb-2">Recent reports</h2>
        <ul className="list-disc pl-5">
          {recent.map(r => (
            <li key={`${r.seasonId}-${r.gwNumber}`}>
              <a className="underline"
                 href={`/admin/rumble/report-generation/${encodeURIComponent(r.seasonId)}/${r.gwNumber}`}>
                {r.seasonId} — GW {r.gwNumber}
              </a>
              <span className="text-sm text-slate-500"> (updated {r.updatedAt.toISOString()})</span>
            </li>
          ))}
          {recent.length === 0 && <li>No reports yet.</li>}
        </ul>
      </div>
    </div>
  );
}
