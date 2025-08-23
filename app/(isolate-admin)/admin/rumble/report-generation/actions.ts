"use server";

import { headers } from "next/headers";

export type ActionState = { ok: boolean; message: string };

function getBaseUrl(): string {
  // Prefer explicit env var you control
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (fromEnv) return fromEnv;

  // Fallback to request headers in server runtime
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${proto}://${host}`;

  throw new Error(
    "Cannot determine base URL. Set NEXT_PUBLIC_SITE_URL (e.g. https://your-app.vercel.app)."
  );
}

export async function generateGwReportAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const base = getBaseUrl();
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, message: "CRON_SECRET is not set in env." };

  const seasonId = formData.get("seasonId")?.toString() ?? "";
  const gwNumber = Number(formData.get("gwNumber"));

  const res = await fetch(`${base}/api/admin/reports/gw/generate`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ seasonId, gwNumber }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, message: `GW generate failed (${res.status}): ${text}` };
  }

  const json = await res.json();
  return { ok: true, message: JSON.stringify(json) };
}

export async function sweepMissingReportsAction(
  _prev: ActionState
): Promise<ActionState> {
  const base = getBaseUrl();
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, message: "CRON_SECRET is not set in env." };

  const res = await fetch(`${base}/api/admin/reports/generate`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, message: `Sweep failed (${res.status}): ${text}` };
  }

  const json = await res.json();
  return { ok: true, message: JSON.stringify(json) };
}
