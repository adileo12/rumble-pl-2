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
      onClick={async () => { await onClick(); }}
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

  const setSection = useCallback((s: string) => {
    const qs = new URLSearchParams(sp.toString());
    qs.set("tab", tab);
    qs.set("section", s);
    router.push(`/admin?${qs.toString()}`);
  }, [router, sp, tab]);

  // Admin actions
  const seedClubs = useCallback(async () => {
    setMsg("Seeding clubs…");
    const r = await fetch("/api/admin/seed", { method: "POST" });
    setMsg(JSON.stringify(await r.json(), null, 2));
  }, []);

  const syncFixtures = useCallback(async () => {
    setMsg("Syncing fixtures…");
    const r = await fetch("/api/admin/sync-fixtures", { method: "POST" });
    setMsg
