// app/admin/layout.tsx
"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";
export const revalidate: false | 0 | 60 | 300 = false;
export const runtime = "nodejs";
export default function GroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}

console.log("[tripwire] admin/layout -> typeof revalidate =", typeof revalidate, "; value =", revalidate);

const TABS = [
  { key: "rumble", label: "Rumble" },
  { key: "predictor", label: "Predictor" },
  { key: "site", label: "Site Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const sp = useSearchParams();
  const current = sp.get("tab") ?? "rumble";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
      </header>

      <nav className="mb-6 flex gap-2 border-b">
        {TABS.map((t) => {
          const active = current === t.key;
          const href = `/admin?tab=${t.key}`;
          return (
            <Link
              key={t.key}
              href={href}
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

      {children}
    </div>
  );
}
