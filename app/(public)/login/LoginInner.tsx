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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-xs text-center">
        {/* Header */}
        <h1 className="text-4xl font-extrabold mb-8">HAVEN GAMES</h1>

        {/* Form */}
        <form onSubmit={submit} className="flex flex-col items-center">
          <input
            type="text"
            placeholder="Secret code"
            value={secretCode}
            onChange={(e) => setSecret(e.target.value)}
            className="border rounded-md px-4 py-3 text-lg mb-4 w-full text-center"
            required
          />

          {err && <p className="text-red-600 text-sm mb-2">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md text-lg mb-2 w-full"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-xs">
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