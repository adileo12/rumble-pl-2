"use client";

import React from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "./actions";
import { generateGwReportAction, sweepMissingReportsAction } from "./actions";

function SubmitBtn({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" disabled={pending} type="submit">
      {pending ? "Working..." : children}
    </button>
  );
}

export function GwForm({ seasons }: { seasons: string[] }) {
  const [state, action] = useFormState<ActionState>(generateGwReportAction, {
    ok: false,
    message: "",
  });

  // default to first season if present
  const defaultSeasonId = seasons[0] ?? "";

  return (
    <form action={action} className="space-y-3">
      <h2 className="text-xl font-semibold">Generate GW Report</h2>

      <label className="block">
        <span className="text-sm">Season</span>
        <select
          name="seasonId"
          defaultValue={defaultSeasonId}
          className="border rounded p-2 w-full"
          required
        >
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm">GW Number</span>
        <input
          type="number"
          name="gwNumber"
          min={1}
          step={1}
          className="border rounded p-2 w-full"
          required
        />
      </label>

      <SubmitBtn>Run now</SubmitBtn>

      {state.message && (
        <p className={state.ok ? "text-green-600" : "text-red-600"}>{state.message}</p>
      )}
    </form>
  );
}

export function SweepForm() {
  const [state, setState] = React.useState<ActionState>({ ok: false, message: "" });
  const [pending, start] = (React as any).useTransition(); // no TS fuss

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      // IMPORTANT: server action takes ONE arg (prev state)
      const res = await sweepMissingReportsAction(state);
      setState(res);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h2 className="text-xl font-semibold">Sweep Missing Reports</h2>
      <button className="btn btn-secondary" disabled={pending} type="submit">
        {pending ? "Sweeping..." : "Sweep now"}
      </button>
      {state.message && (
        <p className={state.ok ? "text-green-600" : "text-red-600"}>{state.message}</p>
      )}
    </form>
  );
}

export default function ActionForms({
  seasons,
}: {
  seasons: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="p-4 border rounded-md">
        <GwForm seasons={seasons} />
      </div>
      <div className="p-4 border rounded-md">
        <SweepForm />
      </div>
    </div>
  );
}
