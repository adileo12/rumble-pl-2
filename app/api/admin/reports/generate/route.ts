import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { POST as genOne } from '@/app/api/admin/reports/gw/generate/route'; // reuse handler

export const dynamic = 'force-dynamic';
export const revalidate = false;

export async function GET() {
  // Also allow GET for cron
  const now = new Date();

  // Find GWs whose deadline passed within last 36h and that don’t have a report yet
  const gws = await prisma.gameweek.findMany({
    where: {
      deadline: { lte: now },
    },
    select: { seasonId: true, gwNumber: true },
    orderBy: { deadline: 'desc' },
    take: 6,
  });

  const out: any[] = [];
  for (const gw of gws) {
    const existing = await prisma.rumbleReport.findUnique({
      where: { seasonId_gwNumber: { seasonId: gw.seasonId, gwNumber: gw.gwNumber } },
    });
    if (existing) continue;

    // call single-GW generator
    const resp = await genOne(new Request('http://local', {
      method: 'POST',
      body: JSON.stringify({ seasonId: gw.seasonId, gwNumber: gw.gwNumber }),
      headers: { 'content-type': 'application/json' }
    }) as any);
    out.push(await resp.json());
  }

  return NextResponse.json({ ok: true, generated: out.length, details: out });
}

// Vercel Cron hits GET; admins can POST manually with body to force a GW.
export async function POST(req: Request) {
  return GET(); // keep it simple
}
