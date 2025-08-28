import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateGwReportCore } from "@/src/lib/reports-core";
import { db } from "@/src/lib/db";

function assertCronAuth(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return; // skip locally if unset
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) throw new Error("Unauthorized");
}

export const dynamic = "force-dynamic";
export const revalidate = false;

export async function POST(req: Request) {
  const sid = (await cookies()).get("sid")?.value;
  const viewer = sid ? await db.user.findUnique({ where: { id: sid }, select: { isAdmin: true } }) : null;
  if (!viewer?.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  try {
    assertCronAuth(req);
    const { seasonId, gwNumber } = await req.json();
    const res = await generateGwReportCore({ seasonId, gwNumber });
    return NextResponse.json(res, { status: 200 });
   } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : "Internal error";
    const status =
      msg === "Unauthorized" ? 401 :
      msg === "Gameweek not found" ? 404 :
      msg === "Deadline has not passed" ? 409 :
      500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
