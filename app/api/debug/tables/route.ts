export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import pg from 'pg';
const { Client } = pg as any;

export async function GET() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    const r = await client.query(`
      select table_schema, table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name;
    `);
    await client.end();
    return NextResponse.json({ ok: true, tables: r.rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
