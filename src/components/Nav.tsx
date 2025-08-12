"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type User = {
  id?: string;
  displayName: string;
  isAdmin: boolean;
};

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={
          "transition-colors " +
          (active ? "font-semibold underline" : "hover:text-black/70")
        }
      >
        {children}
      </Link>
    </li>
  );
}

export default function Nav({ currentUser }: { currentUser: User }) {
  async function logout() {
    // call your logout endpoint and then do a full nav to /login
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/login");
  }

  return (
    <header className="w-full border-b bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="text-xl font-semibold">
          Rumble
        </Link>

        <ul className="flex items-center gap-6 text-sm">
          <NavLink href="/home">Dashboard</NavLink>
          <NavLink href="/leaderboard">Leaderboard</NavLink>
          {currentUser?.isAdmin && <NavLink href="/admin">Admin</NavLink>}
        </ul>

        <div className="flex items-center gap-3 text-sm">
          <span className="opacity-70">{currentUser?.displayName}</span>
          <button
            onClick={logout}
            className="rounded border px-2 py-1 text-xs hover:bg-black hover:text-white"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}