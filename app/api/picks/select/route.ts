export const runtime = 'nodejs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { getActiveSeason, getCurrentGameweek, isLockedForGW, clubsYouAlreadyPicked } from '@/src/lib/game';

export async function POST(req: Request) {
  try {
    const userId = cookies().get('rumble_session')?.value;
    if (!userId) return NextResponse.json({ ok: false, error: 'Not logged in' }, { status: 401 });

    const { clubId } = await req.json().catch(() => ({}));
    if (!clubId) return NextResponse.json({ ok: false, error: 'clubId required' }, { status: 400 });

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.alive) return NextResponse.json({ ok: false, error: 'User not found or eliminated' }, { status: 400 });

    const season = await getActiveSeason();
    if (!season) return NextResponse.json({ ok: false, error: 'No active season' }, { status: 400 });

    const gw = await getCurrentGameweek(season.id);
    if (!gw) return NextResponse.json({ ok: false, error: 'No gameweek found' }, { status: 400 });

    // Enforce lock
    if (await isLockedForGW(season.id, gw.id)) {
      return NextResponse.json({ ok: false, error: 'Deadline passed for this gameweek' }, { status: 400 });
    }

    // Enforce once-per-club
    const used = await clubsYouAlreadyPicked(user.id, season.id);
    if (used.has(clubId)) {
      return NextResponse.json({ ok: false, error: 'You already used this club this season' }, { status: 400 });
    }

    // Upsert pick for this GW (allow change before lock)
    const pick = await db.pick.upsert({
      where: { userId_gameweekId: { userId: user.id, gameweekId: gw.id } },
      update: { clubId },
      create: { userId: user.id, seasonId: season.id, gameweekId: gw.id, clubId }
    });

    return NextResponse.json({ ok: true, pick });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
