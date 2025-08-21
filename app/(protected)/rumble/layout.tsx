export const runtime = "nodejs";

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/src/lib/db";

export default async function RumbleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // accept either cookie key, depending on what the rest of the app uses
  const sid =
    cookies().get("sid")?.value ?? cookies().get("rumble_session")?.value;

  if (!sid) redirect("/login?next=/rumble");

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { id: true },
  });
  if (!user) redirect("/login?next=/rumble");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <nav className="flex gap-4 text-sm">
        <Link href="/rumble/play" className="underline">
          Play
        </Link>
        <Link href="/rumble/leaderboard" className="underline">
          Leaderboard
        </Link>
        <Link href="/rumble/rules" className="underline">
          Rules
        </Link>
      </nav>
      {children}
    </div>
  );
}
