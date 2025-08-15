"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type User = {
  id?: string;
  name: string;
  isAdmin: boolean;
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
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
      {/* simple bar (brand sits in global app/layout) */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <ul className="flex items-center gap-6 text-sm">
          <NavLink href="/rumble">Rumble</NavLink>
          <NavLink href="/predictor">Predictor</NavLink>
          <NavLink href="/profile">Profile</NavLink>
          {/* Optional: keep admin visible only to admins (you didn’t ask, but handy) */}
          {currentUser?.isAdmin && <NavLink href="/admin">Admin</NavLink>}
        </ul>

        <div className="flex items-center gap-3 text-sm">
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
