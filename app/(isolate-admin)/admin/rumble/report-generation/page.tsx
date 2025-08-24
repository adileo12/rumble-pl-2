import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportsIndexPage() {
  const rows = await db.rumbleReport.findMany({
    select: { seasonId: true, gwNumber: true },
    orderBy: [{ seasonId: "asc" }, { gwNumber: "desc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Reports</h1>
      {rows.length === 0 ? (
        <p>No reports yet.</p>
      ) : (
        <ul className="list-disc pl-5 space-y-1">
          {rows.map((r) => (
            <li key={`${r.seasonId}-${r.gwNumber}`}>
              <a
                className="text-blue-600 underline"
                href={`/admin/rumble/reports/${encodeURIComponent(r.seasonId)}/${r.gwNumber}`}
              >
                Season {r.seasonId} — GW {r.gwNumber}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
