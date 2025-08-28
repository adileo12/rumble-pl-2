export const runtime = "nodejs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import {
  getActiveSeason,
  getCurrentGameweek,
  isLockedForGW,
  clubsYouAlreadyPicked,
} from "@/src/lib/game";

export async function POST(req: Request) {
  try {
    const jar = cookies();
    const userId = jar.get("sid")?.value ?? jar.get("rumble_session")?.value;
    if (!userId) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });

    const { clubId } = await req.json().catch(() => ({}));
    if (!clubId) return NextResponse.json({ ok: false, error: "clubId required" }, { status: 400 });

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.alive) {
      return NextResponse.json({ ok: false, error: "User not found or eliminated" }, { status: 400 });
    }

    const season = await getActiveSeason();
    const gw = await getCurrentGameweek(season.id);

    if (await isLockedForGW(gw.id)) {
      return NextResponse.json({ ok: false, error: "DEADLINE_PASSED" }, { status: 409 });
    }

    const playsThisGw = await db.fixture.count({
      where: {
        gwId: gw.id, // <-- use your field
        OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
      },
    });
    if (playsThisGw === 0) {
      return NextResponse.json({ ok: false, error: "CLUB_NOT_IN_THIS_GW" }, { status: 400 });
    }

    const used = await clubsYouAlreadyPicked(user.id, season.id);
    if (used.has(clubId)) {
      return NextResponse.json({ ok: false, error: "CLUB_ALREADY_USED" }, { status: 409 });
    }
// Ensure the selected club plays in this GW (server-side enforcement)
const clubFixture = await db.fixture.findFirst({
  where: { gwId: gw.id, OR: [{ homeClubId: clubId }, { awayClubId: clubId }] },
  select: { id: true },
});
if (!clubFixture) {
  return NextResponse.json({ ok: false, error: "Selected club does not have a fixture in this gameweek" }, { status: 400 });
}

    const pick = await db.pick.upsert({
      where: {
        // requires @@unique([userId, seasonId, gwId]) in Prisma
        userId_seasonId_gwId: {
          userId: user.id,
          seasonId: season.id,
          gwId: gw.id,
        },
      },
      update: { clubId },
      create: { userId: user.id, seasonId: season.id, gwId: gw.id, clubId },
      include: { club: true },
    });

    return NextResponse.json({ ok: true, pick });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
