export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/src/lib/db"

const tabs = [
  { href: "/rumble", label: "Play" },
  { href: "/rumble/dashboard", label: "Dashboard" },
  { href: "/rumble/leaderboard", label: "Leaderboard" },
]

export default async function RumbleLayout({ children }: { children: React.ReactNode }) {
  const sid = cookies().get("sid")?.value
  if (!sid) redirect("/login?next=/rumble")

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { id: true }
  })
  if (!user) redirect("/login?next=/rumble")

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* section tabs */}
      <nav className="mb-6 flex gap-4 border-b">
        {tabs.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className="py-2 px-1 border-b-2 border-transparent data-[active=true]:border-black"
            data-active={
              typeof window === "undefined" ? undefined :
              window.location?.pathname === t.href
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}


export default function RumbleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <nav className="flex gap-4 text-sm">
        <Link href="/rumble/play" className="underline">Play</Link>
        <Link href="/rumble/leaderboard" className="underline">Leaderboard</Link>
        <Link href="/rumble/rules" className="underline">Rules</Link> {/* NEW */}
      </nav>
      {children}
    </div>
  );
}
