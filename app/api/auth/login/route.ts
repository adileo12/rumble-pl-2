import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import { sessionCookieOptionsForHost } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // ✅ Anything that needs req or cookies() must be inside the handler
  const host = req.headers.get("host") || "";
  const opts = sessionCookieOptionsForHost(host);
  const jar = cookies();

  // ---- keep your existing logic below this line ----
  // If your login expects a secret code, this is a safe way to read it:
  const body = await req.json().catch(() => ({} as any));
  const code =
    String(body?.code ?? body?.secretCode ?? body?.secret_code ?? "").trim();

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Missing fields" },
      { status: 400 }
    );
  }

  // Find the user by whatever model/column you already use.
  // (Support both possible Prisma model names to match your schema.)
  const anyDb: any = db;
  const userClient = anyDb.user ?? anyDb.User;

  const user =
    (await userClient.findFirst?.({ where: { secretCode: code } })) ??
    (await userClient.findUnique?.({ where: { secretCode: code } }));

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Invalid code" },
      { status: 401 }
    );
  }

  // Set the cookies your app reads (both names are kept to avoid regressions)
  jar.set("session", String(user.id), opts);
  jar.set("sid", String(user.id), opts);

  return NextResponse.json({ ok: true });
}
