import React from "react";
import Link from "next/link";
import { headers, cookies } from "next/headers"; // ⬅️ add this
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ... nextGw / latest helpers unchanged ... */

// NEW: detect admin based on /api/auth/me
async function fetchIsAdmin(): Promise<boolean> {
  try {
    const h = headers();
    const host = h.get("host");
    const protocol = process.env.VERCEL ? "https" : "http";
    const url = `${protocol}://${host}/api/auth/me`;

    const res = await fetch(url, {
      // forward auth cookies so /api/auth/me knows who we are
      headers: { cookie: cookies().toString() },
      cache: "no-store",
    });
    if (!res.ok) return false;

    const data = await res.json();
    const u = (data?.user ?? data) as any;

    // Be flexible about where "admin" lives
    const role =
      u?.role ?? u?.userRole ?? u?.status?.role ?? u?.UserStatus?.role ?? null;
    const flag =
      u?.isAdmin === true || u?.admin === true || u?.is_admin === true;

    return flag || role === "admin";
  } catch {
    return false;
  }
}

/* Tile component unchanged */

export default async function Home() {
  const greeting = greetByTime();

  // fetch everything in parallel
  const [nextGw, latest, isAdmin] = await Promise.all([
    fetchNextGw(),
    fetchLatestReport(),
    fetchIsAdmin(), // ⬅️ new
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero ... (unchanged) */}

      {/* Highlights ... (unchanged) */}

      {/* Quick actions */}
      <div className="mt-10">
        <h3 className="font-semibold mb-3">Quick actions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Tile href="/rumble" title="Rumble" desc="Pick your club and see standings." emoji="⚽" />
          <Tile href="/predictor" title="Predictor" desc="Make predictions for fixtures." emoji="🧠" />
          <Tile href="/rumble/reports" title="Reports" desc="Browse public gameweek reports." emoji="📊" />
          <Tile href="/profile" title="Profile" desc="Account info and preferences." emoji="👤" />

          {/* Show these only for admins */}
          {isAdmin && (
            <>
              <Tile href="/admin" title="Admin" desc="Tools & report generation." emoji="🛠️" />
              <Tile
                href="https://github.com/adileo12/rumble-pl-2"
                title="Project repo"
                desc="Open the code on GitHub."
                emoji="📦"
                external
              />
            </>
          )}
        </div>
      </div>

      {/* Tips ... (unchanged) */}
    </div>
  );
}
