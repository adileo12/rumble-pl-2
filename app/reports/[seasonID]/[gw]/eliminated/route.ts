import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = false;

export async function GET(_: Request, { params }: { params: { seasonId: string; gw: string } }) {
  const seasonId = params.seasonId;
  const gwNumber = Number(params.gw);
  const rep = await prisma.rumbleReport.findUnique({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
  });
  if (!rep) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const svg = (rep.payload as any).eliminatedSvg as string | undefined;
  if (!svg) return NextResponse.json({ error: 'SVG missing' }, { status: 404 });

  return new NextResponse(svg, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
}
