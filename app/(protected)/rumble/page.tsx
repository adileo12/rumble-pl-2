export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";

export default function RumbleLanding() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Rumble</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/home"
          className="rounded-lg border p-5 hover:bg-black/5 transition"
        >
          <h2 className="text-lg font-semibold">Dashboard →</h2>
          <p className="text-sm opacity-70">
            Your overview of matches, standings and activity.
          </p>
        </Link>

        <Link
          href="/leaderboard"
          className="rounded-lg border p-5 hover:bg-black/5 transition"
        >
          <h2 className="text-lg font-semibold">Leaderboard →</h2>
          <p className="text-sm opacity-70">
            See rankings and how you stack up.
          </p>
        </Link>
      </div>
    </div>
  );
}