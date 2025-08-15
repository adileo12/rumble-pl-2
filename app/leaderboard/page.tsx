export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { db } from '@/src/lib/db';


export default async function Leaderboard() {
  const season = await db.season.findFirst({ where: { isActive: true } });
  const rows = season ? await db.userStatus.findMany({ where: { seasonId: season.id }, include: { user: true }, orderBy: [{ isAlive: 'desc' }, { eliminatedGw: 'asc' }] }) : [];
  return (
    <main>
      <h2>Leaderboard</h2>
      <table border={1} cellPadding={6}>
        <thead><tr><th>Player</th><th>Status</th><th>Elim GW</th><th>Jokers Left</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.user.name}</td>
              <td>{r.isAlive ? 'Alive' : 'Eliminated'}</td>
              <td>{r.eliminatedGw ?? '-'}</td>
              <td>{r.jokerLifelinesLeft}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!season && <p>No season found. Seed DB first.</p>}
    </main>
  );
}
