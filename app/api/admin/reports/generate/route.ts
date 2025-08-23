// app/api/admin/reports/generate/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = false;

function assertCronAuth(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (expected && auth !== `Bearer ${expected}`) {
    throw new Error("Unauthorized");
  }
}

// GET is invoked by schedulers; POST can be used manually
export async function GET() {
  const now = new Date();
  // Find GWs with deadline passed in last 36h and with no report yet
  const cutoff = new Date(now.getTime() - 36 * 60 * 60 * 1000);

  const gws = await db.gameweek.findMany({
    where: {
      deadline: { lte: now, gte: cutoff },
    },
    select: { id: true, number: true, seasonId: true },
    orderBy: [{ seasonId: "asc" }, { number: "asc" }],
  });

  const out: any[] = [];
  for (const gw of gws) {
    const exists = await db.rumbleReport.findUnique({
      where: { seasonId_gwNumber: { seasonId: gw.seasonId, gwNumber: gw.number } },
      select: { seasonId: true },
    });
    if (exists) continue;

    const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/reports/gw/generate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-scheduler": "true", "authorization": `Bearer ${process.env.CRON_SECRET ?? ""}` },
      body: JSON.stringify({ seasonId: gw.seasonId, gwNumber: gw.number }),
    });
    out.push({ gw: gw.number, seasonId: gw.seasonId, status: resp.status, text: await resp.text() });
  }

  return NextResponse.json({ ok: true, generated: out.length, details: out });
}

export async function POST() {
  return GET();
}
