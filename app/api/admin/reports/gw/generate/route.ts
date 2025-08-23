// app/api/admin/reports/gw/generate/route.ts
import { NextResponse } from "next/server";
import { ensureGWReadyForAB, ensureGWReadyForC, fetchClubCounts, fetchSourceCounts, fetchEliminatedNames } from "@/src/lib/reports";
import { quickChartUrl } from "@/src/lib/quickchart";
import { eliminationSVG } from "@/src/lib/svg";
import { db } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";

function assertCronAuth(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (expected && auth !== `Bearer ${expected}`) {
    throw new Error("Unauthorized");
  }
}

export const dynamic = "force-dynamic";
export const revalidate = false;

export async function POST(req: NextRequest) {
  // ✨ protect the endpoint (optional in dev if no CRON_SECRET is set)
  assertCronAuth(req);

  const { seasonId, gwNumber } = await req.json();
  if (!seasonId || typeof gwNumber !== "number") {
    return NextResponse.json({ ok: false, error: "seasonId and gwNumber required" }, { status: 400 });
  }

  // Idempotence check
  const exists = await db.rumbleReport.findUnique({ where: { seasonId_gwNumber: { seasonId, gwNumber } } });
  if (exists) return NextResponse.json({ ok: true, already: true });

  // Validations
  await ensureGWReadyForAB({ seasonId, gwNumber });

  const clubCounts = await fetchClubCounts({ seasonId, gwNumber });
  const sourceCounts = await fetchSourceCounts({ seasonId, gwNumber });

  const clubPieUrl = quickChartUrl(`Picks by club — GW ${gwNumber}`, clubCounts.map(x => x.label), clubCounts.map(x => x.value));
  const sourcePieUrl = quickChartUrl(`Manual vs Proxy — GW ${gwNumber}`, sourceCounts.map(x => x.label), sourceCounts.map(x => x.value));

  // Eliminations list (requires graded=true)
  await ensureGWReadyForC({ seasonId, gwNumber });
  const names = await fetchEliminatedNames({ seasonId, gwNumber });
  const svg = eliminationSVG({ seasonId, gwNumber, names });

  const payload = { clubPieUrl, sourcePieUrl, eliminatedSvg: svg };

  await db.rumbleReport.upsert({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
    create: { seasonId, gwNumber, payload },
    update: { payload },
  });

  return NextResponse.json({ ok: true, ...payload }, { status: 200 });
}
