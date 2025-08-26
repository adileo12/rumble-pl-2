import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const host = req.headers.get("host");
  clearSessionCookies(host);
  return NextResponse.json({ ok: true });
}
