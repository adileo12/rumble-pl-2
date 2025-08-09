import { NextResponse } from 'next/server';
- import { syncFixturesForActiveSeason } from '@/src/lib/syncFixtures';
+ import { syncFixturesForActiveSeason } from '../../../../src/lib/syncFixtures';


export async function POST() {
  try {
    await syncFixturesForActiveSeason();
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message ?? 'error' }, { status: 500 });
  }
}
