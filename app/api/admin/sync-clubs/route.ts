// app/api/admin/sync-clubs/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

type FplBootstrap = {
  teams: { id: number; name: string; short_name: string }[];
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

export async function POST() {
  const res = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "FPL bootstrap fetch failed" }, { status: 502 });
  }
  const data = (await res.json()) as FplBootstrap;

  // Load existing once and build case-insensitive maps (SQLite can't use `mode: "insensitive"`)
  const existingClubs = await db.club.findMany({
    select: { id: true, name: true, shortName: true },
  });
  const byShort = new Map(existingClubs.map(c => [norm(c.shortName), c]));
  const byName  = new Map(existingClubs.map(c => [norm(c.name), c]));

  let created = 0, updated = 0;

  for (const t of data.teams) {
    const name = t.name.trim();
    const short = t.short_name.trim();
    const keyShort = norm(short);
    const keyName  = norm(name);

    const match = byShort.get(keyShort) || byName.get(keyName);

    if (match) {
      await db.club.update({
        where: { id: match.id },
        data: { name, shortName: short, active: true },
      });
      // keep maps current to avoid re-creating within the same run
      byShort.set(keyShort, { id: match.id, name, shortName: short });
      byName.set(keyName,   { id: match.id, name, shortName: short });
      updated++;
    } else {
      const createdRow = await db.club.create({
        data: { name, shortName: short, active: true },
        select: { id: true, name: true, shortName: true },
      });
      byShort.set(keyShort, createdRow);
      byName.set(keyName, createdRow);
      created++;
    }
  }

  return NextResponse.json({ ok: true, created, updated, totalFromFpl: data.teams.length });
}
