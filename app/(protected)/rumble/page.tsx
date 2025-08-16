"use client";

import useSWR, { mutate } from "swr";
import { useMemo, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RumblePlayPage() {
  const { data: resp, isLoading, error } = useSWR("/api/rumble/current", fetcher, { revalidateOnFocus: false });
  const data = resp?.data;
  const [selected, setSelected] = useState<string | null>(null);

  const deadlineDate: Date | null = useMemo(
    () => (data?.deadline ? new Date(data.deadline) : null),
    [data?.deadline]
  );
  const deadlinePassed = useMemo(
    () => (deadlineDate ? Date.now() > deadlineDate.getTime() : false),
    [deadlineDate]
  );

  const submitDisabled = !selected || deadlinePassed;

  async function handleSubmit() {
    if (!selected) return;
    const r = await fetch("/api/rumble/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId: selected }),
    });
    if (r.ok) {
      setSelected(null);
      await mutate("/api/rumble/current"); // refresh data (pickedClubId, usedClubIds)
    } else {
      const j = await r.json().catch(() => ({}));
      alert(j?.error || "Failed to submit pick");
    }
  }

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">Failed: {String(error)}</div>;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">
          {data?.gw ? `Gameweek ${data.gw.number} – Upcoming fixtures` : "Upcoming fixtures"}
        </h2>
        <div className="mt-2 text-sm opacity-70">
          Deadline (IST):{" "}
          {data?.deadline
            ? new Date(data.deadline).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "TBD"}
          {deadlinePassed && <span className="ml-2 text-red-600 font-medium">(Passed)</span>}
        </div>
      </div>

      {/* Fixtures Table */}
      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold">Fixture</th>
              <th className="px-4 py-3 font-semibold">Kickoff (IST)</th>
              <th className="px-4 py-3 font-semibold">Club 1 form (last 5)</th>
              <th className="px-4 py-3 font-semibold">Club 2 form (last 5)</th>
            </tr>
          </thead>
          <tbody>
            {data?.fixtures?.length
              ? data.fixtures.map((fx: any) => (
                  <tr key={fx.id} className="border-t">
                    <td className="px-4 py-3">
                      {fx.home.shortName ?? fx.home.name} vs {fx.away.shortName ?? fx.away.name}
                    </td>
                    <td className="px-4 py-3">
                      {fx.kickoff
                        ? new Date(fx.kickoff).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                        : "TBD"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {fx.home.form?.length ? fx.home.form.join("") : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {fx.away.form?.length ? fx.away.form.join("") : "—"}
                    </td>
                  </tr>
                ))
              : (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                    No fixtures yet
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      {/* Club Picker */}
      <div>
        <h3 className="text-2xl font-semibold mb-3">Pick your club</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {(data?.clubs ?? []).map((c: any) => {
            const used = (data?.usedClubIds ?? []).includes(c.id);
            const isCurrentPick = data?.pickedClubId === c.id;
            const disabled = deadlinePassed || used || isCurrentPick;

            return (
              <button
                key={c.id}
                disabled={disabled}
                onClick={() => setSelected(c.id)}
                className={[
                  "px-4 py-2 rounded border",
                  disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50",
                  selected === c.id ? "ring-2 ring-blue-500" : "",
                ].join(" ")}
                title={
                  used
                    ? "Already used in a previous GW"
                    : isCurrentPick
                    ? "You have already picked this club for this GW"
                    : ""
                }
              >
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className={[
              "px-4 py-2 rounded",
              submitDisabled ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-black text-white",
            ].join(" ")}
          >
            Submit
          </button>

          <div className="text-sm opacity-70">
            Deadline:{" "}
            {data?.deadline
              ? new Date(data.deadline).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
              : "TBD"}
          </div>
        </div>
      </div>
    </div>
  );
}
