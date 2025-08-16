// app/api/admin/sync-fixtures/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

type FplBootstrap = {
  events: { id: number; deadline_time: string | null }[];
  teams: { id: number; name: string; short_name: string }[];
};
type FplFixture = {
  id: number;
  event: number | null;         // GW number
  kickoff_time: string | null;
  finished: boolean;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
};

export async function POST() {
  const season = await db.season.findFirst({ where: { isActive: true } });
  if (!season) return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });

  const boot = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
  if (!boot.ok) return NextResponse.json({ ok: false, error: "FPL bootstrap fetch failed" }, { status: 502 });
  const bootstrap = (await boot.json()) as FplBootstrap;

  const fxRes = await fetch("https://fantasy.premierleague.com/api/fixtures/");
  if (!fxRes.ok) return NextResponse.json({ ok: false, error: "FPL fixtures fetch failed" }, { status: 502 });
  const fplFixtures = (await fxRes.json()) as FplFixture[];

  // Build team id -> clubId map
  const clubs = await db.club.findMany({ select: { id: true, name: true, shortName: true } });
  const clubByShort = new Map(clubs.map(c => [c.shortName, c]));
  const shortByFplId = new Map(bootstrap.teams.map(t => [t.id, t.short_name]));

  const clubIdByFplId = new Map<number, string>();
  for (const t of bootstrap.teams) {
    const short = t.short_name;
    const found = clubByShort.get(short);
    if (found) clubIdByFplId.set(t.id, found.id);
  }

  // Upsert gameweeks
  for (const ev of bootstrap.events) {
    if (!ev.deadline_time) continue;
    const existing = await db.gameweek.findFirst({
      where: { seasonId: season.id, number: ev.id },
    });
    const deadline = new Date(ev.deadline_time);
    if (existing) {
      await db.gameweek.update({
        where: { id: existing.id },
        data: { deadline },
      });
    } else {
      await db.gameweek.create({
        data: { seasonId: season.id, number: ev.id, deadline },
      });
    }
  }

  // Upsert fixtures
  let upserted = 0;
  for (const fx of fplFixtures) {
    if (!fx.event) continue; // ignore cup/unknown
    const homeClubId = clubIdByFplId.get(fx.team_h);
    const awayClubId = clubIdByFplId.get(fx.team_a);
    if (!homeClubId || !awayClubId) continue;

    const gw = await db.gameweek.findFirst({
      where: { seasonId: season.id, number: fx.event },
    });
    if (!gw) continue;

    const kickoff = fx.kickoff_time ? new Date(fx.kickoff_time) : null;
    const status = fx.finished ? "FT" : "NS";

    // find existing by (gw, home, away, kickoff)
    const existing = await db.fixture.findFirst({
      where: { gwId: gw.id, homeClubId, awayClubId, kickoff },
    });

    if (existing) {
      await db.fixture.update({
        where: { id: existing.id },
        data: {
          status,
          homeGoals: fx.team_h_score,
          awayGoals: fx.team_a_score,
        },
      });
    } else {
      await db.fixture.create({
        data: {
          gwId: gw.id,
          homeClubId,
          awayClubId,
          kickoff,
          status,
          homeGoals: fx.team_h_score,
          awayGoals: fx.team_a_score,
        },
      });
    }
    upserted++;
  }

  return NextResponse.json({ ok: true, gameweeks: bootstrap.events.length, fixtures: upserted });
}
