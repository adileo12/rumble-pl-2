export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import pg from 'pg';
const { Client } = pg as any;

export async function POST() {
  const cs = process.env.DATABASE_URL;
  if (!cs) return NextResponse.json({ ok: false, error: 'Missing DATABASE_URL' }, { status: 500 });

  const sql = `
  -- Enable uuid if not already
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  CREATE TABLE IF NOT EXISTS "Season" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS season_code_unique ON "Season"(code);

  CREATE TABLE IF NOT EXISTS "Club" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    shortName TEXT NOT NULL,
    fplTeamId INTEGER,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS club_shortname_unique ON "Club"(shortName);
  CREATE UNIQUE INDEX IF NOT EXISTS club_fplteamid_unique ON "Club"(fplTeamId) WHERE fplTeamId IS NOT NULL;

  CREATE TABLE IF NOT EXISTS "Gameweek" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seasonId UUID NOT NULL REFERENCES "Season"(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    deadline ISTIMESTAMPTZ NOT NULL
  );
  -- If the above line errors on ISTIMESTAMPTZ for your Postgres, use TIMESTAMPTZ instead:
  -- ALTER TABLE "Gameweek" ALTER COLUMN deadline TYPE TIMESTAMPTZ;

  CREATE UNIQUE INDEX IF NOT EXISTS gw_season_number_unique ON "Gameweek"(seasonId, number);

  CREATE TABLE IF NOT EXISTS "Fixture" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seasonId UUID NOT NULL REFERENCES "Season"(id) ON DELETE CASCADE,
    gameweekId UUID REFERENCES "Gameweek"(id) ON DELETE SET NULL,
    homeClubId UUID NOT NULL REFERENCES "Club"(id) ON DELETE RESTRICT,
    awayClubId UUID NOT NULL REFERENCES "Club"(id) ON DELETE RESTRICT,
    kickoff TIMESTAMPTZ,
    status TEXT,
    homeGoals INTEGER,
    awayGoals INTEGER
  );
  CREATE INDEX IF NOT EXISTS fixture_gw_idx ON "Fixture"(gameweekId);
  CREATE INDEX IF NOT EXISTS fixture_season_idx ON "Fixture"(seasonId);

  CREATE TABLE IF NOT EXISTS "User" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    secretCode TEXT NOT NULL UNIQUE,
    alive BOOLEAN NOT NULL DEFAULT TRUE,
    jokersRemaining INTEGER NOT NULL DEFAULT 2,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS "Pick" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    seasonId UUID NOT NULL REFERENCES "Season"(id) ON DELETE CASCADE,
    gameweekId UUID NOT NULL REFERENCES "Gameweek"(id) ON DELETE CASCADE,
    clubId UUID NOT NULL REFERENCES "Club"(id) ON DELETE RESTRICT,
    pickedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usedJoker BOOLEAN NOT NULL DEFAULT FALSE
  );
  CREATE UNIQUE INDEX IF NOT EXISTS pick_user_gw_unique ON "Pick"(userId, gameweekId);

  CREATE TABLE IF NOT EXISTS "JokerAssignment" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seasonId UUID NOT NULL REFERENCES "Season"(id) ON DELETE CASCADE,
    gameweekId UUID NOT NULL REFERENCES "Gameweek"(id) ON DELETE CASCADE,
    clubId UUID NOT NULL REFERENCES "Club"(id) ON DELETE RESTRICT,
    assignedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS joker_unique ON "JokerAssignment"(seasonId, gameweekId);

  CREATE TABLE IF NOT EXISTS "JokerUsage" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    gameweekId UUID NOT NULL REFERENCES "Gameweek"(id) ON DELETE CASCADE,
    clubId UUID NOT NULL REFERENCES "Club"(id) ON DELETE RESTRICT,
    pickedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS joker_usage_unique ON "JokerUsage"(userId, gameweekId);
  `;

  // small compatibility fix: some PGs don't know ISTIMESTAMPTZ; swap it.
  const fixedSql = sql.replace(/\bISTIMESTAMPTZ\b/g, 'TIMESTAMPTZ');

  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(fixedSql);
    await client.query('COMMIT');
    await client.end();
    return NextResponse.json({ ok: true, created: true });
  } catch (e: any) {
    try { await client.query('ROLLBACK'); } catch {}
    try { await client.end(); } catch {}
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
