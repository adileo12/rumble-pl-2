"use client";

import { useState } from "react";

export function PickButton({ clubId, disabled }: { clubId: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  async function onPick() {
    setLoading(true);
    try {
      const res = await fetch("/api/picks/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error ?? "Failed");
      } else {
        // reload to reflect pick
        location.reload();
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      disabled={disabled || loading}
      onClick={onPick}
      className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? "Picking..." : "Pick"}
    </button>
  );
}
