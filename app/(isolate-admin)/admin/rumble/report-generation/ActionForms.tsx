"use client";

import React from "react";
import type { ActionState } from "./actions";
import { generateGwReport, sweepMissingReports } from "./actions";

export function GwForm({ seasons }: { seasons: string[] }) {
  const [seasonId, setSeasonId] = React.useState(seasons[0] ?? "");
  const [gwNumber, setGwNumber] = React.useState<number | "">("");
  const [state, setState] = React.useState<ActionState>({ ok: false, message: "" });
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      const res = await generateGwReport({
        seasonId,
        gwNumber: typeof gwNumber === "string" ? Number(gwNumber) : gwNumber,
      });
      setState(res);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h2 className="text-xl font-semibold">Generate GW Report</h2>

      <label className="block">
        <span className="text-sm">Season</span>
        <select
          name="seasonId"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          className="border rounded p-2 w-full"
          required
        >
          {seasons.map((s) => (
            <option key={s} value={s}>{s}</option>
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
          value={gwNumber}
          onChange={(e) => setGwNumber(e.target.value === "" ? "" : Number(e.target.value))}
          className="border rounded p-2 w-full"
          required
        />
      </label>

      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Working..." : "Run now"}
      </button>

      {state.message && (
        <p className={state.ok ? "text-green-600" : "text-red-600"}>{state.message}</p>
      )}
    </form>
  );
}

export function SweepForm() {
  const [state, setState] = React.useState<ActionState>({ ok: false, message: "" });
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      const res = await sweepMissingReports();
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

export default function ActionForms({ seasons }: { seasons: string[] }) {
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
