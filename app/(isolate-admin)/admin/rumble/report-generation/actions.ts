"use server";

import { generateGwReportCore, sweepMissingReportsCore } from "@/src/lib/reports-core";

export type ActionState = { ok: boolean; message: string };

export async function generateGwReport(values: { seasonId: string; gwNumber: number }): Promise<ActionState> {
  const seasonId = (values.seasonId ?? "").trim();
  const gwNumber = Number(values.gwNumber);
  if (!seasonId || Number.isNaN(gwNumber)) {
    return { ok: false, message: "seasonId and gwNumber required" };
  }
  try {
    await generateGwReportCore({ seasonId, gwNumber });
    return { ok: true, message: "Report generated." };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Failed to generate." };
  }
}

export async function sweepMissingReports(): Promise<ActionState> {
  try {
    const res = await sweepMissingReportsCore();
    return { ok: true, message: `Sweep complete. Generated ${res.generated}.` };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Sweep failed." };
  }
}
