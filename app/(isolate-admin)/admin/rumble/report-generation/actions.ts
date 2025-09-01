"use server";

export type ActionState = {
  ok: boolean;
  message: string;
  seasonId?: string;
  gwNumber?: number;
};

export async function generateGwReport(values: { seasonId: string; gwNumber: number }): Promise<ActionState> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/admin/reports/gw/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId: values.seasonId, gwNumber: Number(values.gwNumber) }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, message: data?.error || "Failed to generate." };
    }
    return { ok: true, message: "Report generated.", seasonId: values.seasonId, gwNumber: Number(values.gwNumber) };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Failed to generate." };
  }
}

export async function sweepMissingReports(): Promise<ActionState> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/admin/reports/gw/sweep`, { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, message: data?.error || "Sweep failed." };
    }
    return { ok: true, message: `Sweep complete. Processed ${Array.isArray(data.processed) ? data.processed.length : (data.generated ?? 0)}.` };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Sweep failed." };
  }
}
