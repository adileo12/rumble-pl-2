"use server";

import { revalidatePath } from "next/cache";

export type ActionState = { ok: boolean; message: string };

function baseUrl() {
  // Prefer explicit site URL, else use the deployment URL Vercel injects
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  return explicit || vercel || "http://localhost:3000";
}

function withBypass(path: string) {
  const u = new URL(path, baseUrl());
  const token = process.env.VERCEL_BYPASS_TOKEN;
  if (token) {
    // This sets the bypass cookie on first request so subsequent calls work too
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
      ...(process.env.CRON_SECRET ? { "x-cron-secret": process.env.CRON_SECRET } : {}),
    },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
    redirect: "follow",
  });

  // Try to give a helpful message on failure (401 will return the auth HTML)
  if (!r.ok) {
    const text = await r.text();
    return { ok: false, message: `HTTP ${r.status} ${r.statusText}: ${text.slice(0, 600)}` };
  }

  const json = await r.json().catch(() => ({}));
  const ok = !!(json as any).ok;
  const message = (json as any).message || (json as any).error || "OK";
  return { ok, message };
}

export async function generateGwReportAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const seasonId = String(formData.get("seasonId") || "");
  const gwNumber = Number(formData.get("gwNumber") || 0);
  if (!seasonId || !gwNumber) return { ok: false, message: "Season & GW are required." };

  const res = await postJSON("/api/admin/reports/gw/generate", { seasonId, gwNumber });
  revalidatePath("/admin", "page");
  return res;
}

export async function sweepMissingReportsAction(
  _prev: ActionState
): Promise<ActionState> {
  const res = await postJSON("/api/admin/reports/gw/sweep", {});
  revalidatePath("/admin", "page");
  return res;
}
