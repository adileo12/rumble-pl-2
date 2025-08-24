import { NextResponse } from "next/server";
import { Resvg } from "@resvg/resvg-js";
import { db } from "@/src/lib/db";

// If you have admin auth middleware, this route will inherit it.
// Otherwise, add your check here.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { seasonId: string; gw: string } }) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // club | source | elims
  const seasonId = decodeURIComponent(params.seasonId);
  const gwNumber = Number(params.gw);

  const rep = await db.rumbleReport.findUnique({
    where: { seasonId_gwNumber: { seasonId, gwNumber } },
    select: { payload: true },
  });
  if (!rep) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = rep.payload as any;

  async function proxyPng(pngUrl: string, filename: string) {
    const res = await fetch(pngUrl);
    if (!res.ok) return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
    const buf = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  if (type === "club") {
    const pngUrl = payload?.clubPieUrl as string | undefined;
    if (!pngUrl) return NextResponse.json({ error: "Missing" }, { status: 404 });
    return proxyPng(pngUrl, `${seasonId}-GW${gwNumber}-picks-by-club.png`);
  }

  if (type === "source") {
    const pngUrl = payload?.sourcePieUrl as string | undefined;
    if (!pngUrl) return NextResponse.json({ error: "Missing" }, { status: 404 });
    return proxyPng(pngUrl, `${seasonId}-GW${gwNumber}-manual-vs-proxy.png`);
  }

  if (type === "elims") {
    const svg = payload?.eliminatedSvg as string | undefined;
    if (!svg) return NextResponse.json({ error: "Missing" }, { status: 404 });

    // Render SVG → PNG
    const r = new Resvg(svg, {
      fitTo: { mode: "width", value: 1400 }, // adjust size if desired
      background: "white",
    });
    const png = r.render().asPng();
    return new NextResponse(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${seasonId}-GW${gwNumber}-eliminations.png"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
