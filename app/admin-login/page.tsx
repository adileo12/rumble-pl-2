"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [lastName, setLast] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, lastName }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Admin login failed");
      router.replace("/home");
    } catch (e: any) {
      setErr(e.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin Login</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full rounded border px-3 py-2"
                 value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Password (Admin last name)</label>
          <input className="w-full rounded border px-3 py-2" type="password"
                 value={lastName} onChange={e=>setLast(e.target.value)} required />
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button disabled={loading}
                className="rounded bg-black text-white px-4 py-2 disabled:opacity-60">
          {loading ? "Signing in..." : "Sign in as admin"}
        </button>
      </form>
    </main>
  );
}
