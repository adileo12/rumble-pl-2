// app/api/admin/sync-clubs/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

type FplBootstrap = {
  teams: { id: number; name: string; short_name: string; }[];
};

export async function POST() {
  const res = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
  if (!res.ok) return NextResponse.json({ ok: false, error: "FPL bootstrap fetch failed" }, { status: 502 });
  const data = (await res.json()) as FplBootstrap;

  // Upsert teams by short_name (fallback to name when matching)
  for (const t of data.teams) {
    const existing =
      (await db.club.findFirst({ where: { shortName: t.short_name } })) ||
      (await db.club.findFirst({ where: { name: t.name } }));

    if (existing) {
      await db.club.update({
        where: { id: existing.id },
        data: { name: t.name, shortName: t.short_name, active: true },
      });
    } else {
      await db.club.create({
        data: { name: t.name, shortName: t.short_name, active: true },
      });
    }
  }

  return NextResponse.json({ ok: true, count: data.teams.length });
}
