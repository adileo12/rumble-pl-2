import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { effectiveDeadline } from "@/src/lib/deadline";
import { pickProxyClubForUserAlpha, proxiesUsedThisSeason } from "@/src/lib/proxy";

export async function POST() {
  // 1) Find current GW by latest *passed* effective deadline
  const activeSeason = await db.season.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!activeSeason) return NextResponse.json({ ok: false, error: "No active season" }, { status: 400 });

  const gws = await db.gameweek.findMany({
    where: { seasonId: activeSeason.id },
    select: { id: true, number: true },
    orderBy: { number: "asc" },
  });
  if (!gws.length) return NextResponse.json({ ok: false, error: "No gameweeks" }, { status: 400 });

  // Find the most recent GW whose effective deadline is <= now
  const now = Date.now();
  let targetGw: { id: string; number: number } | null = null;
  let targetEff: Date | null = null;

  for (const gw of gws) {
    const eff = await effectiveDeadline(gw.id);
    if (!eff) continue;
    if (eff.getTime() <= now) {
      if (!targetEff || eff.getTime() > targetEff.getTime()) {
        targetGw = gw;
        targetEff = eff;
      }
    }
  }
  if (!targetGw || !targetEff) {
    return NextResponse.json({ ok: true, info: "No passed deadlines to process" });
  }

  // (Optional) derive previous GW effective deadline for window checks
  const prevIndex = gws.findIndex(x => x.id === targetGw!.id) - 1;
  const prevEff = prevIndex >= 0 ? await effectiveDeadline(gws[prevIndex].id) : null;

  // 2) Participants who are alive
  const users = await db.user.findMany({
    where: { alive: true },
    select: { id: true },
  });

  const results: any[] = [];

  for (const u of users) {
    // Has a manual pick for this GW within the window?
    const manualPick = await db.pick.findFirst({
      where: {
        userId: u.id,
        seasonId: activeSeason.id,
        gwId: targetGw.id,
        source: "USER",
        ...(prevEff
          ? { createdAt: { gte: prevEff, lt: targetEff } }
          : { createdAt: { lt: targetEff } }),
      },
      select: { id: true },
    });

    if (manualPick) {
      results.push({ userId: u.id, action: "kept-user-pick" });
      continue;
    }

    // If *any* pick already exists (e.g., job rerun, or user snuck one in),
    // don't double-assign; respect unique constraint
    const anyPick = await db.pick.findUnique({
      where: { userId_seasonId_gwId: { userId: u.id, seasonId: activeSeason.id, gwId: targetGw.id } },
      select: { id: true, source: true },
    });
    if (anyPick) {
      results.push({ userId: u.id, action: "already-has-pick", source: anyPick.source });
      continue;
    }

    // Proxy cap
    const used = await proxiesUsedThisSeason(u.id, activeSeason.id);
    const remaining = Math.max(0, 2 - used);

    if (remaining > 0) {
      // Assign proxy alphabetically
      const proxyClubId = await pickProxyClubForUserAlpha({ seasonId: activeSeason.id, userId: u.id, gwId: targetGw.id });

      if (!proxyClubId) {
        // No valid club available → eliminate
        await db.user.update({
          where: { id: u.id },
          data: { alive: false, eliminatedAtGw: targetGw.number },
        });
        results.push({ userId: u.id, action: "eliminated-no-candidate" });
        continue;
      }

      // Create proxy pick (idempotent via unique key)
      await db.pick.upsert({
        where: { userId_seasonId_gwId: { userId: u.id, seasonId: activeSeason.id, gwId: targetGw.id } },
        update: { clubId: proxyClubId, source: "PROXY" },
        create: { userId: u.id, seasonId: activeSeason.id, gwId: targetGw.id, clubId: proxyClubId, source: "PROXY" },
      });

      results.push({ userId: u.id, action: "proxy-assigned", clubId: proxyClubId });
      continue;
    }

    // No proxies remaining → eliminate
    await db.user.update({
      where: { id: u.id },
      data: { alive: false, eliminatedAtGw: targetGw.number },
    });
    results.push({ userId: u.id, action: "eliminated-no-proxies" });
  }

  return NextResponse.json({ ok: true, gw: targetGw, processed: results });
}
