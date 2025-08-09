import { NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';

export async function POST() {
  try {
    const clubs = [
      { name: 'Arsenal', shortName: 'ARS' },
      { name: 'Aston Villa', shortName: 'AVL' },
      { name: 'AFC Bournemouth', shortName: 'BOU' },
      { name: 'Brentford', shortName: 'BRE' },
      { name: 'Brighton & Hove Albion', shortName: 'BHA' },
      { name: 'Burnley', shortName: 'BUR' },
      { name: 'Chelsea', shortName: 'CHE' },
      { name: 'Crystal Palace', shortName: 'CRY' },
      { name: 'Everton', shortName: 'EVE' },
      { name: 'Fulham', shortName: 'FUL' },
      { name: 'Leeds United', shortName: 'LEE' },
      { name: 'Liverpool', shortName: 'LIV' },
      { name: 'Manchester City', shortName: 'MCI' },
      { name: 'Manchester United', shortName: 'MUN' },
      { name: 'Newcastle United', shortName: 'NEW' },
      { name: 'Nottingham Forest', shortName: 'NFO' },
      { name: 'Sunderland', shortName: 'SUN' },
      { name: 'Tottenham Hotspur', shortName: 'TOT' },
      { name: 'West Ham United', shortName: 'WHU' },
      { name: 'Wolverhampton Wanderers', shortName: 'WOL' }
    ];

    for (const c of clubs) {
  const result = await db.club.updateMany({
    where: { shortName: c.shortName },
    data: { name: c.name, active: true }
  });

  if (result.count === 0) {
    await db.club.create({
      data: {
        id: crypto.randomUUID(),
        name: c.name,
        shortName: c.shortName,
        active: true
        // fplTeamId will be set later by sync via fetchFplTeams()
      }
    });
  }
}


    const year = new Date().getUTCFullYear();
    const existing = await db.season.findFirst({ where: { isActive: true } });
    if (!existing) {
      await db.season.create({
        data: { id: crypto.randomUUID(), name: `PL ${year}/${year + 1}`, year, isActive: true }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? 'error' }, { status: 500 });
  }
}
