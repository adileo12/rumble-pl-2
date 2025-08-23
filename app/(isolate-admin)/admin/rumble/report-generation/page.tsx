import React from "react";
import { db } from "@/src/lib/db";
import ActionForms from "./ActionForms";
import { generateGwReportAction, sweepMissingReportsAction } from "./actions";

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
      <ActionForms
        seasons={seasons}
        secretConfigured={secretConfigured}
        generateGwReportAction={generateGwReportAction}
        sweepMissingReportsAction={sweepMissingReportsAction}
      />
    </div>
  );
}
