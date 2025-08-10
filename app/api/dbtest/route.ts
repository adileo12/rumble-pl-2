export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

// Use 'pg' to test raw connectivity
// Add to package.json if missing: "pg": "8.11.3"
import pg from 'pg';
const { Client } = pg as any;

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ ok: false, error: 'No DATABASE_URL' }, { status: 500 });

  // Helpful: ensure pooler params present for pgBouncer
  const testUrl = url.includes('pgbouncer=true') ? url : (url + (url.includes('?') ? '&' : '?') + 'pgbouncer=true&connection_limit=1&connect_timeout=15'));

  const client = new Client({ connectionString: testUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const r = await client.query('select now() as now');
    await client.end();
    return NextResponse.json({ ok: true, now: r.rows?.[0]?.now ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
