import { NextResponse } from "next/server";
import pkg from "pg";

const { Client } = pkg;

export async function GET() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    const res = await client.query("SELECT NOW()");
    await client.end();

    return NextResponse.json({
      ok: true,
      dbTime: res.rows[0],
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    });
  }
}
