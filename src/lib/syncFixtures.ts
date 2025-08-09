import { db } from './db';
import { fetchFplFixtures, fetchFplTeams } from './fpl';

function norm(s: string) {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
}

export async function syncFixturesForActiveSeason() {
  const season = await db.season.findFirst({ where: { isActive: true } });
  if (!season) throw new Error("No active season");

  // 1) Make sure clubs have correct fplTeamId for current season
  const teams = await fetchFplTeams();
  const mapByShort = new Map(teams.map(t => [t.short_name.toUpperCase(), t.id]));
  const mapByName = new Map(teams.map(t => [norm(t.name), t.id]));

  const clubs = await db.club.findMany();
  for (const c of clubs) {
    if (c.fplTeamId) continue;
    const fromShort = mapByShort.get(c.shortName.toUpperCase());
    const fromName = mapByName.get(norm(c.name));
    const id = fromShort ?? fromName;
    if (id) {
      await db.club.update({ where: { id: c.id }, data: { fplTeamId: id } });
    }
  }

  // 2) Fetch fixtures and upsert
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
          gameweekId: gw.id,
          kickoff: new Date(fx.kickoff_time!),
          homeGoals: fx.team_h_score ?? null,
          awayGoals: fx.team_a_score ?? null,
          status: fx.finished ? "FT" : "SCHEDULED",
          homeClubId: home.id,
          awayClubId: away.id
        },
        create: {
          id: String(fx.id),
          gameweekId: gw.id,
          kickoff: new Date(fx.kickoff_time!),
          status: fx.finished ? "FT" : "SCHEDULED",
          homeClubId: home.id,
          awayClubId: away.id
        }
      });
    }

    // 3) Deadline = 30 min before first kick of the GW
    const kicks = fixtures
      .filter(f => f.kickoff_time)
      .map(f => new Date(f.kickoff_time!))
      .sort((a, b) => a.getTime() - b.getTime());
    if (kicks.length) {
      const deadline = new Date(kicks[0].getTime() - 30 * 60 * 1000);
      await db.gameweek.update({ where: { id: gw.id }, data: { deadline } });
    }
  }
}
