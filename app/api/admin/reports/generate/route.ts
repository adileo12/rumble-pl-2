// app/api/admin/reports/generate/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

/**
 * Protects this endpoint for schedulers (GitHub Actions, Vercel Cron, etc.)
 * If CRON_SECRET is not set, auth is skipped (useful for local dev).
 */
function assertCronAuth(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return;
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    throw new Error("Unauthorized");
  }
}

export const dynamic = "force-dynamic";
export const revalidate = false;

/**
 * GET is used by schedulers; POST aliases to GET for convenience.
 * It finds GWs whose deadline passed recently and generates any missing reports.
 */
export async function GET(req: Request) {
  try {
    assertCronAuth(req);

    const now = new Date();
    const cutoff = new Date(now.getTime() - 36 * 60 * 60 * 1000); // last 36h

    const gws = await db.gameweek.findMany({
      where: { deadline: { lte: now, gte: cutoff } },
      select: { id: true, number: true, seasonId: true },
      orderBy: [{ seasonId: "asc" }, { number: "asc" }],
    });

    const details: Array<{ seasonId: string; gw: number; status: number; text: string }> = [];

    for (const gw of gws) {
      const exists = await db.rumbleReport.findUnique({
        where: { seasonId_gwNumber: { seasonId: gw.seasonId, gwNumber: gw.number } },
        select: { seasonId: true },
      });
      if (exists) continue;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/reports/gw/generate`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
          },
          body: JSON.stringify({ seasonId: gw.seasonId, gwNumber: gw.number }),
        }
      );

      details.push({
        seasonId: gw.seasonId,
        gw: gw.number,
        status: res.status,
        text: await res.text(),
      });
    }

    return NextResponse.json({ ok: true, generated: details.length, details });
  } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : "Internal error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

// Alias POST to GET (and forward the req so TypeScript is happy)
export async function POST(req: Request) {
  return GET(req);
}
