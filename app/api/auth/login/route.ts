// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

function log(...args: any[]) {
  // noisier logs only in dev; change to true to always log
  if (process.env.NODE_ENV !== "production") {
    console.log("[LOGIN DEBUG]", ...args);
  } else {
    console.log("[login] event"); // minimal in prod
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  log("➡ request received");

  // Parse body safely (so we can log helpful errors)
  let body: any = null;
  try {
    body = await req.json();
    log("parsed body:", body);
  } catch (e) {
    log("❌ failed to parse JSON body:", e);
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  try {
    const { secretCode = "" } = body || {};
    const code = String(secretCode || "").trim();
    log("secretCode present?", !!code);

    if (!code) {
      log("❌ missing secretCode");
      return NextResponse.json(
        { ok: false, error: "Missing secretCode" },
        { status: 400 }
      );
    }

    log("🔎 querying user by secretCode");
    const user = await db.user.findUnique({
      where: { secretCode: code },
      select: { id: true, displayName: true, isAdmin: true },
    });

    log("query result:", user ? "✅ found user" : "❌ not found");

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid secret code" },
        { status: 401 }
      );
    }

    // Set session cookie (simple: sid = user.id)
    const res = NextResponse.json(
      { ok: true, user, meta: { t: Date.now() - startedAt } },
      { status: 200 }
    );

    // IMPORTANT: secure:true requires HTTPS (works on Vercel)
    // If testing locally without HTTPS, set secure:false
    const secure = process.env.VERCEL ? true : false;

    res.cookies.set("sid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    log("🍪 set cookie sid=<user.id>, secure:", secure);
    log("✅ login OK; returning response");

    return res;
  } catch (err: any) {
    // Prisma errors will show here; we print code/message for clarity
    const code = err?.code || err?.name || "UNKNOWN";
    const msg = err?.message || String(err);
    console.error("LOGIN ERROR:", { code, msg, err });
    return NextResponse.json(
      { ok: false, error: "Server error", debug: { code } },
      { status: 500 }
    );
  } finally {
    log("⬅ finished in", Date.now() - startedAt, "ms");
  }
}