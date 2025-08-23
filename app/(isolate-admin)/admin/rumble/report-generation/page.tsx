import React from "react";
import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Build an absolute origin from the current request (works on Vercel and locally)
function getOrigin(): string {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/+$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) throw new Error("Unable to determine request host");
  return `${proto}://${host}`;
}

/* ---------- Server Actions ---------- */

async function generateGwReport(formData: FormData) {
  "use server";
  const seasonId = String(formData.get("seasonId") ?? "").trim();
  const gwNumber = Number(formData.get("gwNumber") ?? NaN);
  const secret = process.env.CRON_SECRET ?? "";

  if (!secret) {
    console.error("CRON_SECRET is not set; refusing to call API");
    return;
  }
  if (!seasonId || Number.isNaN(gwNumber)) {
    console.error("seasonId and gwNumber are required");
    return;
  }

  try {
    const origin = getOrigin();
    const res = await fetch(`${origin}/api/admin/reports/gw/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ seasonId, gwNumber }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`GW generate failed (${res.status}) -> ${text}`);
      return;
    }
  } catch (e) {
    console.error("GW generate exception:", e);
    return;
  }

  revalidatePath("/admin/rumble/report-generation");
}

async function generateMissing() {
  "use server";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) {
    console.error("CRON_SECRET is not set; refusing to call API");
    return;
  }
  try {
    const origin = getOrigin();
    const res = await fetch(`${origin}/api/admin/reports/generate`, {
      method: "GET",
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Sweep failed (${res.status}) -> ${text}`);
      return;
    }
  } catch (e) {
    console.error("Sweep exception:", e);
    return;
  }
  revalidatePath("/admin/rumble/report-generation");
}

/* ---------- Data ---------- */

async function getSeasons(): Promise<string[]> {
  const rows = await db.season.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => r.id);
}

/* ---------- Page ---------- */

export default async function ReportGenerationPage() {
  const seasons = await getSeasons();
  const defaultSeasonId = seasons[0] ?? "";
  const secretConfigured = Boolean(process.env.CRON_SECRET);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Report Generation</h1>

      {!secretConfigured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">CRON_SECRET is not configured.</p>
          <p className="text-sm">
            Add <code>CRON_SECRET</code> in Vercel → Project → Settings → Environment Variables
            (Preview &amp; Production), then redeploy. Until then, the buttons below are disabled.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Generate single GW */}
        <form action={generateGwReport} className="rounded-2xl border p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-medium">Generate Gameweek Report</h2>

          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-600">Season</label>
              <select
                name="seasonId"
                defaultValue={defaultSeasonId}
                className="w-full rounded-lg border px-3 py-2"
                required
                disabled={!secretConfigured}
              >
                {seasons.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
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
                disabled={!secretConfigured}
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
              disabled={!secretConfigured}
            >
              Run
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Calls <code>/api/admin/reports/gw/generate</code> with server secret.
          </p>
        </form>

        {/* Sweep recent */}
        <form action={generateMissing} className="rounded-2xl border p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-medium">Generate Missing Reports</h2>
          <p className="text-sm text-gray-600">
            Sweeps gameweeks (last ~36h) and creates any missing reports.
          </p>
          <div className="mt-4">
            <button
              className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
              disabled={!secretConfigured}
            >
              Sweep Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
