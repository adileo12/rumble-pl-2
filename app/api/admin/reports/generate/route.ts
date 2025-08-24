// app/api/admin/reports/generate/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function assertCronAuth(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return;
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) throw new Error("Unauthorized");
}

export async function POST(req: Request) {
  try {
    assertCronAuth(req);

    // find the last ~36h worth of GWs whose deadline has passed but report is missing
    const now = new Date();
    const since = new Date(now.getTime() - 36 * 60 * 60 * 1000);

    const gws = await db.gameweek.findMany({
      where: { deadline: { lte: now, gte: since } },
      select: { seasonId: true, number: true },
      orderBy: [{ seasonId: "asc" }, { number: "asc" }],
    });

    let created = 0, skipped = 0;
    for (const gw of gws) {
      const exists = await db.rumbleReport.findUnique({
        where: { seasonId_gwNumber: { seasonId: gw.seasonId, gwNumber: gw.number } },
        select: { seasonId: true },
      });
      if (exists) { skipped++; continue; }

      // call the per-GW generator internally
      const res = await fetch(new URL("/api/admin/reports/gw/generate", getBase()), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
        },
        body: JSON.stringify({ seasonId: gw.seasonId, gwNumber: gw.number }),
        cache: "no-store",
      });
      if (res.ok) created++;
    }

    return NextResponse.json({ ok: true, created, skipped });
  } catch (e: any) {
    const msg = e?.message || "Internal error";
    return NextResponse.json({ ok: false, error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

function getBase() {
  const direct = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (direct) return direct.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
