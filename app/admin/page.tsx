"use client";

import { useState } from "react";

export default function Admin() {
  const [msg, setMsg] = useState<string>("");

  async function call(path: string) {
    try {
      setMsg("Running...");
      const res = await fetch(path, { method: "POST" });
      const json = await res.json();
      setMsg(JSON.stringify(json));
    } catch (e: any) {
      setMsg(e?.message ?? "error");
    }
  }

  return (
    <main>
      <h2>Admin</h2>
      <button onClick={() => call("/api/admin/seed")}>Seed DB (Clubs + Season)</button>
      <button style={{ marginLeft: 12 }} onClick={() => call("/api/fixtures/sync")}>
        Sync Fixtures (FPL)
      </button>
      <p style={{ marginTop: 12 }}>1) Seed → 2) Sync Fixtures → check /api/status.</p>
      <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 8 }}>{msg}</pre>
    </main>
  );
}
