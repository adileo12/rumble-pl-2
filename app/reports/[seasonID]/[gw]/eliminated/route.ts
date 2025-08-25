import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = false;

export async function GET(_: Request, { params }: { params: { seasonID: string; gw: string } }) {
  const seasonId = params.seasonID;      // ✅ match the folder name
  const gwNumber = Number(params.gw);
  if (!seasonId || Number.isNaN(gwNumber)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const rep = await db.rumbleReport.findUnique({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
  });
  if (!rep) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const svg = (rep.payload as any)?.eliminatedSvg as string | undefined;
  if (!svg) return NextResponse.json({ error: "SVG missing" }, { status: 404 });

  return new NextResponse(svg, { status: 200, headers: { "Content-Type": "image/svg+xml" } });
}
