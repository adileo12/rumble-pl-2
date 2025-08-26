"use client";
import React, { useState } from "react";

type ApiResp = { ok: boolean; error?: string; pick?: any };

export default function RumblePage() {
  // ⬇️ track which club is selected
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);

  // call /api/rumble/pick with the selected club
  async function submitPick() {
    if (!selectedClubId) {
      alert("Pick a club first");
      return;
    }
    const r = await fetch("/api/rumble/pick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",                      // ensure auth cookie is sent
      body: JSON.stringify({ clubId: selectedClubId }),
    });
    const j: ApiResp = await r.json();
    if (!j.ok) {
      alert(j.error || "Failed to save pick");
      return;
    }
    alert("Pick saved");
  }

  return (
    <div>
      {/* …your clubs grid… */}
      {/* Example of wiring selection: */}
      {/* clubs.map(c => (
        <button
          key={c.id}
          onClick={() => setSelectedClubId(c.id)}
          className={selectedClubId === c.id ? "ring-2 ring-indigo-500" : ""}
        >
          {c.name}
        </button>
      )) */}

      <button onClick={submitPick} className="btn">Submit</button>
    </div>
  );
}
