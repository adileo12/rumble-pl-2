"use client";

import Link from "next/link";

type User = {
  displayName: string;
  isAdmin: boolean;
};

export default function Nav({ currentUser }: { currentUser: User }) {
  return (
    <header className="w-full border-b">
      <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="text-xl font-semibold">Rumble</Link>

        <ul className="flex items-center gap-6 text-sm">
          <li><Link href="/home">Dashboard</Link></li>
          <li><Link href="/leaderboard">Leaderboard</Link></li>
          {currentUser?.isAdmin && (
            <li><Link href="/admin">Admin</Link></li>
          )}
        </ul>

        <div className="text-sm opacity-70">
          {currentUser?.displayName}
        </div>
      </nav>
    </header>
  );
}