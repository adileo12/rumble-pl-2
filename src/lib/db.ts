export const runtime = 'nodejs';

import { PrismaClient } from '@prisma/client';

// Prefer DATABASE_URL, but fall back to Vercel Postgres names
const datasourceUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||  // prisma+postgres://accelerate.prisma…
  process.env.POSTGRES_URL ||         // direct postgres:// (pooled)
  process.env.POSTGRES_URL_NON_POOLING || // direct non-pooled
  '';

if (!datasourceUrl) {
  // Helpful error if something is misconfigured
  // (You can remove this once you're stable)
  console.warn('No DATABASE_URL/POSTGRES_* env vars found');
}

declare global {
  // eslint-disable-next-line no-var
  var __db__: PrismaClient | undefined;
}

export const db =
  global.__db__ ??
  new PrismaClient({
    // Works with normal postgres:// or prisma+postgres://
    datasourceUrl,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__db__ = db;
}
