import { NextResponse } from 'next/server';
import { ensureGWReadyForAB, ensureGWReadyForC, fetchClubCounts, fetchSourceCounts, fetchEliminatedNames } from '@/lib/reports';
import { quickChartUrl } from '@/lib/quickchart';
import { eliminationSVG } from '@/lib/svg';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth'; // your existing guard

export const dynamic = 'force-dynamic';
export const revalidate = false;

export async function POST(req: Request) {
  await requireAdmin(); // throws if not admin

  const { seasonId, gwNumber, force } = await req.json();

  // Check idempotence
  const existing = await prisma.rumbleReport.findUnique({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
  });
  if (existing && !force) {
    return NextResponse.json({ ok: true, already: true, ...existing.payload }, { status: 200 });
  }

  // A + B validations
  await ensureGWReadyForAB({ seasonId, gwNumber });

  const clubCounts = await fetchClubCounts({ seasonId, gwNumber });
  const sourceCounts = await fetchSourceCounts({ seasonId, gwNumber });

  const clubPieUrl = quickChartUrl(
    `GW ${gwNumber} — Club Picks Share`,
    clubCounts.map(x => x.label),
    clubCounts.map(x => x.value),
  );

  const sourcePieUrl = quickChartUrl(
    `GW ${gwNumber} — Manual vs Proxy`,
    sourceCounts.map(x => x.label),
    sourceCounts.map(x => x.value),
  );

  // C validations
  await ensureGWReadyForC({ seasonId, gwNumber });
  const names = await fetchEliminatedNames({ seasonId, gwNumber });
  const svg = eliminationSVG({ seasonId, gwNumber, names });

  // Option A: persist SVG string in DB; Option B: upload to S3 and store URL.
  // Here we keep it simple and store SVG in DB + expose a tiny serve endpoint.
  const payload = { clubPieUrl, sourcePieUrl, eliminatedSvg: svg };

  await prisma.rumbleReport.upsert({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
    create: { seasonId, gwNumber, payload },
    update: { payload, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, ...payload }, { status: 200 });
}
