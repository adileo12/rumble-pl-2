// app/(protected)/profile/secret/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangeSecretPage() {
  const router = useRouter();

  const [currentSecret, setCurrentSecret] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // simple client-side strength evaluation (server remains source of truth)
  const score = useMemo(() => {
    let s = 0;
    if (newSecret.length >= 8) s++;
    if (/[A-Za-z]/.test(newSecret)) s++;
    if (/\d/.test(newSecret)) s++;
    if (/[^A-Za-z0-9]/.test(newSecret)) s++;
    return s; // 0..4
  }, [newSecret]);

  const strengthLabel = ["Very weak", "Weak", "Okay", "Good", "Strong"][score] ?? "Very weak";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setOkMsg(null);

    try {
      const r = await fetch("/api/profile/secret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentSecret, newSecret }),
      });
      const j = await r.json();

      if (!r.ok) {
        // Map known server errors to friendly messages
        switch (j?.error) {
          case "CURRENT_SECRET_REQUIRED":
            setErrorMsg("Please enter your current secret code.");
            break;
          case "NEW_SECRET_REQUIRED":
            setErrorMsg("Please enter a new secret code.");
            break;
          case "CURRENT_SECRET_INVALID":
            setErrorMsg("The current secret code is incorrect.");
            break;
          case "NEW_SECRET_TOO_SHORT":
            setErrorMsg("New secret must be at least 8 characters long.");
            break;
          case "NEW_SECRET_WEAK":
            setErrorMsg("New secret must include letters, numbers, and a special character.");
            break;
          default:
            setErrorMsg(j?.error ?? "Could not change the secret code.");
        }
        return;
      }

      setOkMsg("Secret changed successfully.");
      // small delay so the user sees the success, then go back to Profile
      setTimeout(() => router.push("/profile"), 800);
    } catch (err) {
      setErrorMsg("Unexpected error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Change Secret Code</h1>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current secret */}
        <div className="rounded-2xl border p-4 space-y-3">
          <h2 className="font-medium">Current secret code</h2>
          <input
            className="w-full border rounded-lg px-3 py-2"
            type="password"
            value={currentSecret}
            onChange={(e) => setCurrentSecret(e.target.value)}
            placeholder="Enter current secret"
            autoFocus
          />
        </div>

        {/* New secret */}
        <div className="rounded-2xl border p-4 space-y-3">
          <h2 className="font-medium">New secret code</h2>
          <input
            className="w-full border rounded-lg px-3 py-2"
            type="password"
            value={newSecret}
            onChange={(e) => setNewSecret(e.target.value)}
            placeholder="Choose a new secret"
          />

          {/* Strength meter */}
          <div className="mt-1 h-1 w-full bg-muted rounded">
            <div
              className="h-1 rounded"
              style={{
                width: `${(score / 4) * 100}%`,
                background: score >= 3 ? "#16a34a" : "#f59e0b",
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Strength: {strengthLabel}</p>

          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
            <li>At least 8 characters</li>
            <li>Includes letters (A–Z)</li>
            <li>Includes numbers (0–9)</li>
            <li>Includes a special character (e.g., ! @ # $ %)</li>
          </ul>
        </div>

        {/* Actions & messages */}
        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Updating…" : "Submit"}
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border hover:bg-muted"
            onClick={() => router.push("/profile")}
          >
            Cancel
          </button>

          {errorMsg && <span className="text-sm text-red-600">{errorMsg}</span>}
          {okMsg && <span className="text-sm text-green-600">{okMsg}</span>}
        </div>
      </form>
    </div>
  );
}
