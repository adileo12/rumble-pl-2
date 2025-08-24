"use client";

import React, { useId, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "./actions";
import { generateGwReportAction, sweepMissingReportsAction } from "./actions";

function RunBtn({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
    >
      {pending ? "Working…" : children}
    </button>
  );
}

export function GwForm({ seasons }: { seasons: string[] }) {
  const [state, action] = useFormState<ActionState>(generateGwReportAction, {
    ok: false,
    message: "",
  });

  const [gw, setGw] = useState<number>(1);
  const selId = useId();
  const gwId = useId();

  return (
    <form action={action} className="space-y-3 border rounded p-4">
      <h3 className="text-lg font-medium">Generate Gameweek Report</h3>

      <div className="flex gap-3">
        <label htmlFor={selId} className="sr-only">Season</label>
        <select id={selId} name="seasonId" className="border rounded px-3 py-2 min-w-[420px]">
          {seasons.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label htmlFor={gwId} className="sr-only">GW #</label>
        <input
          id={gwId}
          name="gwNumber"
          type="number"
          min={1}
          value={gw}
          onChange={(e) => setGw(Math.max(1, Number(e.target.value || "1")))}
          className="border rounded px-3 py-2 w-28"
        />
      </div>

      <RunBtn>Run</RunBtn>

      {state.message ? (
        <div className={`text-sm ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>
          {state.message}
        </div>
      ) : null}
      <p className="text-xs text-gray-500">Calls <code>/api/admin/reports/gw/generate</code> with server secret.</p>
    </form>
  );
}

export function SweepForm({ secretConfigured }: { secretConfigured: boolean }) {
  const [state, action] = useFormState<ActionState>(sweepMissingReportsAction, {
    ok: false,
    message: "",
  });

  return (
    <form action={action} className="space-y-3 border rounded p-4">
      <h3 className="text-lg font-medium">Generate Missing Reports</h3>
      <p className="text-sm text-gray-600">
        Sweeps gameweeks in the last ~36h and creates any missing reports.
      </p>
      {!secretConfigured && (
        <p className="text-xs text-amber-600">
          Tip: set <code>CRON_SECRET</code> in Vercel so this can run in prod.
        </p>
      )}
      <RunBtn>Sweep Now</RunBtn>

      {state.message ? (
        <div className={`text-sm ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>
          {state.message}
        </div>
      ) : null}
    </form>
  );
}
