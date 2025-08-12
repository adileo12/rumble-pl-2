"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginInner() {
  const [secretCode, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/home";

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
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 text-center"
      >
        <label className="block text-base mb-1">Secret code</label>
        <input
          className="w-full rounded border px-4 py-3 text-lg"
          value={secretCode}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete="off"
          required
        />

        {err && <p className="text-red-600 text-sm">{err}</p>}

        <button
          disabled={loading}
          className="w-full rounded bg-black text-white px-5 py-3 text-base disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {/* Smaller, just below the button */}
        <p className="text-sm">
          New here?{" "}
          <Link href="/signup" className="underline">
            Create your secret code
          </Link>
        </p>
      </form>

      {/* Bottom-right admin login */}
      <div className="fixed right-4 bottom-4 text-xs">
        <Link href="/admin-login" className="underline opacity-80 hover:opacity-100">
          Admin login
        </Link>
      </div>
    </div>
  );
}