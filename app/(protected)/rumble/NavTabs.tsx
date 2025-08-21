"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavTabs({
  tabs,
}: {
  tabs: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-4 border-b">
      {tabs.map((t) => {
        const active =
          pathname === t.href ||
          // treat /rumble as Play if you ever link there
          (t.href === "/rumble/play" && pathname === "/rumble");

        return (
          <Link
            key={t.href}
            href={t.href}
            className={`py-2 px-1 border-b-2 ${
              active ? "border-black" : "border-transparent hover:border-black"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
