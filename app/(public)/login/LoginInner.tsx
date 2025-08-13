"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function Inner() {
  const [secretCode, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/rumble";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Login failed");
      // hard nav to ensure cookies are seen immediately
      window.location.assign(next);
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-start sm:items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <form onSubmit={submit} className="space-y-4 text-center">
          <label className="block text-base sm:text-lg font-medium">
            Secret code
          </label>
          <input
            className="mx-auto block w-full rounded-md border px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-slate-800"
            value={secretCode}
            onChange={(e) => setSecret(e.target.value)}
            autoComplete="off"
            required
          />

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <button
            disabled={loading}
            className="mx-auto block rounded-md bg-slate-900 text-white px-6 py-3 text-base sm:text-lg disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-xs text-slate-600">
            New here?{" "}
            <Link href="/signup" className="underline">
              Create your secret code
            </Link>
          </p>
        </form>
      </div>

      {/* Admin link bottom-right */}
      <Link
        href="/admin-login"
        className="fixed bottom-4 right-4 text-xs text-slate-600 underline"
      >
        Admin login
      </Link>
    </div>
  );
}

export default function LoginInner() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}