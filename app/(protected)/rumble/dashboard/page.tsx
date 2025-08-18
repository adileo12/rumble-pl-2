"use client";

import { useEffect, useState } from "react";

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

function useLifelines() {
  const [lifelines, setLifelines] = useState<LifelineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rumble/state", { cache: "no-store" });
      const json = (await res.json()) as LifelineResponse;
      setLifelines(json);
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

// --- inside your Dashboard component render:
const { lifelines, loading, reload } = useLifelines();

<section className="mt-10">
  <h3 className="text-xl font-semibold mb-3">Lifelines</h3>

  {loading || !lifelines?.ok ? (
    <div className="text-sm text-gray-500">Loading lifelines…</div>
  ) : (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Proxy card */}
      <div className="rounded-lg border p-4">
        <div className="font-medium">Proxy (auto)</div>
        <p className="text-sm text-gray-600 mt-1">
          If you miss a deadline, we’ll auto-pick the first unused club in alphabetical order.
        </p>
        <div className="mt-3 text-lg">
          {lifelines.state!.proxiesUsed}/2 used · {lifelines.proxiesRemaining ?? (2 - (lifelines.state!.proxiesUsed ?? 0))} remaining
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
                  Window closes: {new Date(lifelines.windowClosesAt).toLocaleString("en-IN", { hour12: true })}
                </p>
              )}
              <button
                className="mt-3 inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
                onClick={async () => {
                  const res = await fetch("/api/rumble/lazarus", { method: "POST" });
                  const j = await res.json();
                  alert(j.ok ? "Lazarus activated — you’re back in!" : j.error || "Could not activate");
                  await reload(); // <-- replace mutate() with reload()
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
