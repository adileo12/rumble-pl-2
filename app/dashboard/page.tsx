import { db } from "@/src/lib/db";
import { getUserIdFromCookies } from "@/src/lib/auth";
import { getActiveSeason } from "@/src/lib/game";
import Link from "next/link";

export default async function Dashboard() {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return (
      <div className="p-6">
        <p>You’re not logged in.</p>
        <Link className="underline" href="/login">Login</Link>
      </div>
    );
  }

  const season = await getActiveSeason();

  // 1) Get picks (no relation includes needed)
  const picks = await db.pick.findMany({
    where: { userId, seasonId: season.id },
    include: { club: true },
    orderBy: { createdAt: "asc" },
  });

  // 2) Load GW numbers for the set of gwIds
  const gwIds = Array.from(new Set(picks.map((p) => p.gwId)));
  const gws = await db.gameweek.findMany({
    where: { id: { in: gwIds } },
    select: { id: true, number: true },
  });
  const gwNumberById = new Map(gws.map((g) => [g.id, g.number]));

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl font-semibold">Your Rumble picks</h2>

      {picks.length === 0 ? (
        <p>No picks yet. <Link className="underline" href="/play">Make your pick</Link>.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">GW</th>
                <th className="px-3 py-2 text-left">Club</th>
                <th className="px-3 py-2 text-left">Picked At</th>
                <th className="px-3 py-2 text-left">Result</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">GW {gwNumberById.get(p.gwId) ?? "?"}</td>
                  <td className="px-3 py-2">{p.club?.shortName ?? p.club?.name ?? p.clubId}</td>
                  <td className="px-3 py-2">
                    {p.createdAt instanceof Date ? p.createdAt.toLocaleString() : String(p.createdAt)}
                  </td>
                  <td className="px-3 py-2">TBD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
