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
     <button
  className="px-4 py-2 rounded bg-slate-800 text-white"
  onClick={async () => {
    const r = await fetch("/api/admin/sync-clubs", { method: "POST" });
    const j = await r.json(); alert(JSON.stringify(j, null, 2));
  }}
>
  Sync Clubs
</button>

<button
  className="ml-3 px-4 py-2 rounded bg-slate-800 text-white"
  onClick={async () => {
    const r = await fetch("/api/admin/sync-fixtures", { method: "POST" });
    const j = await r.json(); alert(JSON.stringify(j, null, 2));
  }}
>
  Sync Fixtures
</button>
      <p style={{ marginTop: 12 }}>1) Seed → 2) Sync Fixtures → check /api/status.</p>
      <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 8 }}>{msg}</pre>
    </main>
  );
}
