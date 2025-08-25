import React from "react";
import Link from "next/link";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NextGw = { seasonId: string; gwNumber: number; deadline?: Date | string | null };
type LatestReport = { seasonId: string; gwNumber: number; updatedAt?: Date | string | null };

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

async function fetchNextGw(): Promise<NextGw | null> {
  const anyDb = db as any;
  const now = new Date();
  const client = anyDb?.gameweek ?? anyDb?.Gameweek;
  if (!client?.findFirst) return null;
  try {
    const gw = await client.findFirst({
      where: { deadline: { gt: now } },
      orderBy: { deadline: "asc" },
      select: { seasonId: true, gwNumber: true, deadline: true },
    });
    return gw ?? null;
  } catch {
    return null;
  }
}

async function fetchLatestReport(): Promise<LatestReport | null> {
  const anyDb = db as any;
  const client = anyDb?.rumbleReport ?? anyDb?.RumbleReport;
  if (!client?.findFirst) return null;
  try {
    const rep = await client.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { seasonId: true, gwNumber: true, updatedAt: true },
    });
    return rep ?? null;
  } catch {
    return null;
  }
}

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
  const A: any = external ? "a" : Link;
  const props: any = external ? { href, target: "_blank", rel: "noreferrer" } : { href };
  return (
    <A
      {...props}
      className="block rounded-2xl border p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow bg-white/60"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{emoji ?? "🎯"}</div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-slate-600">{desc}</div>
        </div>
      </div>
    </A>
  );
}

export default async function Home() {
  const greeting = greetByTime();
  const [nextGw, latest] = await Promise.all([fetchNextGw(), fetchLatestReport()]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8 rounded-3xl border bg-gradient-to-br from-white to-sky-50 p-6 md:p-8">
        <div className="text-3xl md:text-4xl font-bold mb-2">
          {greeting}, welcome to Haven Games 👋
        </div>
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
              <div className="text-lg">
                {nextGw.seasonId} — GW {nextGw.gwNumber}
              </div>
              <div className="text-slate-600">{fmtDate(nextGw.deadline)}</div>
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
              <div className="text-lg">
                {latest.seasonId} — GW {latest.gwNumber}
              </div>
              <div className="text-slate-600">Updated {relTo(latest.updatedAt)}</div>
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/rumble/reports/${encodeURIComponent(latest.seasonId)}/${latest.gwNumber}`}
                  className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  View public report →
                </Link>
                <Link
                  href={`/admin/rumble/report-generation/${encodeURIComponent(latest.seasonId)}/${latest.gwNumber}`}
                  className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Admin view →
                </Link>
              </div>
            </>
          ) : (
            <div className="text-slate-600">No reports yet. Generate from Admin → Report Generation.</div>
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
          <Tile href="/admin" title="Admin" desc="Tools & report generation." emoji="🛠️" />
          <Tile
            href="https://github.com/adileo12/rumble-pl-2"
            title="Project repo"
            desc="Open the code on GitHub."
            emoji="📦"
            external
          />
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
