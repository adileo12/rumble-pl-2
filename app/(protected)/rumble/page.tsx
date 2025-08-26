// app/(protected)/rumble/page.tsx
"use client";

import React, { useState } from "react";

type ApiResp = { ok: boolean; error?: string };

export default function RumblePlayPage() {
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitPick() {
    if (!selectedClubId) {
      setMessage("Please select a club first.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const r = await fetch("/api/rumble/pick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clubId: selectedClubId }),
      });
      const j: ApiResp = await r.json();
      if (!j.ok) {
        setMessage(j.error || "Could not submit pick.");
      } else {
        setMessage("Pick saved!");
      }
    } catch {
      setMessage("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Rumble · Play</h1>

      {/* TODO: your club chooser UI; ensure setSelectedClubId(<number>) is called */}
      <div className="mb-4 text-sm text-gray-600">
        Select a club above, then submit your pick.
      </div>

      <button
        onClick={submitPick}
        disabled={!selectedClubId || submitting}
        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Pick"}
      </button>

      {message && <div className="mt-3 text-sm">{message}</div>}
    </div>
  );
}