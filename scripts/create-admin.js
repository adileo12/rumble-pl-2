// scripts/create-admin.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function genSecretCode(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// 10+ chars, at least one of each: lower, upper, number, special
function genStrongPassword(len = 12) {
  const lowers = 'abcdefghijklmnopqrstuvwxyz';
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums   = '0123456789';
  const specs  = '!@#$%^&*()-_=+[]{};:,.?/';

  function pick(s) { return s[Math.floor(Math.random() * s.length)]; }

  // Ensure all classes present
  const base = [pick(lowers), pick(uppers), pick(nums), pick(specs)];
  const all = lowers + uppers + nums + specs;
  while (base.length < Math.max(10, len)) base.push(pick(all));

  // Fisher–Yates shuffle
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join('');
}

(async () => {
  const email = process.env.ADMIN_EMAIL;
  const name  = process.env.ADMIN_NAME || 'Admin';
  const plain = process.env.ADMIN_PASSWORD || genStrongPassword(12);

  if (!email) {
    console.error('❌ ADMIN_EMAIL env var is required. Example:');
    console.error('   PowerShell:  $env:ADMIN_EMAIL="you@example.com"; npm run create:admin');
    process.exit(1);
  }

  const hash = await bcrypt.hash(plain, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      isAdmin: true,
      adminPasswordHash: hash,
      // Optional: clear any old plaintext field if it exists
      adminPassword: null,
    },
    create: {
      name,
      email,
      isAdmin: true,
      secretCode: genSecretCode(16),
      joinCode: 'PUBLIC',
      adminPasswordHash: hash,
      // Optional: do NOT store plaintext
      adminPassword: null,
    },
    select: { id: true, email: true, name: true, isAdmin: true },
  });

  console.log('✅ Admin upserted:');
  console.log(user);
  console.log('\n🔐 Generated admin password (save this NOW):');
  console.log(plain);
})()
  .catch((e) => {
    console.error('❌ Error creating admin:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
