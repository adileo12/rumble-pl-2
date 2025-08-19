"use client";

import React, { useEffect, useState } from "react";

/* ---------- types ---------- */
type HistoryRow = {
  gwNumber: number;
  clubId: string;
  clubShort: string;
  clubName: string;
  opponentShort: string | null; // e.g., "NEW"
  venue: "H" | "A" | "-";
  kickoffISO: string | null;
  scoreOrStatus: string; // "NS", "LIVE", "FT", "1-0", etc.
  resultCode?: "W" | "L" | "D" | "TBD";
  resultVerb?: "won" | "lost" | "drew" | "TBD";
};

type HistoryResponse = {
  ok: boolean;
  rows?: HistoryRow[];
  error?: string;
};

type LifelineResponse = {
  ok: boolean;
  state?: {
    proxiesUsed: number;
    lazarusUsed: boolean;
    eliminatedAtGw: number | null;
    eliminatedAt: string | null;
  };
  canUseLazarus?: boolean;
  windowClosesAt?: string | null;
  proxiesRemaining?: number;
  error?: string;
};

/* ---------- utils ---------- */
function fmtKickoff(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      hour12: true,
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: undefined,
    });
  } catch {
    return "—";
  }
}

/* ---------- hooks ---------- */
function useHistory() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rumble/history", { cache: "no-store" });
      const json = (await res.json()) as HistoryResponse;
      setData(json);
    } catch {
      setData({ ok: false, error: "Failed to load history" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);
  return { data, loading, reload: load };
}

function useLifelines() {
  const [lifelines, setLifelines] = useState<LifelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rumble/state", { cache: "no-store" });
      const json = (await res.json()) as LifelineResponse;
      setLifelines(json);
    } catch {
      setLifelines({ ok: false, error: "Failed to load lifelines" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);
  return { lifelines, loading, reload: load };
}

/* ---------- subcomponents ---------- */
function PicksTable() {
  const { data, loading } = useHistory();

  return (
    <section className="mt-6">
      <h2 className="text-2xl font-semibold mb-6">Your Rumble picks</h2>

      {loading ? (
        <div className="text-sm text-gray-500">Loading picks…</div>
      ) : !data?.ok ? (
        <div className="text-sm text-red-600">
          {data?.error ?? "Could not load picks."}
        </div>
      ) : (data.rows?.length ?? 0) === 0 ? (
        <div className="text-sm text-gray-500">No picks yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">GW</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Pick</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Opponent</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Kickoff (IST)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Score/Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {data!.rows!.map((r) => (
                <tr key={`${r.gwNumber}-${r.clubId}`}>
                  <td className="px-4 py-3 text-sm">{r.gwNumber}</td>
                  <td className="px-4 py-3 text-sm">{r.clubName}</td>
                  <td className="px-4 py-3 text-sm">
                    {r.opponentShort ? `${r.opponentShort} (${r.venue})` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">{fmtKickoff(r.kickoffISO)}</td>
                  <td className="px-4 py-3 text-sm">{r.scoreOrStatus ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">
                    {r.resultCode === "W" && (
                      <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">Won</span>
                    )}
                    {r.resultCode === "L" && (
                      <span className="rounded bg-rose-50 px-2 py-1 text-rose-700">Lost</span>
                    )}
                    {r.resultCode === "D" && (
                      <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">Draw</span>
                    )}
                    {(!r.resultCode || r.resultCode === "TBD") && (
                      <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">TBD</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6">
        <h4 className="font-medium mb-2">Legend</h4>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li><strong>NS</strong> — Not Started</li>
          <li><strong>LIVE</strong> — In Play</li>
          <li><strong>FT</strong> — Full Time</li>
          <li><strong>PST</strong> — Postponed</li>
          <li><strong>TBC</strong> — To Be Confirmed</li>
          <li><strong>TBD</strong> — Result pending / fixture not complete</li>
        </ul>
      </div>
    </section>
  );
}

function LifelinesPanel() {
  const { lifelines, loading, reload } = useLifelines();

  return (
    <section className="mt-10">
      <h3 className="text-xl font-semibold mb-3">Lifelines</h3>

      {loading ? (
        <div className="text-sm text-gray-500">Loading lifelines…</div>
      ) : !lifelines?.ok ? (
        <div className="text-sm text-red-600">
          {lifelines?.error ?? "Could not load lifelines."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Proxy card */}
          <div className="rounded-lg border p-4">
            <div className="font-medium">Proxy (auto)</div>
            <p className="text-sm text-gray-600 mt-1">
              If you miss a deadline, we’ll auto-pick the first unused club in alphabetical order.
            </p>
            <div className="mt-3 text-lg">
              {lifelines.state!.proxiesUsed}/2 used ·{" "}
              {lifelines.proxiesRemaining ?? Math.max(0, 2 - (lifelines.state!.proxiesUsed ?? 0))} remaining
            </div>
          </div>

          {/* Lazarus card */}
          <div className="rounded-lg border p-4">
            <div className="font-medium">Lazarus</div>
            {lifelines.state!.eliminatedAtGw ? (
              lifelines.state!.lazarusUsed ? (
                <p className="text-sm text-gray-600 mt-2">Already used.</p>
              ) : lifelines.canUseLazarus ? (
                <>
                  <p className="text-sm text-gray-600 mt-2">
                    You’re eliminated from GW {lifelines.state!.eliminatedAtGw}. Use Lazarus before the
                    next deadline to revive.
                  </p>
                  {lifelines.windowClosesAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Window closes:{" "}
                      {new Date(lifelines.windowClosesAt).toLocaleString("en-IN", { hour12: true })}
                    </p>
                  )}
                  <button
                    className="mt-3 inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
                    onClick={async () => {
                      const res = await fetch("/api/rumble/lazarus", { method: "POST" });
                      const j = await res.json();
                      alert(j.ok ? "Lazarus activated — you’re back in!" : j.error || "Could not activate");
                      await reload();
                    }}
                  >
                    Use Lazarus
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-600 mt-2">Window closed — not available.</p>
              )
            ) : (
              <p className="text-sm text-gray-600 mt-2">You’re alive. Lazarus appears only if eliminated.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- page ---------- */
export default function DashboardPage() {
  return (
    <div className="relative">
      {/* Watermark background */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none opacity-[0.06]"
        style={{
          // ⚠️ Use the SAME filename the Play tab uses. If your file is /haven-logo.png, swap it here.
          backgroundImage: 'url(/haven-logo.png)',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "min(1200px, 90vw)",
        }}
      />

      {/* Page content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <PicksTable />
        <LifelinesPanel />
      </div>
    </div>
  );
}
