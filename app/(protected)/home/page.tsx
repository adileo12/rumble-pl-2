import React from "react";
import Link from "next/link";
import { headers, cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { nextGwByEffectiveDeadline } from "@/src/lib/deadline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NextGw = { seasonId: string; gwNumber: number; deadline?: Date | string | null };
type LatestReport = { seasonId: string; gwNumber: number; updatedAt?: Date | string | null };

/* ---------- small utils ---------- */
function greetByTime(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function fmtDate(d?: Date | string | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relTo(d?: Date | string | null) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  const diffMs = dt.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / (60 * 1000));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  const remM = mins % 60;
  const s = (days ? `${days}d ` : "") + (remH ? `${remH}h ` : "") + (remM ? `${remM}m` : "");
  return diffMs >= 0 ? `in ${s.trim()}` : `${s.trim()} ago`;
}

/* ---------- data ---------- */
async function fetchNextGw(): Promise<NextGw | null> {
  // Use the unified effective deadline (stored or fixtures T-30)
  const season = await db.season.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (!season) return null;

  const { gw, deadline } = await nextGwByEffectiveDeadline(season.id);
  if (!gw || !deadline) return null;

  return {
    seasonId: gw.seasonId,
    gwNumber: gw.number,
    deadline, // Date; UI helpers accept Date|string|null
  };
}

async function fetchLatestReport(): Promise<LatestReport | null> {
  const anyDb = db as any;
  const client = anyDb?.rumbleReport ?? anyDb?.RumbleReport;
  if (!client?.findFirst) return null;
  try {
    const rep = await client.findFirst({
      orderBy: { gwNumber: "desc" },
      select: { seasonId: true, gwNumber: true, updatedAt: true },
    });
    return rep ?? null;
  } catch {
    return null;
  }
}

/** Get current viewer's name + isAdmin from /api/auth/me */
async function fetchViewer(): Promise<{ name: string | null; isAdmin: boolean }> {
  try {
    const h = headers();
    const host = h.get("host");
    const protocol = process.env.VERCEL ? "https" : "http";
    const res = await fetch(`${protocol}://${host}/api/auth/me`, {
      headers: { cookie: cookies().toString() },
      cache: "no-store",
    });
    if (!res.ok) return { name: null, isAdmin: false };
    const payload = await res.json();
    const u = (payload?.user ?? payload) as any;

    const name =
      u?.name ??
      u?.fullName ??
      (u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : undefined) ??
      u?.username ??
      (typeof u?.email === "string" ? u.email.split("@")[0] : null) ??
      null;

    const role =
      u?.role ?? u?.userRole ?? u?.status?.role ?? u?.UserStatus?.role ?? null;
    const isAdmin =
      u?.isAdmin === true || u?.admin === true || u?.is_admin === true || role === "admin";

    return { name, isAdmin };
  } catch {
    return { name: null, isAdmin: false };
  }
}

/** NEW: proxies remaining (2 - PROXY picks this season) */
async function fetchProxiesRemaining(userId: string | null): Promise<number | null> {
  if (!userId) return null;

  const season = await db.season.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (!season) return null;

  const used = await db.pick.count({
    where: { userId, seasonId: season.id, source: "PROXY" },
  });

  return Math.max(0, 2 - used);
}

/* ---------- UI bits ---------- */
function Tile({
  href,
  title,
  desc,
  emoji,
  external,
}: {
  href: string;
  title: string;
  desc: string;
  emoji?: string;
  external?: boolean;
}) {
  const content = (
    <div className="block rounded-2xl border p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow bg-white/60">
      <div className="flex items-center gap-3">
        <div className="text-2xl">{emoji ?? "🎯"}</div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-slate-600">{desc}</div>
        </div>
      </div>
    </div>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link href={href}>{content}</Link>
  );
}

/* ---------- page ---------- */
export default async function Home() {
  const sid = cookies().get("sid")?.value ?? null;

  const [nextGw, latest, viewer, proxiesRemaining] = await Promise.all([
    fetchNextGw(),
    fetchLatestReport(),
    fetchViewer(),
    fetchProxiesRemaining(sid),
  ]);

  const greeting = viewer.name
    ? `Welcome, ${viewer.name}, to Haven Games 👋`
    : `${greetByTime()}, welcome to Haven Games 👋`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8 rounded-3xl border bg-gradient-to-br from-white to-sky-50 p-6 md:p-8">
        <div className="text-3xl md:text-4xl font-bold mb-2">{greeting}</div>
        <p className="text-slate-700">
          Make your pick, track reports, and keep an eye on deadlines — all in one place.
        </p>
      </div>

      {/* Highlights */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Next deadline */}
        <div className="rounded-2xl border p-5 bg-white/70">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Next Gameweek Deadline</h2>
            {nextGw ? (
              <span className="text-xs px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                {relTo(nextGw.deadline)}
              </span>
            ) : null}
          </div>
          {nextGw ? (
            <>
              <div className="text-lg">GW {nextGw.gwNumber}</div>
              <div className="text-slate-600">{fmtDate(nextGw.deadline)}</div>

              {typeof proxiesRemaining === "number" && (
                <div className="mt-2 text-sm">
                  Proxy cards: <span className="font-semibold">{proxiesRemaining}</span>/2
                </div>
              )}

              <div className="mt-4">
                <Link
                  href="/rumble"
                  className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Make / review pick →
                </Link>
              </div>
            </>
          ) : (
            <div className="text-slate-600">No upcoming deadlines found.</div>
          )}
        </div>

        {/* Latest report */}
        <div className="rounded-2xl border p-5 bg-white/70">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Latest Report</h2>
          </div>
          {latest ? (
            <>
              <div className="text-lg">GW {latest.gwNumber}</div>
              <div className="text-slate-600">Updated {relTo(latest.updatedAt)}</div>
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/rumble/reports/${encodeURIComponent(latest.seasonId)}/${latest.gwNumber}`}
                  className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  View public report →
                </Link>
                {viewer.isAdmin && (
                  <Link
                    href={`/admin/rumble/report-generation/${encodeURIComponent(latest.seasonId)}/${latest.gwNumber}`}
                    className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Admin view →
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="text-slate-600">
              No reports yet. Generate from Admin → Report Generation.
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-10">
        <h3 className="font-semibold mb-3">Quick actions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Tile href="/rumble" title="Rumble" desc="Pick your club and see standings." emoji="⚽" />
          <Tile href="/predictor" title="Predictor" desc="Make predictions for fixtures." emoji="🧠" />
          <Tile href="/rumble/reports" title="Reports" desc="Browse public gameweek reports." emoji="📊" />
          <Tile href="/profile" title="Profile" desc="Account info and preferences." emoji="👤" />

          {viewer.isAdmin && (
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

      {/* Tips */}
      <div className="mt-10 rounded-2xl border p-5 bg-white/70">
        <h3 className="font-semibold mb-2">Tips</h3>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>Reports for picks & proxy are available as soon as the submission deadline passes.</li>
          <li>Eliminations appear once all matches in that GW are graded.</li>
          <li>Admins can download charts as PNG from the report detail page.</li>
        </ul>
      </div>
    </div>
  );
}
