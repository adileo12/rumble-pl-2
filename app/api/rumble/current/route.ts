// app/api/rumble/current/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

// ---------- helpers ----------
function computeDeadline(kickoffs: (Date | null)[]) {
  const ks = kickoffs.filter(Boolean) as Date[];
  if (!ks.length) return null;
  const earliest = new Date(Math.min(...ks.map((d) => d.getTime())));
  return new Date(earliest.getTime() - 30 * 60 * 1000); // T-30m
}

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

  // 2) current gameweek: nearest future deadline, else most recent past
  const now = new Date();
  let gw =
    (await db.gameweek.findFirst({
      where: { seasonId: season.id, deadline: { gte: now } },
      orderBy: { deadline: "asc" },
      select: {
        id: true,
        number: true,
        isLocked: true,
        deadline: true,
      },
    })) ??
    (await db.gameweek.findFirst({
      where: { seasonId: season.id, deadline: { lt: now } },
      orderBy: { deadline: "desc" },
      select: {
        id: true,
        number: true,
        isLocked: true,
        deadline: true,
      },
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
    select: {
      id: true,
      kickoff: true,
      status: true,
      homeClubId: true,
      awayClubId: true,
    },
  });

  // deadline (trust GW.deadline if present; else derive)
  const derived = computeDeadline(fixtures.map((f) => f.kickoff));
  const deadline = gw.deadline ?? derived;

  // 4) clubs (active)
  const clubs = await db.club.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, shortName: true },
  });

  // 5) current pick (for UX hint)
  const currentPick =
    sid &&
    (await db.pick.findUnique({
      where: { userId_gwId: { userId: sid, gwId: gw.id } },
      select: { clubId: true },
    }));

  // 6) clubs you used earlier this season (server-enforced carry-forward)
  let usedClubIds: string[] = [];
  if (sid) {
    // we only want picks from earlier GWs
    const past = await db.pick.findMany({
      where: {
        userId: sid,
        seasonId: season.id,
        gw: { number: { lt: gw.number } }, // relation filter
      },
      select: { clubId: true },
    });
    usedClubIds = Array.from(new Set(past.map((p) => p.clubId)));

    // If deadline passed, also lock the current GW pick into the used set
    if (deadline && Date.now() > deadline.getTime() && currentPick?.clubId) {
      if (!usedClubIds.includes(currentPick.clubId)) usedClubIds.push(currentPick.clubId);
    }
  }

  // 7) last-5 form table (cutoff: up to "now" if pre-deadline, else up to deadline)
  const cutoff =
    deadline && Date.now() > deadline.getTime() ? deadline : new Date();

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
      gw: {
        id: gw.id,
        number: gw.number,
        isLocked: Boolean(deadline && Date.now() > deadline.getTime()),
        deadline: deadline ? deadline.toISOString() : null,
      },
      fixtures: table,
      clubs,
      deadline: deadline ? deadline.toISOString() : null,
      pickedClubId: currentPick?.clubId ?? null,
      usedClubIds,
    },
  });
}
