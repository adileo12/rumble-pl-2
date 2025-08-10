// src/lib/db.ts  (or the file you found that creates PrismaClient)
import { PrismaClient } from '@prisma/client';

// Prefer DATABASE_URL, but also work with Vercel Postgres defaults
const datasourceUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??      // Vercel pooled (prisma+postgres://…)
  process.env.POSTGRES_URL ??             // Vercel pooled (postgres://…:6543)
  process.env.POSTGRES_URL_NON_POOLING ?? // Vercel non-pooled (postgres://…:5432)
  '';

declare global {
  // Allow re-use in dev to avoid "already 10 Prisma Clients are actively running" error
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const db =
  global.__prisma__ ??
  new PrismaClient({
    datasources: { db: { url: datasourceUrl } },
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma__ = db;
}
