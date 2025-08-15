import { db } from './db';
import { fetchFplFixtures, fetchFplTeams } from './fpl';

export async function syncFixturesForActiveSeason() {
  const season = await db.season.findFirst({ where: { isActive: true } });
  if (!season) throw new Error("No active season");

  const raw = await fetchFplFixtures();
  const byGw = new Map<number, any[]>();
  for (const f of raw) {
    if (f.event == null || !f.kickoff_time) continue;
    if (!byGw.has(f.event)) byGw.set(f.event, []);
    byGw.get(f.event)!.push(f);
  }

  for (const [gwNumber, fixtures] of byGw) {
    const gw = await db.gameweek.upsert({
      where: { seasonId_number: { seasonId: season.id, number: gwNumber } },
      update: {},
      create: { id: crypto.randomUUID(), seasonId: season.id, number: gwNumber, deadline: new Date() }
    });

    for (const fx of fixtures) {
      const home = await db.club.findFirst({ where: { fplTeamId: fx.team_h } });
      const away = await db.club.findFirst({ where: { fplTeamId: fx.team_a } });
      if (!home || !away) continue;

      await db.fixture.upsert({
        where: { id: String(fx.id) },
        update: {
          gwId: gw.id,
          kickoff: new Date(fx.kickoff_time!),
          homeGoals: fx.team_h_score ?? null,
          awayGoals: fx.team_a_score ?? null,
          status: fx.finished ? "FT" : "SCHEDULED",
          homeClubId: home.id,
          awayClubId: away.id
        },
        create: {
          id: String(fx.id),
          gwId: gw.id,
          kickoff: new Date(fx.kickoff_time!),
          status: fx.finished ? "FT" : "SCHEDULED",
          homeClubId: home.id,
          awayClubId: away.id
        }
      });
    }

    const kicks = fixtures.filter(f=>f.kickoff_time).map(f=>new Date(f.kickoff_time!)).sort((a,b)=>a.getTime()-b.getTime());
    if (kicks.length) {
      const deadline = new Date(kicks[0].getTime() - 30*60*1000);
      await db.gameweek.update({ where: { id: gw.id }, data: { deadline } });
    }
  }
}
