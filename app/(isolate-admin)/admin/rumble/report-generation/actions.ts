"use server";

export type ActionState = { ok: boolean; message: string };

function getBase() {
  const direct = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (direct) return direct.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

async function postJSON(path: string, body: any) {
  const url = `${getBase()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { ok: false, error: text }; }

  if (!res.ok) throw new Error(data?.error || `${res.status} ${res.statusText}`);
  return data;
}

/** Call the per-GW generator with explicit values. */
export async function generateGwReport(values: { seasonId: string; gwNumber: number }): Promise<ActionState> {
  const seasonId = (values.seasonId ?? "").trim();
  const gwNumber = Number(values.gwNumber);

  if (!seasonId || Number.isNaN(gwNumber)) {
    return { ok: false, message: "seasonId and gwNumber required" };
  }
  try {
    await postJSON("/api/admin/reports/gw/generate", { seasonId, gwNumber });
    return { ok: true, message: "Report generated." };
  } catch (e: any) {
    return { ok: false, message: `GW generate failed: ${e.message}` };
  }
}

/** Sweep recently passed GWs and backfill any missing reports. */
export async function sweepMissingReports(): Promise<ActionState> {
  try {
    await postJSON("/api/admin/reports/generate", {});
    return { ok: true, message: "Sweep complete." };
  } catch (e: any) {
    return { ok: false, message: `Sweep failed: ${e.message}` };
  }
}
