// app/(protected)/profile/secret/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const rules = [
  "At least 8 characters long",
  "Must include letters (A–Z or a–z)",
  "Must include numbers (0–9)",
  "Must include a special character (e.g., ! @ # $ % & *)",
];

export default function SecretChangePage() {
  const router = useRouter();
  const [currentSecret, setCurrentSecret] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setOk(null);

    try {
      const r = await fetch("/api/profile/secret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentSecret, newSecret }),
      });
      const j = await r.json();

      if (!r.ok) {
        if (j?.error === "CURRENT_SECRET_INCORRECT") setError("The current secret code is incorrect.");
        else if (j?.error === "NEW_SECRET_WEAK") setError("The new secret code does not meet the requirements.");
        else if (j?.error === "Forbidden") setError("Admins cannot change secret here.");
        else setError("Failed to change secret code.");
        return;
      }

      setOk("Secret code updated successfully. Redirecting to Profile…");
      setTimeout(() => router.push("/profile"), 800);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Change Secret Code</h1>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Current secret code</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            type="password"
            value={currentSecret}
            onChange={(e) => setCurrentSecret(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        </div>

        {/* New */}
        <div className="space-y-2">
          <label className="text-sm font-medium">New secret code</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            type="password"
            value={newSecret}
            onChange={(e) => setNewSecret(e.target.value)}
            autoComplete="off"
          />
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
            {rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        {/* Actions & messages */}
        <div className="md:col-span-2 flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border hover:bg-muted"
            onClick={() => history.back()}
            disabled={submitting}
          >  
            Back
          </button>
const score = useMemo(() => {
  let s = 0;
  if (newSecret.length >= 8) s++;
  if (/[A-Za-z]/.test(newSecret)) s++;
  if (/\d/.test(newSecret)) s++;
  if (/[^A-Za-z0-9]/.test(newSecret)) s++;
  return s; // 0-4
}, [newSecret]);

<div className="mt-1 h-1 w-full bg-muted rounded">
  <div className="h-1 rounded" style={{ width: `${(score/4)*100}%`, background: score >= 3 ? "#16a34a" : "#f59e0b" }} />
</div>
<p className="text-xs text-muted-foreground">
  Strength: {["Very weak","Weak","Okay","Good","Strong"][score] ?? "Very weak"}
</p>
          
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>

        {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
        {ok && <p className="md:col-span-2 text-sm text-green-600">{ok}</p>}
      </form>
    </div>
  );
}
