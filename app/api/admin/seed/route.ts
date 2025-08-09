import { NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';


export async function POST() {
  try {
    const clubs = [
      { name: 'Arsenal', shortName: 'ARS', fplTeamId: 1 },
      { name: 'Aston Villa', shortName: 'AVL', fplTeamId: 2 },
      { name: 'Bournemouth', shortName: 'BOU', fplTeamId: 3 },
      { name: 'Brentford', shortName: 'BRE', fplTeamId: 4 },
      { name: 'Brighton', shortName: 'BHA', fplTeamId: 5 },
      { name: 'Chelsea', shortName: 'CHE', fplTeamId: 6 },
      { name: 'Crystal Palace', shortName: 'CRY', fplTeamId: 7 },
      { name: 'Everton', shortName: 'EVE', fplTeamId: 8 },
      { name: 'Fulham', shortName: 'FUL', fplTeamId: 9 },
      { name: 'Ipswich Town', shortName: 'IPS', fplTeamId: 10 },
      { name: 'Leicester City', shortName: 'LEI', fplTeamId: 11 },
      { name: 'Liverpool', shortName: 'LIV', fplTeamId: 12 },
      { name: 'Manchester City', shortName: 'MCI', fplTeamId: 13 },
      { name: 'Manchester United', shortName: 'MUN', fplTeamId: 14 },
      { name: 'Newcastle United', shortName: 'NEW', fplTeamId: 15 },
      { name: 'Nottingham Forest', shortName: 'NFO', fplTeamId: 16 },
      { name: 'Southampton', shortName: 'SOU', fplTeamId: 17 },
      { name: 'Tottenham Hotspur', shortName: 'TOT', fplTeamId: 18 },
      { name: 'West Ham United', shortName: 'WHU', fplTeamId: 19 },
      { name: 'Wolverhampton Wanderers', shortName: 'WOL', fplTeamId: 20 }
    ];

    for (const c of clubs) {
      await db.club.upsert({
        where: { shortName: c.shortName },
        update: { name: c.name, fplTeamId: c.fplTeamId, active: true },
        create: { id: crypto.randomUUID(), name: c.name, shortName: c.shortName, active: true, fplTeamId: c.fplTeamId }
      });
    }

    const year = new Date().getUTCFullYear();
    const existing = await db.season.findFirst({ where: { isActive: true } });
    if (!existing) {
      await db.season.create({ data: { id: crypto.randomUUID(), name: `PL ${year}/${year+1}`, year, isActive: true } });
    }

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message ?? 'error' }, { status: 500 });
  }
}
