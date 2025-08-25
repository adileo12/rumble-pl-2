import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function GET(_: Request, { params }: { params: { seasonId: string } }) {
  const gws = await db.gameweek.findMany({
    where: { seasonId: params.seasonId },
    select: { number: true, deadline: true, graded: true },
    orderBy: { number: "asc" },
  });
  return NextResponse.json({ ok: true, gameweeks: gws });
}
