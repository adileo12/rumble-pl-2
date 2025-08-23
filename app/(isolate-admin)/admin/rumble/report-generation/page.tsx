import React from "react";
import { db } from "@/src/lib/db";
import { GwForm, SweepForm } from "./ActionForms";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSeasons(): Promise<string[]> {
  const rows = await db.season.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => r.id);
}

export default async function ReportGenerationPage() {
  const seasons = await getSeasons();
  const secretConfigured = Boolean(process.env.CRON_SECRET);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Report Generation</h1>

      {!secretConfigured && (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <b>Heads up:</b> set <code>CRON_SECRET</code> in your Vercel env so the API routes accept requests.
        </div>
      )}

      <div className="grid gap-6 max-w-3xl">
        <GwForm seasons={seasons} />
        <SweepForm />
      </div>
    </div>
  );
}
