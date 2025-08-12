"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function Inner() {
  const [secretCode, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || sp.get("from") || "/home";

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
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Login failed (status ${res.status})`);
      }
      // hard redirect so we get fresh server render with cookie
      window.location.assign(next);
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-0px)] bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Bottom-right admin link */}
      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute bottom-4 right-4 text-xs">
          <Link
            href="/admin-login"
            className="underline opacity-70 hover:opacity-100"
          >
            Admin login
          </Link>
        </div>
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4">
        {/* Brand */}
        <h1 className="mb-10 text-4xl font-extrabold tracking-wide text-gray-900">
          HAVEN GAMES
        </h1>

        {/* Card */}
        <div className="w-full max-w-sm rounded-xl border bg-white/80 p-6 shadow-sm backdrop-blur">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-700">
                Secret code
              </label>
              <input
                className="w-full rounded-md border px-3 py-2 outline-none ring-0 focus:border-indigo-400"
                value={secretCode}
                onChange={(e) => setSecret(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <button
              disabled={loading}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Smaller sign-up link under the button */}
          <div className="mt-3 text-center text-xs text-gray-600">
            New here?{" "}
            <Link href="/signup" className="underline">
              Create your secret code
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginInner() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}