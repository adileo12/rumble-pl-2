"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      console.log("[ADMIN-LOGIN] submitting", { email, pwLen: password.length });
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      console.log("[ADMIN-LOGIN] response", res.status, data);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.reason || "Invalid credentials");
      }

      // Success — go to home (or /admin)
      router.replace("/");
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-1">Email</label>
        <input className="w-full border rounded px-3 py-2"
               type="email"
               autoComplete="email"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               required />
      </div>
      <div>
        <label className="block text-sm mb-1">Admin password</label>
        <input className="w-full border rounded px-3 py-2"
               type="password"
               autoComplete="current-password"
               value={password}
               onChange={(e) => setPwd(e.target.value)}
               required />
      </div>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <button disabled={loading} className="px-4 py-2 bg-black text-white rounded disabled:opacity-60">
        {loading ? "Signing in..." : "Sign in as admin"}
      </button>
    </form>
  );
}