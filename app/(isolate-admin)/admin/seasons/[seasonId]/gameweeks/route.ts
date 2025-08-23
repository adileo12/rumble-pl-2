import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { seasonId: string } }
) {
  const rows = await db.gameweek.findMany({
    where: { seasonId: params.seasonId },
    select: { number: true },
    orderBy: { number: "asc" },
  });
  return NextResponse.json({ ok: true, gameweeks: rows.map(r => r.number) });
}
