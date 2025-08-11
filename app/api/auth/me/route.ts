import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

const COOKIE = "session";

export async function GET() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });

  const session = await db.session.findUnique({
    where: { token },
    select: { user: { select: { id: true, displayName: true, isAdmin: true } } }
  });
  return NextResponse.json({ user: session?.user ?? null });
}
