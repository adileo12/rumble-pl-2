"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginInner() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }), // << key MUST be "code"
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        setErr(data?.error || "Login failed");
        setBusy(false);
        return;
      }

      // Go wherever you land users after login
      router.replace("/home"); // change to /dashboard if that's your home
    } catch (e) {
      setErr("Network error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-sm mx-auto mt-16">
      <label className="block text-sm text-slate-300">
        Secret code
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter secret code"
          className="mt-1 w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-slate-100"
          required
        />
      </label>

      {err && <p className="text-rose-400 text-sm">{err}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

<div className="mt-3">
  <Link
    href="/signup"
    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
  >
    Need a code? Generate a secret code →
  </Link>
</div>
