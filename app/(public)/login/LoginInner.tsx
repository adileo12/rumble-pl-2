// app/(public)/login/LoginInner.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function LoginInner() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const c = code.trim();
    if (!c) {
      setError("Enter your secret code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include", // ensure auth cookie is set
        body: JSON.stringify({ code: c }),
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error || "Login failed.");
      } else {
        // send them to the protected area after login
        window.location.href = "/rumble";
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl w-full pt-16">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl bg-white/70 backdrop-blur border border-slate-200/70 shadow p-6 sm:p-8"
      >
        <h1 className="text-2xl font-semibold mb-4">Sign in</h1>

        <label className="block text-sm font-medium text-slate-700">
          Secret code
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter your secret code"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {/* generate secret code link */}
        <div className="mt-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
          >
            Need a code? Generate a secret code →
          </Link>
        </div>
      </form>

      {/* admin login link */}
      <div className="mt-6 text-right">
        <Link
          href="/admin-login"
          className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-4"
        >
          Admin Login
        </Link>
      </div>
    </div>
  );
}