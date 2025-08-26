"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginInner() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setErr("Please enter your secret code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErr(data?.error || "Invalid code");
        setLoading(false);
        return;
      }

      // success -> go home
      window.location.href = "/home";
    } catch {
      setErr("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl w-full pt-16">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl bg-white/70 backdrop-blur border border-slate-200/70 shadow p-6 sm:p-8"
      >
        <label className="block text-slate-700 font-medium mb-2">
          Secret code
        </label>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter secret code"
          className="w-full rounded-md bg-slate-900 text-white placeholder:text-slate-400 px-3 py-2 outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 transition"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {err && (
          <p className="mt-3 text-sm text-rose-600" role="alert">
            {err}
          </p>
        )}

        {/* New user / generate code link (INSIDE the component) */}
       <div className="mt-3">
  <a
    href="/signup"
    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
  >
    Need a code? Generate a secret code →
  </a>
</div>

<div className="mt-8 text-right">
  <a
    href="/admin-login"
    className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-4"
  >
    Admin Login
  </a>
</div>
