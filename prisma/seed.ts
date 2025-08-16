// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Clubs (upsert by unique id)
  const arsenal = await prisma.club.upsert({
    where: { id: "club-arsenal" },
    update: {},
    create: {
      id: "club-arsenal",
      name: "Arsenal",
      shortName: "ARS",
      active: true,
    },
  });

  const chelsea = await prisma.club.upsert({
    where: { id: "club-chelsea" },
    update: {},
    create: {
      id: "club-chelsea",
      name: "Chelsea",
      shortName: "CHE",
      active: true,
    },
  });

  // Season (keep one active)
  const season = await prisma.season.upsert({
    where: { id: "season-2025" },
    update: { isActive: true },
    create: {
      id: "season-2025",
      name: "Premier League 2025",
      year: 2025,
      isActive: true,
    },
  });

  // FUTURE gameweek so the app considers it “current”
  const deadline = new Date(Date.now() + 1000 * 60 * 60 * 24); // +24h
  const gw1 = await prisma.gameweek.upsert({
    where: { id: "gw-1" },
    update: {
      seasonId: season.id,
      number: 1,
      deadline,
      isLocked: false,
      graded: false,
    },
    create: {
      id: "gw-1",
      seasonId: season.id,
      number: 1,
      deadline,
      isLocked: false,
      graded: false,
    },
  });

  // One upcoming fixture (kickoff after deadline)
  const kickoff = new Date(deadline.getTime() + 1000 * 60 * 60); // +1h
  await prisma.fixture.upsert({
    where: { id: "fix-ars-che" },
    update: {
      gwId: gw1.id,
      homeClubId: arsenal.id,
      awayClubId: chelsea.id,
      kickoff,
      status: "SCHEDULED",
    },
    create: {
      id: "fix-ars-che",
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
  .finally(() => prisma.$disconnect());
