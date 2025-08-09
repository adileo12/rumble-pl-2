import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { formatIst } from '@/src/lib/time';

export async function GET() {
  try {
    const season = await db.season.findFirst({ where: { isActive: true } });
    const gw = season ? await db.gameweek.findFirst({ where: { seasonId: season.id }, orderBy: { number: 'asc' } }) : null;
    return NextResponse.json({
      ok: true,
      season: season?.name ?? null,
      firstGWDeadlineIST: gw?.deadline ? formatIst(gw.deadline) : null
    });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message ?? 'error' }, { status: 500 });
  }
}
