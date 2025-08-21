// app/admin/page.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Button({
  onClick,
  children,
}: {
  onClick: () => Promise<void> | void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={async () => {
        await onClick();
      }}
      className="px-4 py-2 rounded bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export default function AdminPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const tab = sp.get("tab") ?? "rumble";
  const section = sp.get("section") ?? (tab === "rumble" ? "game-sync" : "");

  const [msg, setMsg] = useState<string>("");

  const setSection = useCallback(
    (s: string) => {
      const qs = new URLSearchParams(sp.toString());
      qs.set("tab", tab);
      qs.set("section", s);
      router.push(`/admin?${qs.toString()}`);
    },
    [router, sp, tab]
  );

  // ---- Admin actions (existing API routes) ----
  const seedClubs = useCallback(async () => {
    setMsg("Seeding clubs…");
    const r = await fetch("/api/admin/seed", { method: "POST" });
    const j = await r.json();
    setMsg(JSON.stringify(j, null, 2));
  }, []);

  const syncFixtures = useCallback(async () => {
    setMsg("Syncing fixtures…");
    const r = await fetch("/api/admin/sync-fixtures", { method: "POST" });
    const j = await r.json();
    setMsg(JSON.stringify(j, null, 2));
  }, []);

  // Example action under Report Generation
  const [seasonId, setSeasonId] = useState("");
  const [gwNumber, setGwNumber] = useState<number>(1);

  const processResults = useCallback(async () => {
    setMsg("Processing results…");
    const r = await fetch("/api/admin/process-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId, gwNumber }),
    });
    const j = await r.json();
    setMsg(JSON.stringify(j, null, 2));
  }, [seasonId, gwNumber]);

  // ---- Rumble sidebar ----
  const rumbleSidebar = (
    <aside className="w-60 shrink-0 pr-6 border-r">
      <h3 className="text-sm font-semibold text-gray-500 mb-2">Rumble</h3>
      <ul className="space-y-1">
        <li>
          <button
            className={`w-full text-left px-3 py-2 rounded ${
              section === "game-sync" ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
            onClick={() => setSection("game-sync")}
          >
            Game Sync
          </button>
        </li>
        <li>
          <button
            className={`w-full text-left px-3 py-2 rounded ${
              section === "reports" ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
            onClick={() => setSection("reports")}
          >
            Report Generation
          </button>
        </li>
      </ul>
    </aside>
  );

  // ---- Rumble content ----
  const rumbleContent = useMemo(() => {
    if (section === "reports") {
      return (
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-4">Report Generation</h2>
          <div className="grid gap-4 max-w-xl">
            <div className="border rounded p-4">
              <h3 className="font-medium mb-2">Process Gameweek Results</h3>
              <div className="flex gap-2 mb-2">
                <input
                  value={seasonId}
                  onChange={(e) => setSeasonId(e.target.value)}
                  placeholder="Season ID"
                  className="border rounded px-3 py-2 w-72"
                />
                <input
                  type="number"
                  value={gwNumber}
                  onChange={(e) => setGwNumber(Number(e.target.value))}
                  placeholder="GW number"
                  className="border rounded px-3 py-2 w-32"
                />
              </div>
              <Button onClick={processResults}>Run</Button>
            </div>
          </div>
        </div>
      );
    }

    // Default: Game Sync
    return (
      <div className="flex-1">
        <h2 className="text-xl font-semibold mb-4">Game Sync</h2>
        <div className="flex gap-3">
          <Button onClick={seedClubs}>Seed Clubs</Button>
          <Button onClick={syncFixtures}>Sync Fixtures</Button>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          1) Seed → 2) Sync Fixtures → verify at <code>/api/status</code>.
        </p>
      </div>
    );
  }, [gwNumber, processResults, seasonId, section, seedClubs, syncFixtures]);

  return (
    <main>
      {tab === "rumble" && (
        <div className="flex">
          {rumbleSidebar}
          <section className="pl-6 flex-1">{rumbleContent}</section>
        </div>
      )}

      {tab === "predictor" && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Predictor</h2>
          <p className="text-gray-600">
            Coming soon: sync matches, recalc scores, export CSV…
          </p>
        </section>
      )}

      {tab === "site" && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Site Settings</h2>
          <p className="text-gray-600">
            Coming soon: maintenance mode, banner text, feature flags…
          </p>
        </section>
      )}

      <pre className="mt-6 bg-gray-50 p-3 rounded text-xs whitespace-pre-wrap">
        {msg}
      </pre>
    </main>
  );
}
