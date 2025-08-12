"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginInner() {
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
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Login failed");
      window.location.assign(next);
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <div className="w-full max-w-sm px-4 text-center">
        {/* Header */}
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8">
          HAVEN <span className="opacity-80">GAMES</span>
        </h1>

        {/* Form */}
        <form
          onSubmit={submit}
          className="bg-white dark:bg-zinc-900/60 p-6 rounded-xl shadow-sm border dark:border-zinc-800"
        >
          <div className="mb-4">
            <label className="block text-sm mb-1 opacity-80">Secret code</label>
            <input
              className="w-full rounded-md border px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              value={secretCode}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          {err && <p className="text-red-600 text-sm mb-2">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black text-white py-3 text-lg font-medium disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {/* Small signup link under button */}
          <p className="text-xs mt-3">
            New here?{" "}
            <Link href="/signup" className="underline">
              Create your secret code
            </Link>
          </p>
        </form>
      </div>

      {/* Admin link bottom-right */}
      <div className="fixed right-4 bottom-4 text-xs opacity-70 hover:opacity-100">
        <Link href="/admin-login" className="underline">
          Admin login
        </Link>
      </div>
    </div>
  );
}