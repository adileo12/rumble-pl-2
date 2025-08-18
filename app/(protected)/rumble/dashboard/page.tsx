"use client";

import React, { useEffect, useState } from "react";

type Row = {
  pickId: string;
  gwNumber: number;
  pickedClub: { id: string; name: string; shortName: string };
  kickoff: string | null;
  score: string | null;
  opponent: { side: "H" | "A"; id: string; name: string; shortName: string } | null;
  resultCode: "W" | "D" | "L" | "TBD";
  resultVerb: "won" | "drew" | "lost" | "TBD";
};

export default function RumbleDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/rumble/history", { cache: "no-store" });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || "Failed to load");
        setRows(j.items as Row[]);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Your Rumble picks</h2>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold">GW</th>
              <th className="px-4 py-3 font-semibold">Pick</th>
              <th className="px-4 py-3 font-semibold">Opponent</th>
              <th className="px-4 py-3 font-semibold">Kickoff (IST)</th>
              <th className="px-4 py-3 font-semibold">Score/Status</th>
              <th className="px-4 py-3 font-semibold">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => {
                const opp =
                  r.opponent
                    ? `${r.opponent.shortName} (${r.opponent.side})`
                    : "—";
                const ko = r.kickoff
                  ? new Date(r.kickoff).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })
                  : "—";
                const resultBadge: Record<Row["resultCode"], string> = {
                  W: "bg-green-100 text-green-800",
                  D: "bg-yellow-100 text-yellow-800",
                  L: "bg-red-100 text-red-800",
                  TBD: "bg-gray-100 text-gray-700",
                };
                const resultText =
                  r.resultCode === "TBD"
                    ? "TBD"
                    : `${r.pickedClub.shortName} ${r.resultVerb}`;

                return (
                  <tr key={r.pickId} className="border-t">
                    <td className="px-4 py-3">{r.gwNumber}</td>
                    <td className="px-4 py-3">{r.pickedClub.name}</td>
                    <td className="px-4 py-3">{opp}</td>
                    <td className="px-4 py-3">{ko}</td>
                    <td className="px-4 py-3">{r.score ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${resultBadge[r.resultCode]}`}>
                        {resultText}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No picks yet. Make a pick on the Play tab!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

     <div className="text-xs text-gray-500 space-y-1">
  <div className="font-medium">Legend</div>
  <ul className="list-disc ml-5 space-y-0.5">
    <li><span className="font-semibold">NS</span> — Not Started</li>
    <li><span className="font-semibold">LIVE</span> — In Play</li>
    <li><span className="font-semibold">FT</span> — Full Time</li>
    <li><span className="font-semibold">PST</span> — Postponed</li>
    <li><span className="font-semibold">TBC</span> — To Be Confirmed</li>
    <li><span className="font-semibold">TBD</span> — Result pending / fixture not complete</li>
  </ul>
</div>
    </div>
  );
}
