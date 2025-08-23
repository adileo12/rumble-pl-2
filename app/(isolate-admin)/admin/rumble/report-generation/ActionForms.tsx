"use client";

import React from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "./actions";
import {
  generateGwReportAction,
  sweepMissingReportsAction,
} from "./actions";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
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

  return (
    <form action={action} className="border rounded p-4 space-y-3">
      <h3 className="font-medium">Process Gameweek Results</h3>
      <div className="flex gap-2">
        <select
          name="seasonId"
          className="border rounded px-3 py-2 w-64"
          defaultValue={seasons[0] ?? ""}
          required
        >
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          name="gwNumber"
          type="number"
          min={1}
          step={1}
          placeholder="GW number"
          className="border rounded px-3 py-2 w-32"
          required
        />
      </div>
      <SubmitButton>Run</SubmitButton>

      {state.message && (
        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap">
          {state.message}
        </pre>
      )}
    </form>
  );
}

export function SweepForm() {
  const [state, action] = useFormState<ActionState>(sweepMissingReportsAction, {
    ok: false,
    message: "",
  });

  return (
    <form action={action} className="border rounded p-4 space-y-3">
      <h3 className="font-medium">Sweep Missing Reports</h3>
      <SubmitButton>Sweep Now</SubmitButton>

      {state.message && (
        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap">
          {state.message}
        </pre>
      )}
    </form>
  );
}
