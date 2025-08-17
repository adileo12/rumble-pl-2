// app/api/admin/cleanup-clubs/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST() {
  // Grab id + name for all clubs
  const clubs = await db.club.findMany({ select: { id: true, name: true } });

  // Group by normalized name (case-insensitive, trim)
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const c of clubs) {
    const key = c.name.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) || []), c]);
  }

  let mergedGroups = 0;
  let deleted = 0;

  for (const [, list] of groups) {
    if (list.length <= 1) continue;

    // Keep the first; merge the rest into it
    const keep = list[0];
    const dups = list.slice(1);

    await db.$transaction(async (tx) => {
      for (const d of dups) {
        // Re-point fixtures
        await tx.fixture.updateMany({
          where: { homeClubId: d.id },
          data: { homeClubId: keep.id },
        });
        await tx.fixture.updateMany({
          where: { awayClubId: d.id },
          data: { awayClubId: keep.id },
        });

        // Re-point picks
        await tx.pick.updateMany({
          where: { clubId: d.id },
          data: { clubId: keep.id },
        });

        // Delete duplicate club row
        await tx.club.delete({ where: { id: d.id } });
        deleted++;
      }
    });

    mergedGroups++;
  }

  return NextResponse.json({
    ok: true,
    mergedGroups,
    deleted,
    message: "Club duplicates merged by name (case-insensitive).",
  });
}
