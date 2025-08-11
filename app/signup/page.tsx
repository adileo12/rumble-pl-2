"use client";

import { useState } from "react";

export default function SignupPage() {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError(null);
  setLoading(true);
  setSecret(null);

  try {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });

    // Try to parse JSON, but don't crash if body is empty/non-JSON
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // ignore; we'll build a fallback error below
    }

    if (!res.ok || !data?.ok) {
      const msg =
        data?.error ||
        `Signup failed (${res.status}${res.statusText ? ` ${res.statusText}` : ""})`;
      throw new Error(msg);
    }

    setSecret(data.user.secretCode);
  } catch (err: any) {
    setError(err?.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
}

  function copy() {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign up</h1>
      {!secret ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">First name</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={firstName}
              onChange={(e) => setFirst(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Last name</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={lastName}
              onChange={(e) => setLast(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black text-white px-4 py-2 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create my secret code"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Your secret code has been generated. You’ll use this to log in:
          </p>
          <div className="flex items-center gap-2">
            <code className="rounded border px-3 py-2 text-lg">{secret}</code>
            <button onClick={copy} className="rounded border px-2 py-2 text-sm">
              Copy
            </button>
          </div>
          <a href="/login" className="inline-block underline mt-2">Go to login</a>
        </div>
      )}
    </main>
  );
}
