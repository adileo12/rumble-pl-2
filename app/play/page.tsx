import { cookies } from 'next/headers';
import Link from 'next/link';
import { db } from '@/src/lib/db';
import { getActiveSeason, getCurrentGameweek, isLockedForGW, clubsYouAlreadyPicked, toIST } from '@/src/lib/game';

export default async function PlayPage() {
  const userId = cookies().get('rumble_session')?.value;
  if (!userId) return redirectToLogin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return redirectToLogin();

  const season = await getActiveSeason();
  if (!season) return <Section><h1>No active season</h1></Section>;

  const gw = await getCurrentGameweek(season.id);
  if (!gw) return <Section><h1>No gameweek found</h1></Section>;

  const locked = await isLockedForGW(gw.id);

 const fixtures = await db.fixture.findMany({
  where: {
    gwId: gw.id,                     // ← use gwId, not gameweekId
  },
  include: {
    homeClub: true,
    awayClub: true,
  },
  orderBy: { kickoff: 'asc' },
});

  const clubs = await db.club.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  const used = await clubsYouAlreadyPicked(user.id, season.id);
  const youPickedThisGW = await db.pick.findUnique({
   where: { userId_gwId: { userId, gwId: gw.id } },
  include: { club: true },
  });

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rumble — Gameweek {gw.number}</h1>
          <p className="text-sm text-gray-600">Deadline (IST): {toIST(firstKickoffMinus30(fixtures))}</p>
        </div>
        <div>
          <Link className="underline text-sm" href="/leaderboard">Leaderboard</Link>
        </div>
      </header>

      {/* Fixtures list */}
      <Section>
        <h2 className="font-medium mb-2">Fixtures</h2>
        <ul className="space-y-1">
          {fixtures.length === 0 && <li className="text-sm text-gray-600">No fixtures found for this GW.</li>}
          {fixtures.map(f => (
            <li key={f.id} className="text-sm">
              {fmtTeam(f.homeClubId, clubs)} vs {fmtTeam(f.awayClubId, clubs)} — {f.kickoff ? toIST(new Date(f.kickoff)) : 'TBD'}
            </li>
          ))}
        </ul>
      </Section>

      {/* Your pick & available clubs */}
      <Section>
        <h2 className="font-medium mb-2">Your Pick</h2>
        {youPickedThisGW?.club ? (
          <p className="text-sm">You picked <b>{youPickedThisGW.club.name}</b> for GW {gw.number}. {locked ? '(Locked)' : '(You can change before deadline)'} </p>
        ) : (
          <p className="text-sm">You haven’t picked yet.</p>
        )}
      </Section>

      <Section>
        <h2 className="font-medium mb-2">Available Clubs</h2>
        {locked && <p className="text-red-600 text-sm mb-2">Deadline passed. Picks are locked.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {clubs
            .filter(c => !used.has(c.id))
            .map(c => (
              <PickButton key={c.id} clubId={c.id} clubName={c.name} disabled={locked} />
            ))
          }
        </div>
      </Section>
    </main>
  );
}

function redirectToLogin() {
  // tiny server component redirect
  // next/navigation is only available in client/server components; here we emit a link
  return (
    <main className="p-6">
      <p>Please <a href="/login" className="underline">login</a> with your secret code.</p>
    </main>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="border rounded-lg p-4">{children}</section>;
}

function fmtTeam(id: string, clubs: any[]) {
  const c = clubs.find(x => x.id === id);
  return c ? c.name : 'Unknown';
}

function firstKickoffMinus30(fixtures: any[]) {
  const times = fixtures.filter(f => f.kickoff).map(f => new Date(f.kickoff as string).getTime());
  if (times.length === 0) return new Date();
  const first = Math.min(...times);
  return new Date(first - 30 * 60 * 1000);
}

// Client component for pick button
function PickButton({ clubId, clubName, disabled }: { clubId: string, clubName: string, disabled: boolean }) {
  return (
    <form action="/api/picks/select" method="POST" className="border rounded p-2 flex items-center justify-between">
      <span className="text-sm">{clubName}</span>
      <input type="hidden" name="clubId" value={clubId} />
      <button
        formAction="/api/picks/select"
        onClick={async (e) => {
          e.preventDefault();
          if (disabled) return;
          const res = await fetch('/api/picks/select', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ clubId })
          });
          const j = await res.json();
          if (j.ok) location.reload(); else alert(j.error || 'Pick failed');
        }}
        disabled={disabled}
        className="text-xs bg-black text-white rounded px-2 py-1"
      >
        Pick
      </button>
    </form>
  );
}
