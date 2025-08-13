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
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/login");
  }

  return (
    <header className="w-full border-b bg-white">
      <nav className="mx-auto grid max-w-5xl grid-cols-2 items-center px-4 py-3">
        {/* Left: links */}
        <ul className="flex items-center gap-6 text-sm justify-start">
          <NavLink href="/home">Dashboard</NavLink>
          <NavLink href="/leaderboard">Leaderboard</NavLink>
          {currentUser?.isAdmin && <NavLink href="/admin">Admin</NavLink>}
        </ul>

        {/* Right: user + logout */}
        <div className="flex items-center justify-end gap-3 text-sm">
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