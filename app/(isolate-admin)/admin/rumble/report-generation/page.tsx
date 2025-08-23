export const dynamic = "force-dynamic";
export const revalidate = 0;

import React from "react";
import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// Build an absolute origin reliably in server actions
function getOrigin() {
  // Prefer env if you’ve set it
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/+$/, "");

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) throw new Error("Unable to determine request host for internal fetch");
  return `${proto}://${host}`;
}

// ----- server actions -----
async function generateGwReport(formData: FormData) {
  "use server";
  const seasonId = String(formData.get("seasonId") ?? "").trim();
  const gwNumber = Number(formData.get("gwNumber") ?? NaN);
  if (!seasonId || Number.isNaN(gwNumber)) {
    throw new Error("seasonId and gwNumber are required");
  }

  const origin = getOrigin();
  const res = await fetch(`${origin}/api/admin/reports/gw/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
    },
    body: JSON.stringify({ seasonId, gwNumber }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Surface exact failure reason instead of a generic digest
    throw new Error(`GW generate failed (${res.status}) -> ${text || "no body"}`);
  }

  revalidatePath("/admin/rumble/report-generation");
}

async function generateMissing() {
  "use server";
  const origin = getOrigin();
  const res = await fetch(`${origin}/api/admin/reports/generate`, {
    method: "GET",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sweep failed (${res.status}) -> ${text || "no body"}`);
  }

  revalidatePath("/admin/rumble/report-generation");
}

// ----- data -----
async function getSeasons() {
  const rows = await db.season.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => r.id);
}

export default async function Page() {
  const seasons = await getSeasons();
  const defaultSeasonId = seasons[0] ?? "";

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Report Generation</h1>

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
              />
            </div>
          </div>

          <div className="mt-4">
            <button className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">Run</button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Calls <code>/api/admin/reports/gw/generate</code> with server secret.
          </p>
        </form>

        {/* Sweep */}
        <form action={generateMissing} className="rounded-2xl border p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-medium">Generate Missing Reports</h2>
          <p className="text-sm text-gray-600">Sweeps gameweeks (last ~36h) and creates any missing reports.</p>
          <div className="mt-4">
            <butt
