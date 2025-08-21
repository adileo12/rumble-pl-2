export const runtime = "nodejs";
import { db } from "@/src/lib/db";
import { getActiveSeason, getCurrentGameweek } from "@/src/lib/game";

export default async function LeaderboardPage() {
  const season = await getActiveSeason();
  const currentGw = await getCurrentGameweek(season.id); // still useful, but we won't rely on number<current

  // All GWs in this season (id <-> number maps)
  const gws = await db.gameweek.findMany({
    where: { seasonId: season.id },
    select: { id: true, number: true },
    orderBy: { number: "asc" },
  });
  const gwNumberById = new Map(gws.map((g) => [g.id, g.number]));

  // Determine which GWs are LOCKED (deadline passed = earliest kickoff <= now + 30m)
  const earliest = await db.fixture.groupBy({
    by: ["gwId"],
    where: { gwId: { in: gws.map((g) => g.id) } },
    _min: { kickoff: true },
  });
  const nowPlus30 = new Date(Date.now() + 30 * 60 * 1000);
  const lockedGwIds = new Set(
    earliest
      .filter((e) => e._min.kickoff && e._min.kickoff <= nowPlus30)
      .map((e) => e.gwId as string)
  );

  // Only show columns for GWs whose deadline has passed
  const displayGwNumbers = gws
    .filter((g) => lockedGwIds.has(g.id))
    .map((g) => g.number);
  const lastDisplayedGw = displayGwNumbers.length
    ? displayGwNumbers[displayGwNumbers.length - 1]
    : 0;

  // Pull users & picks
  const users = (await db.user.findMany({ orderBy: { id: "asc" } })) as any[];
const picks = await db.pick.findMany({
  where: { seasonId: season.id },
  include: { club: true },
});

  // Only include picks from locked GWs
  const displayPicks = picks.filter((p) => lockedGwIds.has(p.gwId as string));

  // Build: userId -> (gwNumber -> label)
  const picksByUser = new Map<string, Map<number, string>>();
  for (const p of displayPicks) {
    const gwNum = gwNumberById.get(p.gwId as string);
    if (!gwNum) continue;
    const label = p.club?.shortName ?? p.club?.name ?? p.clubId;
    let m = picksByUser.get(p.userId);
    if (!m) {
      m = new Map<number, string>();
      picksByUser.set(p.userId, m);
    }
    m.set(gwNum, label);
  }

  const aliveUsers = users.filter((u) => u.alive === true);
  const eliminatedUsers = users.filter((u) => u.alive === false);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="text-sm text-gray-600">
          Showing picks up to GW {lastDisplayedGw}
          {displayGwNumbers.length === 0 ? " (no past GWs yet)" : ""}
        </p>
      </header>

      <section>
        <h2 className="font-medium mb-2">Players Still Alive</h2>
        <LeaderboardTable
          rows={aliveUsers}
          picksByUser={picksByUser}
          displayGwNumbers={displayGwNumbers}
        />
      </section>

      <section>
        <h2 className="font-medium mb-2">Eliminated Players</h2>
        <LeaderboardTable
          rows={eliminatedUsers}
          picksByUser={picksByUser}
          displayGwNumbers={displayGwNumbers}
        />
      </section>
    </main>
  );
}

function LeaderboardTable({
  rows,
  picksByUser,
  displayGwNumbers,
}: {
  rows: any[];
  picksByUser: Map<string, Map<number, string>>;
  displayGwNumbers: number[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Player</th>
            <th className="px-3 py-2 text-left">Proxy</th>
            <th className="px-3 py-2 text-left">Lazarus</th>
            {displayGwNumbers.map((n) => (
              <th key={n} className="px-3 py-2 text-left">
                GW {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="px-3 py-3 text-gray-500" colSpan={3 + displayGwNumbers.length}>
                No players to show.
              </td>
            </tr>
          )}

          {rows.map((u) => {
            const pickMap = picksByUser.get(u.id) ?? new Map<number, string>();
            const name = displayName(u);
            const proxy = lifelineUsed(u, ["proxyUsed", "usedProxy", "hasUsedProxy"]);
            const lazarus = lifelineUsed(u, ["lazarusUsed", "usedLazarus", "hasUsedLazarus"]);
            return (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{name}</td>
                <td className="px-3 py-2">{proxy ? "✓" : "—"}</td>
                <td className="px-3 py-2">{lazarus ? "✓" : "—"}</td>
                {displayGwNumbers.map((n) => (
                  <td key={n} className="px-3 py-2">
                    {pickMap.get(n) ?? "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function displayName(u: any) {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return full || u.fullName || u.name || u.email || u.id;
}

function lifelineUsed(u: any, keys: string[]) {
  for (const k of keys) {
    if (typeof u?.[k] === "boolean") return Boolean(u[k]);
  }
  return false;
}
