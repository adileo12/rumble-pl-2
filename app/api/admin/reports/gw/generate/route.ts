// app/api/admin/reports/gw/generate/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { effectiveDeadline } from "@/src/lib/deadline";
import { generateGwReportCore } from "@/src/lib/reports-core";

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
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const seasonId = (body.seasonId ?? "").trim();
    const gwNumber = Number(body.gwNumber);
    if (!seasonId || Number.isNaN(gwNumber)) {
      return NextResponse.json({ ok: false, error: "seasonId/gwNumber required" }, { status: 400 });
    }

    // Resolve the exact GW row first
    const gw = await db.gameweek.findUnique({
      where: { seasonId_number: { seasonId, number: gwNumber } },
      select: { id: true, number: true, seasonId: true },
    });
    if (!gw) {
      return NextResponse.json({ ok: false, error: "Gameweek not found" }, { status: 404 });
    }

    // Deadline gate uses GW ID
    const eff = await effectiveDeadline(gw.id);
