import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // 1) Season
  const season = await db.season.upsert({
    where: { id: "seed-season" }, // fixed id for repeatable runs
    update: { isActive: true },
    create: {
      id: "seed-season",
      name: "2025/26",
      year: 2025,
      isActive: true,
    },
  });

  // 2) Gameweek (deadline a few hours from now)
  const gw = await db.gameweek.upsert({
    where: { id: "seed-gw-1" },
    update: {},
    create: {
      id: "seed-gw-1",
      seasonId: season.id,
      number: 1,
      deadline: new Date(Date.now() + 6 * 60 * 60 * 1000),
      isLocked: false,
      graded: false,
    },
  });

  // 3) Clubs
  const clubA = await db.club.upsert({
    where: { id: "club-a" },
    update: {},
    create: { id: "club-a", name: "Alpha FC", shortName: "ALP", active: true },
  });

  const clubB = await db.club.upsert({
    where: { id: "club-b" },
    update: {},
    create: { id: "club-b", name: "Bravo United", shortName: "BRV", active: true },
  });

  // 4) One fixture in that GW (kickoff in ~7 hours)
  await db.fixture.upsert({
    where: { id: "seed-fix-1" },
    update: {},
    create: {
      id: "seed-fix-1",
      gwId: gw.id,
      homeClubId: clubA.id,
      awayClubId: clubB.id,
      kickoff: new Date(Date.now() + 7 * 60 * 60 * 1000),
      status: "SCHEDULED",
    },
  });

  console.log("Seed complete 👍");
}

main().finally(() => db.$disconnect());
