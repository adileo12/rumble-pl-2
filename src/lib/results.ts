
import { db } from "@/src/lib/db";

type Outcome = "WIN" | "DRAW" | "LOSS" | "PENDING";

function outcomeForPick(fx: any, pickClubId: string): Outcome {
  if (!fx) return "PENDING";

  // 1) If you have a winnerClubId: null usually means draw
  if ("winnerClubId" in fx) {
    const w = fx.winnerClubId as string | null;
    if (w == null) return "DRAW";
    return w === pickClubId ? "WIN" : "LOSS";
  }

  // 2) If you have a compact result code 'H' | 'A' | 'D'
  if ("result" in fx && typeof fx.result === "string") {
    const r = fx.result as string;
    if (r === "D") return "DRAW";
    if (r === "H") {
      return fx.homeClubId === pickClubId ? "WIN" : "LOSS";
    }
    if (r === "A") {
      return fx.awayClubId === pickClubId ? "WIN" : "LOSS";
    }
  }

  // 3) Otherwise, try numeric goals
  const hg = (fx as any).homeGoals;
  const ag = (fx as any).awayGoals;
  if (hg == null || ag == null) return "PENDING";

  if (hg === ag) return "DRAW";
  const pickIsHome = fx.homeClubId === pickClubId;
  const pickIsAway = fx.awayClubId === pickClubId;
  if (!pickIsHome && !pickIsAway) return "PENDING"; // fixture mismatch; skip
  if (pickIsHome) return hg > ag ? "WIN" : "LOSS";
  return ag > hg ? "WIN" : "LOSS";
}

/**
 * Resolve one gameweek:
 * - For each user's pick in that GW, compute outcome from fixtures.
 * - Win or Draw -> survive. Loss -> set user.alive = false (unless already false).
 * - Skips PENDING fixtures.
 * 
 * Returns a summary of changes.
 */
export async function resolveGameweek(seasonId: string, gwId: string) {
   const gw = await db.gameweek.findUnique({ where: { id: gwId }, select: { number: true } });
  if (!gw) throw new Error("Invalid gwId");
  const gwNum = gw.number;
  // Load all fixtures for the GW (so we can match pick.clubId to the single match)
  const fixtures = await db.fixture.findMany({
    
    where: { gwId },
    select: {
      id: true,
      gwId: true,
      homeClubId: true,
      awayClubId: true,
      // Include any fields your schema might have:
      // @ts-ignore (safe optional reads in outcomeForPick)
      homeGoals: true,
      // @ts-ignore
      awayGoals: true,
      // @ts-ignore
      winnerClubId: true,
      // @ts-ignore
      result: true,
    } as any,
  });

  // Map each clubId in this GW to its fixture
  const fixtureByClub = new Map<string, any>();
  for (const f of fixtures) {
    fixtureByClub.set(f.homeClubId, f);
    fixtureByClub.set(f.awayClubId, f);
  }

  // All picks in this season & GW
  const picks = await db.pick.findMany({
    where: { seasonId, gwId },
    select: { id: true, userId: true, clubId: true },
  });

  let eliminated = 0;
  let survived = 0;
  let pending = 0;

  // Batch updates in a transaction
  await db.$transaction(async (tx) => {
    for (const p of picks) {
      const fx = fixtureByClub.get(p.clubId);
      const outcome = outcomeForPick(fx, p.clubId);

      if (outcome === "PENDING") {
        pending++;
        continue;
      }

      if (outcome === "LOSS") {
        // If you have lifelines, you could apply them here before eliminating.
        // For now: set alive=false.
        const user = await tx.user.findUnique({ where: { id: p.userId }, select: { alive: true } });
        if (user?.alive) {
          // 1) Flip the gameplay flag
    await tx.user.update({
      where: { id: p.userId },
      data: { alive: false },
    });

    // 2) Record WHEN they were eliminated (enables reports + Lazarus window)
    await tx.rumbleState.upsert({
      where: { userId_seasonId: { userId: p.userId, seasonId } },
      update: { eliminatedAtGw: gwNum, eliminatedAt: new Date() },
      create: { userId: p.userId, seasonId, eliminatedAtGw: gwNum, eliminatedAt: new Date() },
    });
        }
        eliminated++;
      } else {
        survived++;
      }
    }
  });

  return { eliminated, survived, pending, total: picks.length };
}
