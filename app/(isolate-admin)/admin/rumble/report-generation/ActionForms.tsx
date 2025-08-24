"use client";

import React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { generateGwReportAction, type ActionState } from "./actions";

function SubmitBtn({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="px-4 py-2 rounded bg-slate-800 text-white disabled:opacity-50"
      type="submit"
      disabled={pending}
    >
      {pending ? "Working..." : children}
    </button>
  );
}

export function GwForm({ seasons }: { seasons: string[] }) {
  const defaultSeason = seasons[0] ?? "";
  const [state, action] = useFormState<ActionState>(generateGwReportAction, {
    ok: false,
    message: "",
  });

  return (
    <form action={action} className="border rounded p-4 space-y-3 max-w-xl">
      <h3 className="font-medium">Process Gameweek Results</h3>
      <div className="flex gap-2">
        <select name="seasonId" defaultValue={defaultSeason} className="border rounded px-3 py-2">
          {seasons.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="number"
          name="gwNumber"
          min={1}
          placeholder="GW"
          className="border rounded px-3 py-2 w-24"
          required
        />
        <SubmitBtn>Run</SubmitBtn>
      </div>
      {state.message && (
        <pre className={"text-sm " + (state.ok ? "text-green-700" : "text-red-700")}>
          {state.message}
        </pre>
      )}
    </form>
  );
}
