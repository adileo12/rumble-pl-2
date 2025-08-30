// app/api/rumble/current/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { effectiveDeadline } from "@/src/lib/deadline";

// ---------- helpers ----------
async function last5Form(clubId: string, before: Date) {
  const rows = await db.fixture.findMany({
    where: {
      kickoff: { lt: before },
      status: "FT",
      OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
    },
    orderBy: { kickoff: "desc" },
    take: 5,
    select: {
      homeClubId: true,
      awayClubId: true,
      homeGoals: true,
      awayGoals: true,
    },
  });

  // newest->oldest → convert to oldest->newest for display
  return rows
    .map((r) => {
      const isHome = r.homeClubId === clubId;
      const gf = isHome ? (r.homeGoals ?? 0) : (r.awayGoals ?? 0);
      const ga = isHome ? (r.awayGoals ?? 0) : (r.homeGoals ?? 0);
      return gf > ga ? "W" : gf === ga ? "D" : "L";
    })
    .reverse();
}

// ---------- route ----------
export async function GET() {
  const sid = (await cookies()).get("sid")?.value ?? null;

  // 1) active season
  const season = await db.season.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, year: true },
  });
  if (!season) {
    return NextResponse.json({
      ok: true,
      data: {
        season: null,
        gw: null,
        fixtures: [] as any[],
        clubs: [] as any[],
        deadline: null as string | null,
        pickedClubId: null as string | null,
        usedClubIds: [] as string[],
      },
    });
  }

  // 2) current gameweek: nearest future stored deadline, else most recent past
  const now = new Date();
  const gw =
    (await db.gameweek.findFirst({
      where: { seasonId: season.id, deadline: { gte: now } },
      orderBy: { deadline: "asc" },
      select: { id: true, number: true, isLocked: true, deadline: true },
    })) ??
    (await db.gameweek.findFirst({
      where: { seasonId: season.id, deadline: { lt: now } },
      orderBy: { deadline: "desc" },
      select: { id: true, number: true, isLocked: true, deadline: true },
    }));

  if (!gw) {
    return NextResponse.json({
      ok: true,
      data: {
        season,
        gw: null,
        fixtures: [] as any[],
        clubs: [] as any[],
        deadline: null as string | null,
        pickedClubId: null as string | null,
        usedClubIds: [] as string[],
      },
    });
  }

  // 3) fixtures for this GW
  const fixtures = await db.fixture.findMany({
    where: { gwId: gw.id },
    orderBy: { kickoff: "asc" },
    select: { id: true, kickoff: true, status: true, homeClubId: true, awayClubId: true },
  });

  // 3.5) unified / effective deadline (stored GW.deadline or fixtures T-30)
  const eff = await effectiveDeadline(gw.id);
  const effIso = eff ? eff.toISOString() : null;
  const isLocked = eff ? Date.now() > eff.getTime() : false;

  // 4) clubs (active)
  const clubs = await db.club.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, shortName: true },
  });

  // 5) current pick (for UX hint)
  const currentPick: { clubId: string } | null = sid
    ? await db.pick.findUnique({
        where: { userId_gwId: { userId: sid, gwId: gw.id } },
        select: { clubId: true },
      })
    : null;

  // 6) clubs used earlier this season
  let usedClubIds: string[] = [];
  if (sid) {
    const past = await db.pick.findMany({
      where: { userId: sid, seasonId: season.id, gw: { number: { lt: gw.number } } },
      select: { clubId: true },
    });
    usedClubIds = Array.from(new Set(past.map((p) => p.clubId)));

    // If the unified deadline has passed, include the current pick in used set
    if (eff && Date.now() > eff.getTime() && currentPick?.clubId) {
      if (!usedClubIds.includes(currentPick.clubId)) usedClubIds.push(currentPick.clubId);
    }
  }

  // 7) last-5 form table (cutoff: up to "now" if pre-deadline, else up to deadline)
  const cutoff = eff && Date.now() > eff.getTime() ? eff : new Date();

  const clubById = new Map(clubs.map((c) => [c.id, c]));
  const table = await Promise.all(
    fixtures.map(async (fx) => {
      const home = clubById.get(fx.homeClubId)!;
      const away = clubById.get(fx.awayClubId)!;
      return {
        id: fx.id,
        kickoff: fx.kickoff?.toISOString() ?? "",
        home: {
          id: home.id,
          name: home.name,
          shortName: home.shortName,
          form: await last5Form(fx.homeClubId, cutoff),
        },
        away: {
          id: away.id,
          name: away.name,
          shortName: away.shortName,
          form: await last5Form(fx.awayClubId, cutoff),
        },
      };
    })
  );

  return NextResponse.json({
    ok: true,
    data: {
      season,
      gw: { id: gw.id, number: gw.number, isLocked, deadline: effIso },
      fixtures: table,
      clubs,
      deadline: effIso, // root-level mirror for existing UI
      pickedClubId: currentPick?.clubId ?? null,
      usedClubIds,
    },
  });
}
