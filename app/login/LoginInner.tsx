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
  const next = sp.get("next") || "/";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    console.log("🔹 Starting login process...");
    console.log("Secret code entered:", secretCode);
    console.log("Redirect target:", next);

    try {
      console.log("➡ Sending POST request to /api/auth/login");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretCode }),
      });

      console.log("⬅ Response status:", res.status);

      let data: any = null;
      try {
        data = await res.json();
        console.log("📦 Parsed JSON response:", data);
      } catch (jsonErr) {
        console.error("❌ Failed to parse JSON:", jsonErr);
        throw new Error(`Non-JSON response (status ${res.status})`);
      }

      if (!res.ok || !data?.ok) {
        console.warn("⚠ Login failed:", data?.error);
        throw new Error(data?.error || `Login failed (status ${res.status})`);
      }

      console.log("✅ Login successful. Redirecting to:", next);
      router.replace(next);
    } catch (e: any) {
      console.error("💥 Login error:", e);
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
      console.log("🔹 Login process finished");
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Secret code</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={secretCode}
            onChange={(e) => setSecret(e.target.value)}
            autoComplete="off"
            required
          />
        </div>

        {err && <p className="text-red-600 text-sm">{err}</p>}

        <button
          disabled={loading}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-4 text-sm">
        New here?{" "}
        <Link href="/signup" className="underline">
          Create your secret code
        </Link>
      </div>

      <div className="mt-10 text-xs text-right">
        <Link href="/admin-login" className="underline opacity-70 hover:opacity-100">
          Admin login
        </Link>
      </div>
    </main>
  );
}