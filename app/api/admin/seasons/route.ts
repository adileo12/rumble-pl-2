import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function GET() {
  const seasons = await db.season.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ ok: true, seasons });
}
