export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

export async function GET() {
  const v = process.env.DATABASE_URL || '';
  return NextResponse.json({
    ok: true,
    hasDATABASE_URL: v.length > 0,
    dbUrlSample: v ? v.replace(/:\/\/.*@/, '://***@').replace(/(password=)[^&]+/i, '$1***') : null,
    nodeVersion: process.version
  });
}
