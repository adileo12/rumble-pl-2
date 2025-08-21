export const runtime = "nodejs";
import { db } from "@/src/lib/db";
import { getActiveSeason, getCurrentGameweek } from "@/src/lib/game";

export default async function LeaderboardPage() {
  const season = await getActiveSeason();
  const currentGw = await getCurrentGameweek(season.id);

  // All GWs in this season, map id -> number
  const gws = await db.gameweek.findMany({
    where: { seasonId: season.id },
    select: { id: true, number: true },
    orderBy: { number: "asc" },
  });
  const gwNumberById = new Map(gws.map((g) => [g.id, g.number]));
  const displayGwNumbers = gws.map((g) => g.number).filter((n) => n < currentGw.number);

  // Users (we'll derive display name + lifeline flags from possible fields)
  const users = (await db.user.findMany({ orderBy: { id: "asc" } })) as any[];

  // All picks for the season (we'll filter to past GWs only)
  const picks = await db.pick.findMany({
    where: { seasonId: season.id },
    include: { club: true },
  });

  // Keep only picks from GWs strictly before the current (hide active GW)
  const displayPicks = picks.filter((p) => {
    const n = gwNumberById.get(p.gwId as string);
    return n !== undefined && n < currentGw.number;
  });

  // Build: userId -> (gwNumber -> label)
  const picksByUser = new Map<string, Map<number, string>>();
  for (const p of displayPicks) {
    const gwNum = gwNumberById.get(p.gwId as string);
    if (!gwNum) continue;
    const label = p.club?.shortName ?? p.club?.name ?? p.clubId;
    const m = picksByUser.get(p.userId) ?? new Map<number, string>();
    if (!picksByUser.has(p.userId)) picksByUser.set(p.userId, m);
    m.set(gwNum, label);
  }

  function displayName(u: any) {
    const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
    return full || u.fullName || u.name || u.email || u.id;
  }

  function used(u: any, keys: string[]) {
    for (const k of keys) {
      if (typeof u?.[k] === "boolean") return Boolean(u[k]);
    }
    return false;
  }

  const aliveUsers = users.filter((u) => u.alive === true);
  const eliminatedUsers = users.filter((u) => u.alive === false);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="text-sm text-gray-600">
          Showing picks up to GW {Math.max(0, currentGw.number - 1)}
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
            const proxy = used(u, ["proxyUsed", "usedProxy", "hasUsedProxy"]);
            const lazarus = used(u, ["lazarusUsed", "usedLazarus", "hasUsedLazarus"]);
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

function used(u: any, keys: string[]) {
  for (const k of keys) {
    if (typeof u?.[k] === "boolean") return Boolean(u[k]);
  }
  return false;
}
