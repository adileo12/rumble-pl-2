import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // if you still have a legacy plaintext field "adminPassword", select it here
  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    select: { id: true, /* adminPassword: true, */ adminPasswordHash: true },
  });

  for (const u of admins) {
    // if (!u.adminPassword) continue;
    if (u.adminPasswordHash) continue;

    // const hash = await bcrypt.hash(u.adminPassword, 12);
    // await prisma.user.update({ where: { id: u.id }, data: { adminPasswordHash: hash } });
  }
  console.log("Done.");
}

main().finally(() => prisma.$disconnect());