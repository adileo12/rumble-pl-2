export const runtime = "nodejs";
import Link from "next/link";

export default async function RulesHelpPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rumble — Rules & Help</h1>
        <nav className="text-sm space-x-4">
          <Link className="underline" href="/(protected)/rumble/play">Play</Link>
          <Link className="underline" href="/(protected)/rumble/leaderboard">Leaderboard</Link>
        </nav>
      </header>

      {/* Table of contents */}
      <section className="rounded-lg border p-4">
        <h2 className="font-medium mb-2">Contents</h2>
        <ol className="list-decimal ml-5 space-y-1 text-sm">
          <li><a className="underline" href="#overview">Overview</a></li>
          <li><a className="underline" href="#how-to-play">How to Play</a></li>
          <li><a className="underline" href="#gameweeks-deadlines">Gameweeks & Deadlines</a></li>
          <li><a className="underline" href="#picks-rules">Picks Rules</a></li>
          <li><a className="underline" href="#lifelines">Lifelines: Proxy & Lazarus</a></li>
          <li><a className="underline" href="#status">Alive vs Eliminated</a></li>
          <li><a className="underline" href="#leaderboard-visibility">Leaderboard Visibility</a></li>
          <li><a className="underline" href="#faq">FAQ</a></li>
        </ol>
      </section>

      <Section id="overview" title="Overview">
        <p className="text-sm">
          Rumble is a weekly Premier League survivor game. Each Gameweek (GW) you pick one club.
          If your club <b>wins or Draws</b>, you stay alive for the next GW. You cannot reuse a club in the same season.
          The last player alive wins.
        </p>
      </Section>

      <Section id="how-to-play" title="How to Play">
        <ol className="list-decimal ml-5 text-sm space-y-2">
          <li>Go to <Link href="/(protected)/rumble/play" className="underline">Play</Link> and choose your club for the current GW.</li>
          <li>You can change your pick any time <b>before the deadline</b> (see below).</li>
          <li>Your pick is saved and shown on your Dashboard/Leaderboard once the GW locks.</li>
        </ol>
      </Section>

      <Section id="gameweeks-deadlines" title="Gameweeks & Deadlines">
        <ul className="list-disc ml-5 text-sm space-y-2">
          <li>Each season is split into Gameweeks (GW 1, GW 2, …).</li>
          <li>The GW deadline is <b>30 minutes before the first kickoff</b> in that GW.</li>
          <li>Before the deadline, you can update your pick freely; after the deadline, picks are locked.</li>
          <li>Deadlines on the Play page are displayed in IST for clarity.</li>
        </ul>
      </Section>

      <Section id="picks-rules" title="Picks Rules">
        <ul className="list-disc ml-5 text-sm space-y-2">
          <li><b>One club per season:</b> once you’ve used a club, you cannot pick it again this season.</li>
          <li><b>Result to survive:</b> Default is <i>win required</i>. A draw or loss eliminates you
              (if your league uses different logic, the admin can clarify).</li>
          <li>Picks are recorded per GW; we hide active-GW picks until the deadline passes.</li>
        </ul>
      </Section>

      <Section id="lifelines" title="Lifelines: Proxy & Lazarus">
        <div className="text-sm space-y-3">
          <p>
            Lifelines are special one-time abilities managed by the admin and reflected in the leaderboard columns.
          </p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <b>Proxy:</b> a one-time admin-mediated assist (e.g., submitting or correcting a pick under special
              circumstances). When used, the “Proxy” column shows ✓.
            </li>
            <li>
              <b>Lazarus:</b> a one-time revival after elimination. When used, the “Lazarus” column shows ✓.
            </li>
          </ul>
          <p className="text-xs text-gray-600">
            Note: Exact lifeline mechanics (timing, limits) are league-configurable. Ask your admin for specifics.
          </p>
        </div>
      </Section>

      <Section id="status" title="Alive vs Eliminated">
        <ul className="list-disc ml-5 text-sm space-y-2">
          <li><b>Alive:</b> you’re still in the game and will appear in the top table.</li>
          <li><b>Eliminated:</b> you’re out and appear in the second table. Using Lazarus may return you to “Alive”.</li>
        </ul>
      </Section>

      <Section id="leaderboard-visibility" title="Leaderboard Visibility">
        <ul className="list-disc ml-5 text-sm space-y-2">
          <li>The Leaderboard shows full names, lifeline usage (Proxy/Lazarus), and your past picks.</li>
          <li><b>Active-GW picks are hidden</b> until that GW’s deadline passes.</li>
          <li>Admins are excluded from the Leaderboard.</li>
        </ul>
      </Section>

      <Section id="faq" title="FAQ">
        <div className="text-sm space-y-3">
          <QA q="Can I change my pick after making it?">
            Yes—right up until the GW deadline. After the deadline, picks are locked.
          </QA>
          <QA q="What timezone are deadlines shown in?">
            Deadlines are shown in IST on the Play page.
          </QA>
          <QA q="I picked a club already—why can’t I pick it again?">
            Each club can be used only once per season.
          </QA>
          <QA q="Why don’t I see my current GW pick on the Leaderboard?">
            We hide active-GW picks. They appear after the deadline passes.
          </QA>
          <QA q="How do lifelines work?">
            Proxy is a one-time admin assist; Lazarus is a one-time revive. Ask the admin for your league’s specifics.
          </QA>
        </div>
      </Section>

      <footer className="text-xs text-gray-500">
        Need help? Contact your league admin.
      </footer>
    </main>
  );
}

/* --- Tiny helpers (server-safe, no client JS) --- */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-2">
      <h2 className="font-medium text-lg">{title}</h2>
      {children}
    </section>
  );
}

function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium">{q}</p>
      <p className="text-gray-700">{children}</p>
    </div>
  );
}
