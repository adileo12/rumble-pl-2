import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function FileButton({ href, filename, label }: { href: string; filename: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 px-3 py-1.5 border rounded hover:bg-slate-50 text-sm"
      download={filename}
    >
      ⬇ {label}
    </a>
  );
}

type ClubRow = { clubShort: string; count: number };
type SourceRow = { source: "manual" | "proxy"; count: number };

async function getCounts(seasonId: string, gwNumber: number, payload: any) {
  // 1) Prefer counts already stored by the generator (if you added that patch)
  const pClub = payload?.clubCounts as ClubRow[] | undefined;
  const pSource = payload?.sourceCounts as SourceRow[] | undefined;
  const pTotal = payload?.totalPicks as number | undefined;
  if (pClub && pSource && typeof pTotal === "number") {
    return { clubCounts: pClub, sourceCounts: pSource, totalPicks: pTotal };
  }

  // 2) Fallback: runtime query using whichever model exists (no TS errors via `any`)
  const anyDb = db as any;
  const candidates = ["rumblePick", "pick", "picks", "RumblePick", "Pick"];
  let picks: any[] = [];
  for (const c of candidates) {
    if (anyDb?.[c]?.findMany) {
      picks = await anyDb[c].findMany({
        where: { seasonId, gwNumber }
