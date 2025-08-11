import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export async function GET() {
  const jar = cookies();
  const sid = jar.get("sid")?.value || null;

  let user: any = null;
  if (sid) {
    try {
      user = await db.user.findUnique({
        where: { id: sid },
        select: { id: true, displayName: true, isAdmin: true },
      });
    } catch (e: any) {
      return NextResponse.json({ ok: false, sid, dbError: e?.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    sid,
    user,
    note: "If sid is null here, the cookie is not reaching the server.",
  });
}