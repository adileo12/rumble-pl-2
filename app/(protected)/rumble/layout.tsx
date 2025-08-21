// app/(protected)/rumble/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/src/lib/db";

export default async function RumbleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sid =
    cookies().get("sid")?.value ?? cookies().get("rumble_session")?.value;
  if (!sid) redirect("/login?next=/rumble");

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { id: true },
  });
  if (!user) redirect("/login?next=/rumble");

  const tabs = [
    { href: "/rumble", label: "Play" }, // if your Play page lives at /rumble/play, change this to "/rumble/play"
    { href: "/rumble/dashboard", label: "Dashboard" },
    { href: "/rumble/leaderboard", label: "Leaderboard" },
    { href: "/rumble/rules", label: "Rules" }, // NEW
  ];

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* section tabs */}
      <nav className="mb-6 flex gap-4 border-b">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="py-2 px-1 border-b-2 border-transparent hover:border-black"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
