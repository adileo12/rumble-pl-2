// app/(protected)/rumble/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Club = { id: string; name: string; shortName: string | null };
type Row = {
  id: string;
  kickoff: string;
  home: Club & { form: string[] };
  away: Club & { form: string[] };
};
type Payload = {
  ok: boolean;
  data?: {
    season: { id: string; name: string; year: number } | null;
    gw: { id: string; number: number; isLocked: boolean; deadline: string | null } | null;
    fixtures: Row[];
    clubs: Club[];
    deadline: string | null;
    pickedClubId: string | null;
    usedClubIds: string[];
  };
  error?: string;
};

function useCurrent() {
  const [state, setState] = useState<Payload>({ ok: false });
  useEffect(() => {
    fetch("/api/rumble/current")
      .then(r => r.json())
      .then(setState)
      .catch(() => setState({ ok: false, error: "Failed to load" }));
  }, []);
  return state;
}

export default function RumblePage() {
  const res = useCurrent();
  const data = res.data;
  const [selected, setSelected] = useState<string | null>(null);
  const deadlinePassed = useMemo(() => {
    if (!data?.deadline) return false;
    return Date.now() > new Date(data.deadline).getTime();
  }, [data?.deadline]);

  useEffect(() => {
    if (data?.pickedClubId) setSelected(data.pickedClubId);
  }, [data?.pickedClubId]);

  if (!res.ok || !data) {
    return <div className="p-6">Loading…</div>;
  }

  const used = new Set(data.usedClubIds); // clubs used in other GWs
  const canInteract = !deadlinePassed;

  async function submit() {
    if (!selected) return;
    const r = await fetch("/api/rumble/pick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clubId: selected }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j?.error || "Failed to save");
      return;
    }
    // Refresh state
    location.reload();
  }

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-8">
      {/* Fixtures table */}
      <section>
        <h2 className="text-xl font-semibold mb-3">
          Gameweek {data.gw?.number ?? "-"} – Upcoming fixtures
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border">Fixture</th>
                <th className="p-2 border">Kickoff</th>
                <th className="p-2 border">Club 1 form (last 5)</th>
                <th className="p-2 border">Club 2 form (last 5)</th>
              </tr>
            </thead>
            <tbody>
              {data.fixtures.map((f) => (
                <tr key={f.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border">{f.home.name} vs {f.away.name}</td>
                  <td className="p-2 border">
                    {new Date(f.kickoff).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="p-2 border">
                    {f.home.form.length ? f.home.form.join(" ") : "—"}
                  </td>
                  <td className="p-2 border">
                    {f.away.form.length ? f.away.form.join(" ") : "—"}
                  </td>
                </tr>
              ))}
              {!data.fixtures.length && (
                <tr><td className="p-3 text-center" colSpan={4}>No fixtures yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Club picker */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Pick your club</h2>
        <div className="flex flex-wrap gap-2">
          {data.clubs.map((c) => {
            const pickedBefore = used.has(c.id);
            const active = selected === c.id;
            const disabled = !canInteract || pickedBefore;
            return (
              <button
                key={c.id}
                onClick={() => !disabled && setSelected(c.id)}
                className={[
                  "px-3 py-2 rounded border text-sm",
                  active ? "bg-black text-white" : "bg-white",
                  disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100",
                ].join(" ")}
                disabled={disabled}
                title={pickedBefore ? "Already used this club in a previous week" : ""}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={submit}
            disabled={!canInteract || !selected}
            className={[
              "px-4 py-2 rounded text-sm",
              !canInteract || !selected
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-black text-white hover:opacity-90",
            ].join(" ")}
          >
            Submit
          </button>

          <div className="text-sm opacity-70">
            Deadline:&nbsp;
            {data.deadline
              ? new Date(data.deadline).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
              : "TBD"}
            {deadlinePassed && <span className="ml-2 text-red-600 font-medium">(Passed)</span>}
          </div>
        </div>

        {!!data.pickedClubId && (
          <div className="mt-2 text-xs opacity-70">
            Current selection: {data.clubs.find(c => c.id === data.pickedClubId)?.name ?? "—"}
            {canInteract ? " (you can change before the deadline)" : " (locked)"}
          </div>
        )}
      </section>
    </div>
  );
}
