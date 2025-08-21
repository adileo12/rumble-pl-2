"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PickButton({
  clubId,
  disabled = false,
  onPicked,
}: {
  clubId: string;
  disabled?: boolean;
  onPicked?: () => void; // optional callback to update parent without reload
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onPick() {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/picks/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
        // cookies are sent by default on same-origin
      });

      // be robust to non-JSON errors
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}

      if (!res.ok || !data.ok) {
        const msg = data.error ?? `Request failed (${res.status})`;
        alert(msg);
        return;
      }

      onPicked?.();
      router.refresh(); // refresh server components without full page reload
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onPick}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? "Picking..." : "Pick"}
    </button>
  );
}
