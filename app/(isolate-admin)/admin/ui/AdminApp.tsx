"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function Button({ onClick, children }: { onClick: () => Promise<void> | void; children: React.ReactNode }) {
  return (
    <button
      onClick={async () => { await onClick(); }}
      className="px-4 py-2 rounded bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function NavTabs() {
  const sp = useSearchParams();
  const current = sp.get("tab") ?? "rumble";
  const tabs = [
    { key: "rumble", label: "Rumble" },
    { key: "predictor", label: "Predictor" },
    { key: "site", label: "Site Settings" },
  ];
  return (
    <nav className="mb-6 flex gap-2 border-b">
      {tabs.map((t) => {
        const active = current === t.key;
        return (
          <Link
            key={t.key}
            href={`/admin?tab=${t.key}`}
            className={
              "px-4 py-2 -mb-px border-b-2 " +
              (active ? "border-black font-medium" : "border-transparent text-gray-500 hover:text-black")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminApp() {
  const sp = useSearchParams();
  const router = useRouter();

  const tab = sp.get("tab") ?? "rumble";
  const section = sp.get("section") ?? (tab === "rumble" ? "game-sync" : "");
  const [msg, setMsg] = useState("");

  const setSection = useCallback((s: string) => {
    const qs = new URLSearchParams(sp.toString());
    qs.set("tab", tab);
    qs.set("section", s);
    router.push(`/admin?${qs.toString()}`);
  }, [router, sp, tab]);

  const seedClubs = useCallback(async () => {
    setMsg("Seeding clubs…");
    const r = await fetch("/api/admin/seed", { method: "POST" });
    setMsg(JSON.stringify(await r.json(), null, 2));
  }, []);

  const syncFixtures = useCallback(async () => {
    setMsg("Syncing fixtures…");
    const r = await fetch("/api/admin/sync-fixtures", { method: "POST" });
    setMsg(JSON.stringify(await r.json(), null, 2));
  }, []);

  const [seasonId, setSeasonId] = useState("");
  const [gwNumber, setGwNumber] = useState<number>(1);
  const processResults = useCallback(async () => {
    setMsg("Processing results…");
    const r = await fetch("/api/admin/process-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId, gwNumber }),
    });
    setMsg(JSON.stringify(await r.json(), null, 2));
  }, [seasonId, gwNumber]);

  const rumbleSidebar = (
    <aside className="w-60 shrink-0 pr-6 border-r">
      <h3 className="text-sm font-semibold text-gray-500 mb-2">Rumble</h3>
      <ul className="space-y-1">
        <li>
          <button
            className={`w-full text-left px-3 py-2 rounded ${section === "game-sync" ? "bg-gray-100" : "hover:bg-gray-50"}`}
            onClick={() => setSection("game-sync")}
          >
            Game Sync
          </button>
        </li>
        <li>
          <button
            className={`w-full text-left px-3 py-2 rounded ${section === "reports" ? "bg-gray-100" : "hover:bg-gray-50"}`}
            onClick={() => setSection("reports")}
          >
            Report Generation
          </button>
        </li>
      </ul>
    </aside>
  );

  const rumbleContent = useMemo(() => {
    if (section === "reports") {
      return (
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-4">Report Generation</h2>
          <div className="grid gap-4 max-w-xl">
            <div className="border rounded p-4">
              <h3 className="font-medium mb-2">Process Gameweek Results</h3>
              <div className="flex gap-2 mb-2">
                <input value={seasonId} onChange={(e) => setSeasonId(e.target.value)} placeholder="Season ID" className="border rounded px-3 py-2 w-72" />
                <input type="number" value={gwNumber} onChange={(e) => setGwNumber(Number(e.target.value))} placeholder="GW number" className="border rounded px-3 py-2 w-32" />
              </div>
              <Button onClick={processResults}>Run</Button>
            </div>

            {/* NEW: Link to the server-rendered Reports page */}
            <div className="border
