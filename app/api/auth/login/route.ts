// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { sessionCookieOptionsForHost } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Parse body safely
  const body = await req.json().catch(() => ({} as any));
  const codeRaw = body?.code;

  if (!codeRaw || typeof codeRaw !== "string" || !codeRaw.trim()) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }
  const code = codeRaw.trim();

  // Prisma client with flexible model name fallback
  const anyDb: any = db;
  const userClient =
    anyDb.user ??
    anyDb.User ??
    anyDb.player ??
    anyDb.Player ??
    anyDb.users ??
    anyDb.Users;

  if (!userClient) {
    return NextResponse.json({ ok: false, error: "User model not found" }, { status: 500 });
  }

  // Try to match either 'secretCode' or 'code' field, depending on schema
  const user =
    (await userClient.findFirst?.({ where: { secretCode: code } })) ||
    (await userClient.findFirst?.({ where: { code } }));

  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 401 });
  }

  // Build cookie options from the current host (must be INSIDE the handler)
  const host = req.headers.get("host") || "";
  const opts = sessionCookieOptionsForHost(host);

  // Set cookies (must be INSIDE the handler)
  const jar = cookies();
  jar.set("session", String(user.id), opts);
  jar.set("sid", String(user.id), opts);

  return NextResponse.json({ ok: true, userId: user.id });
}