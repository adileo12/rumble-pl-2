"use client";

import React from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "./types";

function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      disabled={disabled || pending}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

type AnyServerAction = (state: ActionState, formData: FormData) => ActionState | Promise<ActionState>;

export default function ActionForms(props: {
  seasons: string[];
  secretConfigured: boolean;
  generateGwReportAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  sweepMissingReportsAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const { seasons, secretConfigured, generateGwReportAction, sweepMissingReportsAction } = props;

  // ---- Type shim to satisfy older react-dom typings ----
  const gwActionTyped = generateGwReportAction as unknown as AnyServerAction;
  const sweepActionTyped = sweepMissingReportsAction as unknown as AnyServerAction;

  const [gwState, gwAction] = useFormState(gwActionTyped, { ok: false, message: "" });
  const [sweepState, sweepAction] = useFormState(sweepActionTyped, { ok: false, message: "" });

  const defaultSeason = seasons[0] ?? "";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {!secretConfigured && (
        <div className="lg:col-span-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">CRON_SECRET is not configured.</p>
          <p className="text-sm">
            Add <code>CRON_SECRET</code> in Vercel → Project → Settings → Environment Variables
            (Preview &amp; Production), then redeploy. Until then, actions will report an error.
          </p>
        </div>
      )}

      {/* Generate single GW */}
      <form action={gwAction} className="rounded-2xl border p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-medium">Generate Gameweek Report</h2>

        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-gray-600">Season</label>
            <select
              name="seasonId"
              defaultValue={defaultSeason}
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
          <SubmitButton disabled={!secretConfigured}>Run</SubmitButton>
        </div>

        {gwState.message && (
          <p className={`mt-3 text-sm ${gwState.ok ? "text-emerald-700" : "text-rose-600"}`}>
            {gwState.message}
          </p>
        )}

        <p className="mt-3 text-xs text-gray-500">
          Calls <code>/api/admin/reports/gw/generate</code> with server secret.
        </p>
      </form>

      {/* Sweep recent */}
      <form action={sweepAction} className="rounded-2xl border p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-medium">Generate Missing Reports</h2>
        <p className="text-sm text-gray-600">Sweeps gameweeks (last ~36h) and creates any missing reports.</p>
        <div className="mt-4">
          <SubmitButton disabled={!secretConfigured}>Sweep Now</SubmitButton>
        </div>

        {sweepState.message && (
          <p className={`mt-3 text-sm ${sweepState.ok ? "text-emerald-700" : "text-rose-600"}`}>
            {sweepState.message}
          </p>
        )}
      </form>
    </div>
  );
}
