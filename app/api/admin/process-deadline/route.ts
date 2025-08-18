generator client {
  provider = "prisma-client-js";
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id                 String         @id @default(uuid())
  name               String
  secretCode         String         @unique(map: "User_secretCode_key") @map("secretcode") @db.VarChar(64)
  joinCode           String?        @default("PUBLIC")
  isAdmin            Boolean        @default(false)
  alive              Boolean        @default(true)
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  email              String?        @unique(map: "User_email_key")
  adminPassword      String?        @map("admin_password")
  adminPasswordHash  String?        @map("adminpasswordhash")
  lastName           String?

  picks              Pick[]
  statuses           UserStatus[]
  sessions           Session[]
  jokerUsages        JokerUsage[]

  @@map("User")
  @@index([name])
}

model Season {
  id                String            @id @default(uuid())
  name              String
  year              Int
  isActive          Boolean           @default(true)

  gameweeks         Gameweek[]
  statuses          UserStatus[]
  jokerAssignments  JokerAssignment[]
  rumbleStates      RumbleState[]

  @@index([isActive])
}

model Gameweek {
  id                String     @id @default(uuid())
  seasonId          String
  number            Int
  deadline          DateTime
  isLocked          Boolean    @default(false)
  graded            Boolean    @default(false)
  start             DateTime?
  end               DateTime?

  season            Season     @relation(fields: [seasonId], references: [id], onDelete: Cascade)

  picks             Pick[]
  fixtures          Fixture[]
  jokerAssignments  JokerAssignment[]
  jokerUsages       JokerUsage[]

  @@unique([seasonId, number], name: "seasonId_number")
  @@index([seasonId])
  @@index([deadline])
}

model Club {
  id                String         @id @default(uuid())
  name              String
  shortName         String
  crestUrl          String?
  active            Boolean        @default(true)
  fplTeamId         Int?           @unique

  picks             Pick[]
  homeFix           Fixture[]      @relation("HomeTeam")
  awayFix           Fixture[]      @relation("AwayTeam")
  jokerAssignments  JokerAssignment[]
  jokerUsages       JokerUsage[]

  @@index([active])
}

model Fixture {
  id           String   @id @default(uuid())

  gwId         String
  gw           Gameweek @relation(fields: [gwId], references: [id], onDelete: Cascade)

  homeClubId   String
  homeClub     Club     @relation("HomeTeam", fields: [homeClubId], references: [id], onDelete: Cascade)

  awayClubId   String
  awayClub     Club     @relation("AwayTeam", fields: [awayClubId], references: [id], onDelete: Cascade)

  kickoff      DateTime
  homeGoals    Int?
  awayGoals    Int?
  status       String

  @@index([gwId])
  @@index([kickoff])
  @@index([homeClubId])
  @@index([awayClubId])
}

model Pick {
  id          String    @id @default(uuid())

  userId      String
  seasonId    String
  gwId        String
  clubId      String

  createdAt   DateTime  @default(now())
  source      String    @default("USER")

  // Relations
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  gw          Gameweek  @relation(fields: [gwId], references: [id], onDelete: Cascade)
  club        Club      @relation(fields: [clubId], references: [id], onDelete: Cascade)

  // You asked for both — keep them so the code can use either:
  @@unique([userId, seasonId, gwId], name: "userId_seasonId_gwId")
  @@unique([userId, gwId], name: "userId_gwId")

  // Helpful indexes for lookups
  @@index([userId])
  @@index([seasonId])
  @@index([gwId])
  @@index([clubId])
}

model UserStatus {
  id                  String   @id @default(uuid())
  userId              String
  seasonId            String
  isAlive             Boolean  @default(true)
  eliminatedGw        Int?
  jokerLifelinesLeft  Int      @default(2)
  lastUpdated         DateTime @default(now()) @updatedAt

  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  season              Season   @relation(fields: [seasonId], references: [id], onDelete: Cascade)

  @@unique([userId, seasonId], name: "userId_seasonId")
  @@index([userId])
  @@index([seasonId])
}

model Session {
  id         String   @id @default(uuid())
  userId     String
  token      String   @unique
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model JokerAssignment {
  id          String   @id @default(uuid())
  seasonId    String
  gameweekId  String
  clubId      String
  createdAt   DateTime @default(now())

  season      Season   @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  gameweek    Gameweek @relation(fields: [gameweekId], references: [id], onDelete: Cascade)
  club        Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@unique([seasonId, gameweekId], name: "seasonId_gameweekId")
  @@index([seasonId])
  @@index([gameweekId])
  @@index([clubId])
}

model JokerUsage {
  id          String   @id @default(uuid())
  userId      String
  gameweekId  String
  clubId      String
  pickedAt    DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  gameweek    Gameweek @relation(fields: [gameweekId], references: [id], onDelete: Cascade)
  club        Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)

  // Optional business rule: only one joker usage per user per gameweek
  @@unique([userId, gameweekId], name: "userId_gameweekId")

  @@index([userId])
  @@index([gameweekId])
  @@index([clubId])
}

model RumbleState {
  id              String   @id @default(uuid())
  userId          String
  seasonId        String
  proxiesUsed     Int      @default(0)  // 0..2
  lazarusUsed     Boolean  @default(false)
  eliminatedAtGw  Int?
  eliminatedAt    DateTime?

  season          Season   @relation(fields: [seasonId], references: [id])

  @@unique([userId, seasonId])
}
