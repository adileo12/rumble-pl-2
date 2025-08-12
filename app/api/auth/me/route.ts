// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

const COOKIE = "sid"; // must match the login route

export async function GET() {
  const sid = cookies().get(COOKIE)?.value || null;
  if (!sid) return NextResponse.json({ user: null });

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { id: true, displayName: true, isAdmin: true },
  });

  return NextResponse.json({ user: user ?? null });
}