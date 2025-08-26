export async function submitPick(clubId: number, gwId?: number) {
  const res = await fetch("/api/rumble/pick", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clubId: Number(clubId), ...(gwId ? { gwId: Number(gwId) } : {}) }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Failed to submit pick");
  }
  return data as { ok: true; gameweekId: number; seasonId: number; clubId: number };
}
