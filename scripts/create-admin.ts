// scripts/create-admin.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function strongPassword(len = 12) {
  const lowers = "abcdefghjkmnpqrstuvwxyz";
  const uppers = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const specials = "!@#$%^&*()-_=+[]{}<>?";
  const all = lowers + uppers + digits + specials;

  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  // ensure at least one of each class
  const required = [pick(lowers), pick(uppers), pick(digits), pick(specials)];
  const restLen = Math.max(len - required.length, 0);
  const rest = Array.from({ length: restLen }, () => pick(all));
  const raw = [...required, ...rest];

  // shuffle
  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }
  return raw.join("");
}

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = strongPassword(12);
  const hash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      isAdmin: true,
      adminPasswordHash: hash,
      alive: true,
      joinCode: "PUBLIC",
    },
    create: {
      name: "Admin",
      email,
      isAdmin: true,
      alive: true,
      joinCode: "PUBLIC",
      secretCode: "ADMIN-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      adminPasswordHash: hash,
    },
    select: { id: true, email: true, isAdmin: true },
  });

  console.log("✅ Admin upserted:", admin);
  console.log("🔐 Admin plaintext password (save now!):", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
