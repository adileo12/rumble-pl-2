import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { setSessionCookies, sessionCookieOptionsForHost } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const host = req.headers.get("host");
    const body = await req.json().catch(() => ({} as any));
    const code = String(body?.code || "").trim();

    if (!code) {
      return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
    }

    const anyDb: any = db;
    const userClient = anyDb.user ?? anyDb.User;
    // Secret-code login
    const user = await userClient.findFirst({ where: { secretCode: code } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 401 });
    }

    setSessionCookies(String(user.id), host);

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err) {
    console.error("POST /api/auth/login error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
