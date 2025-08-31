// app/api/admin/reports/gw/generate/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { effectiveDeadline } from "@/src/lib/deadline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    // Admin check
    const sid = cookies().get("sid")?.value ?? null;
    const viewer = sid
      ? await db.user.findUnique({ where: { id: sid }, select: { isAdmin: true } })
      : null;
    if (!viewer?.isAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      seasonId?: string;
      gwNumber?: number;
    };

    const season =
      body.seasonId
        ? await db.season.findUnique({ where: { id: body.seasonId }, select: { id: true } })
        : await db.season.findFirst({ where: { isActive: true }, select: { id: true } });

    if (!season) {
      return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });
    }

    if (typeof body.gwNumber !== "number") {
      return NextResponse.json({ ok: false, error: "gwNumber required" }, { status: 400 });
    }

    const gw = await db.gameweek.findFirst({
      where: { seasonId: season.id, number: body.gwNumber },
      select: { id: true, number: true },
    });
    if (!gw) {
      return NextResponse.json({ ok: false, error: "Invalid gameweek" }, { status: 404 });
    }

    // Guard by effective deadline (fixture T-30 or stored)
    const eff = await effectiveDeadline(gw.id);
    if (eff && eff.getTime() > Date.now()) {
      return NextResponse.json({ ok: false, error: "Deadline not passed yet" }, { status: 409 });
    }

    // === Build report (minimal, schema-friendly) ===
    // Counts by club
    const byClub = await db.pick.groupBy({
      by: ["clubId"],
      where: { seasonId: season.id, gwId: gw.id },
      _count: { _all: true },
    });
    const clubIds = byClub.map((x) => x.clubId);
    const clubs = clubIds.length
      ? await db.club.findMany({
          where: { id: { in: clubIds } },
          select: { id: true, shortName: true, name: true },
        })
      : [];
    const clubLabelById = new Map(clubs.map((c) => [c.id, c.shortName ?? c.name]));
    const counts = byClub
      .map((x) => ({ label: clubLabelById.get(x.clubId) ?? x.clubId, value: x._count._all }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Counts by source (USER / PROXY)
    const userCount = await db.pick.count({ where: { seasonId: season.id, gwId: gw.id, source: "USER" } });
    const proxyCount = await db.pick.count({ where: { seasonId: season.id, gwId: gw.id, source: "PROXY" } });

    // Upsert a compact report row.
    // Adjust fields to your RumbleReport schema if it has different column names.
    await db.rumbleReport.upsert({
      where: { seasonId_gwNumber: { seasonId: season.id, gwNumber: gw.number } as any },
      update: {
        // Common patterns seen in prior codebases:
        countsJson: counts as any,
        bySourceJson: { USER: userCount, PROXY: proxyCount } as any,
        updatedAt: new Date(),
      } as any,
      create: {
        seasonId: season.id,
        gwNumber: gw.number,
        countsJson: counts as any,
        bySourceJson: { USER: userCount, PROXY: proxyCount } as any,
      } as any,
    });

    return NextResponse.json({
      ok: true,
      seasonId: season.id,
      gwNumber: gw.number,
      counts,
      bySource: { USER: userCount, PROXY: proxyCount },
    });
  } catch (err: any) {
    console.error("REPORT-GENERATE ERROR:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
