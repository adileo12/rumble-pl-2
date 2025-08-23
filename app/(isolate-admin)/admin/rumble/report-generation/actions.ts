import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { ActionState } from "./types";

function getOrigin(): string {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/+$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) throw new Error("Unable to determine request host");
  return `${proto}://${host}`;
}

export async function generateGwReportAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  "use server";
  const seasonId = String(formData.get("seasonId") ?? "").trim();
  const gwNumber = Number(formData.get("gwNumber") ?? NaN);
  const secret = process.env.CRON_SECRET ?? "";

  if (!secret) return { ok: false, message: "CRON_SECRET is not set in env." };
  if (!seasonId || Number.isNaN(gwNumber))
    return { ok: false, message: "Provide a Season and a valid GW number." };

  try {
    const res = await fetch(`${getOrigin()}/api/admin/reports/gw/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ seasonId, gwNumber }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: `GW generate failed (${res.status}): ${text || "no body"}` };
    }

    revalidatePath("/admin/rumble/report-generation");
    return { ok: true, message: `Report generated for GW ${gwNumber}.` };
  } catch (e: any) {
    return { ok: false, message: `GW generate exception: ${e?.message || String(e)}` };
  }
}

export async function sweepMissingReportsAction(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  "use server";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return { ok: false, message: "CRON_SECRET is not set in env." };

  try {
    const res = await fetch(`${getOrigin()}/api/admin/reports/generate`, {
      method: "GET",
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: `Sweep failed (${res.status}): ${text || "no body"}` };
    }

    revalidatePath("/admin/rumble/report-generation");
    return { ok: true, message: "Sweep complete (checked last ~36h)." };
  } catch (e: any) {
    return { ok: false, message: `Sweep exception: ${e?.message || String(e)}` };
  }
}
