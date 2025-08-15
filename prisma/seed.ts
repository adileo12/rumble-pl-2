// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1) Clubs
  const arsenal = await prisma.club.upsert({
    where: { shortName: "ARS" },
    update: {},
    create: { name: "Arsenal", shortName: "ARS", active: true },
  });

  const chelsea = await prisma.club.upsert({
    where: { shortName: "CHE" },
    update: {},
    create: { name: "Chelsea", shortName: "CHE", active: true },
  });

  // 2) Season (set active)
  const season2025 = await prisma.season.upsert({
    where: { name: "Premier League 2025" },
    update: { isActive: true },
    create: {
      name: "Premier League 2025",
      year: 2025,
      isActive: true,
    },
  });

  // 3) A FUTURE gameweek so it’s considered “current”
  //    (Deadline needs to be in the future relative to server time)
  const deadline = new Date(Date.now() + 1000 * 60 * 60 * 24); // +24h
  const gw1 = await prisma.gameweek.upsert({
    where: { // unique(seasonId, number) so compose this manually:
      // create a fake compound unique via a stable id; we can instead findFirst and then update/create:
      // Using findFirst approach:
      // We'll upsert by number+season via a find then create if missing.
      // BUT Prisma upsert requires a unique field. So we'll do two steps:
      id: "seed-gw-1" // workaround unique handle for upsert
    },
    update: {
      seasonId: season2025.id,
      number: 1,
      deadline,
      isLocked: false,
      graded: false
    },
    create: {
      id: "seed-gw-1",
      seasonId: season2025.id,
      number: 1,
      deadline,
      isLocked: false,
      graded: false
    },
  });

  // 4) One upcoming fixture in that GW (kickoff after deadline)
  const kickoff = new Date(deadline.getTime() + 1000 * 60 * 60); // +1h after deadline
  await prisma.fixture.upsert({
    where: { id: "seed-fix-ars-che" },
    update: {
      gwId: gw1.id,
      homeClubId: arsenal.id,
      awayClubId: chelsea.id,
      kickoff,
      status: "SCHEDULED",
    },
    create: {
      id: "seed-fix-ars-che",
      gwId: gw1.id,
      homeClubId: arsenal.id,
      awayClubId: chelsea.id,
      kickoff,
      status: "SCHEDULED",
    },
  });

  console.log("Seed completed ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
