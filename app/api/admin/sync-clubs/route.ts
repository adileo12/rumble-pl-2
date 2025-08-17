// app/api/admin/sync-clubs/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

type FplBootstrap = {
  teams: { id: number; name: string; short_name: string }[];
};

function normalizeName(n: string) {
  return n.trim();
}

export async function POST() {
  const res = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
  if (!res.ok) return NextResponse.json({ ok: false, error: "FPL bootstrap fetch failed" }, { status: 502 });
  const data = (await res.json()) as FplBootstrap;

  for (const t of data.teams) {
    const name = normalizeName(t.name);
    const short = t.short_name;

    // Try exact short_name (case-insensitive), else try name (case-insensitive)
    const existing =
      (await db.club.findFirst({
        where: { shortName: { equals: short, mode: "insensitive" } },
        select: { id: true },
      })) ||
      (await db.club.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
        select: { id: true },
      }));

    if (existing) {
      await db.club.update({
        where: { id: existing.id },
        data: { name, shortName: short, active: true },
      });
    } else {
      await db.club.create({
        data: { name, shortName: short, active: true },
      });
    }
  }

  return NextResponse.json({ ok: true, count: data.teams.length });
}
