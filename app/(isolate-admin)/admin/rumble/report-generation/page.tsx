import React from "react";
import { db } from "@/src/lib/db";
import { GwForm, SweepForm } from "./ActionForms";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSeasons(): Promise<string[]> {
  const rows = await db.season.findMany({ select: { id: true }, orderBy: { id: "asc" } });
  return rows.map((r) => r.id);
}

export default async function ReportGenerationPage() {
  const seasons = await getSeasons();
  const secretConfigured = Boolean(process.env.CRON_SECRET);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Report Generation</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GwForm seasons={seasons} />
        <SweepForm secretConfigured={secretConfigured} />
      </div>
    </div>
  );
}
