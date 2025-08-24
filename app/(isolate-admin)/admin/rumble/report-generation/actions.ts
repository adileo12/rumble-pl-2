"use server";

import { revalidatePath } from "next/cache";

export type ActionState = { ok: boolean; message: string };

function baseUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  return explicit || vercel || "http://localhost:3000";
}

function withBypass(path: string) {
  const u = new URL(path, baseUrl());
  const token = process.env.VERCEL_BYPASS_TOKEN; // set this in Vercel
  if (token) {
    u.searchParams.set("x-vercel-set-bypass-cookie", "true");
    u.searchParams.set("x-vercel-protection-bypass", token);
  }
  return u.toString();
}

async function postJSON(path: string, body: unknown): Promise<ActionState> {
  const r = await fetch(withBypass(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // ✅ match your route’s assertCronAuth()
      ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
    redirect: "follow",
  });

  if (!r.ok) {
    const text = await r.text();
    return { ok: false, message: `HTTP ${r.status} ${r.statusText}: ${text.slice(0, 800)}` };
  }
  const json = await r.json().catch(() => ({} as any));
  return { ok: !!json.ok, message: json.message || json.error || "OK" };
}

// Set this if your folder is not `/gw`
const API_PREFIX = process.env.NEXT_PUBLIC_REPORT_API_PREFIX ?? "/api/admin/reports/gw";

export async function generateGwReportAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const seasonId = String(formData.get("seasonId") || "");
  const gwNumber = Number(formData.get("gwNumber") || 0);
  if (!seasonId || !gwNumber) return { ok: false, message: "Season & GW are required." };

  const res = await postJSON(`${API_PREFIX}/generate`, { seasonId, gwNumber });
  revalidatePath("/admin", "page");
  return res;
}

// (Optional) Only add a Sweep button if you actually create this route.
export async function sweepMissingReportsAction(_prev: ActionState): Promise<ActionState> {
  const res = await postJSON(`${API_PREFIX}/sweep`, {});
  revalidatePath("/admin", "page");
  return res;
}
