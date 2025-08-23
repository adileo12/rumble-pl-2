// app/(isolate-admin)/admin/rumble/report-generation/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import React from "react";
import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";

// ---------- server actions ----------
async function generateGwReport(formData: FormData) {
  "use server";
  const seasonId = String(formData.get("seasonId") ?? "").trim();
  const gwNumber = Number(formData.get("gwNumber") ?? NaN);

  if (!seasonId || Number.isNaN(gwNumber)) {
    throw new Error("seasonId and gwNumber are required");
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/reports/gw/generate`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
      },
      body: JSON.stringify({ seasonId, gwNumber }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`GW generate failed (${res.status}): ${await res.text()}`);
  }

  revalidatePath("/admin/rumble/report-generation");
}

async function generateMissing() {
  "use server";
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/reports/generate`,
    {
      method: "GET",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`Sweep failed (${res.status}): ${await res.text()}`);
  }

  revalidatePath("/admin/rumble/report-generation");
}

// ---------- data ----------
async function getRecentReports() {
  const rows = await db.rumbleReport.findMany({
    take: 8,
    orderBy: [{ seasonId: "asc" }, { gwNumber: "desc" }],
    select: { seasonId: true, gwNumber: true, payload: true },
  });

  return rows.map((r) => {
    const p = (r.payload ?? {}) as any;
    return {
      seasonId: r.seasonId,
      gwNumber: r.gwNumber,
      clubPieUrl: p.clubPieUrl as string | undefined,
      sourcePieUrl: p.sourcePieUrl as string | undefined,
      hasElimSvg:
        typeof p.eliminatedSvg === "string" && p.eliminatedSvg.length > 0,
    };
  });
}

// ---------- page ----------
export default async function Page() {
  const reports = await getRecentReports();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Report Generation</h1>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Generate single GW */}
        <form action={generateGwReport} className="rounded-2xl border p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-medium">Generate Gameweek Report</h2>
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-600">Season ID</label>
              <input
                name="seasonId"
                placeholder="e.g. S25"
                className="w-full rounded-lg border px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">GW #</label>
              <input
                name="gwNumber"
                type="number"
                min={1}
                className="w-full rounded-lg border px-3 py-2"
                defaultValue={1}
                required
              />
            </div>
          </div>
          <div className="mt-4">
            <button className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
              Run
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Calls <code>/api/admin/reports/gw/generate</code> with a server-side secret.
          </p>
        </form>

        {/* Generate missing (sweep) */}
        <form action={generateMissing} className="rounded-2xl border p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-medium">Generate Missing Reports</h2>
          <p className="text-sm text-gray-600">
            Sweeps gameweeks with deadlines in the last ~36 hours and generates any missing reports.
          </p>
          <div className="mt-4">
            <button className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
              Sweep Now
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Calls <code>/api/admin/reports/generate</code> on the server.
          </p>
        </form>
      </div>

      {/* Recent reports */}
      <section>
        <h2 className="mb-4 text-xl font-medium">Recent Reports</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-600">No reports yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {reports.map((r) => (
              <div key={`${r.seasonId}-${r.gwNumber}`} className="rounded-2xl border p-4 shadow-sm">
                <div className="mb-2 text-sm text-gray-500">
                  Season <span className="font-medium">{r.seasonId}</span> · GW{" "}
                  <span className="font-medium">{r.gwNumber}</span>
                </div>

                {r.clubPieUrl && (
                  <img
                    src={r.clubPieUrl}
                    alt="Picks by club"
                    className="mb-3 w-full rounded-lg"
                  />
                )}

                {r.sourcePieUrl && (
                  <img
                    src={r.sourcePieUrl}
                    alt="Manual vs Proxy"
                    className="mb-3 w-full rounded-lg"
                  />
                )}

                {r.hasElimSvg && (
                  <img
                    src={`/reports/${r.seasonId}/${r.gwNumber}/eliminated`}
                    alt="Eliminated"
                    className="w-full rounded-lg"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
