import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { ActionState } from "./types";

function getOriginAndCookie(): { origin: string; cookie: string } {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) throw new Error("Unable to determine request host");
  return {
    origin: `${proto}://${host}`,
    cookie: h.get("cookie") ?? "",
  };
}

export async function generateGwReportAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  "use server";
  const seasonId = String(formData.get("seasonId") ?? "").trim();
  const gwNumber = Number(formData.get("gwNumber") ?? NaN);
  const secret = process.env.CRON_SECRET ?? "";

  if (!seasonId || Number.isNaN(gwNumber)) {
    return { ok: false, message: "Provide a Season and a valid GW number." };
  }
  if (!secret) return { ok: false, message: "CRON_SECRET is not set in env." };

  try {
    const { origin, cookie } = getOriginAndCookie();
    const res = await fetch(`${origin}/api/admin/reports/gw/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
        // Forward the user's cookies to bypass Vercel protection
        cookie,
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
    const { origin, cookie } = getOriginAndCookie();
    const res = await fetch(`${origin}/api/admin/reports/generate`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${secret}`,
        cookie,
      },
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
