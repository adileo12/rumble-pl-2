// app/admin/page.tsx
"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Opt out of SSG/prerender + caching
export const dynamic = "force-dynamic";
export const revalidate = false;

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

function AdminInner() {
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
          <
