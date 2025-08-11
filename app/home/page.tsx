import { db } from '@/src/lib/db';
import { formatIst } from '@/src/lib/time';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const season = await db.season.findFirst({ where: { isActive: true } });
  const gw = season
    ? await db.gameweek.findFirst({
        where: { seasonId: season.id },
        orderBy: { number: 'asc' },
      })
    : null;

  return (
    <main>
      <h2>Dashboard</h2>
      {!season ? (
        <p>No season found. Run admin seed + sync.</p>
      ) : (
        <div>
          <p>Active Season: <b>{season.name}</b></p>
          {gw?.deadline ? (
            <p>Next GW deadline (IST): <b>{formatIst(gw.deadline)}</b></p>
          ) : (
            <p>Deadline unknown. Go to Admin and sync fixtures.</p>
          )}
        </div>
      )}
    </main>
  );
}
