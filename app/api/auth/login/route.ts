import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

/** Return a cookie domain that works on apex+www in prod; undefined elsewhere */
function cookieDomainForProd(host?: string | null) {
  if (process.env.NODE_ENV !== "production") return undefined;
  const forced = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  if (forced) return forced; // e.g. ".havengames.org"
  if (!host) return undefined;
  const h = host.toLowerCase();
  if (h === "havengames.org" || h.endsWith(".havengames.org")) return ".havengames.org";
  return undefined;
}

/** Safely take the first non-empty string */
function firstNonEmpty(...vals: (unknown)[]) {
  for (const v of vals) {
    const s = typeof v === "string" ? v.trim() : "";
    if (s) return s;
  }
  return "";
}

/** Read body in a very forgiving way (FormData, JSON, then query params) */
async function readLoosePayload(req: Request) {
  const ct = req.headers.get("content-type") || "";

  // 1) Try FormData first (works for urlencoded & multipart)
  try {
    const fd = await req.clone().formData();
    const entries = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    if (Object.keys(entries).length > 0) {
      return { ct, payload: entries };
    }
  } catch { /* ignore */ }

  // 2) Try JSON
  try {
    const json = (await req.clone().json()) as Record<string, unknown>;
    if (json && Object.keys(json).length > 0) {
      return { ct, payload: json };
    }
  } catch { /* ignore */ }

  // 3) Fallback to query params
  const url = new URL(req.url);
  const qp: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (qp[k] = v));
  return { ct, payload: qp };
}

function pickCodeAndSecret(raw: Record<string, unknown>) {
  // Normalize keys to case-insensitive lookups
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) lower[k.toLowerCase()] = v;

  const code = firstNonEmpty(
    lower.code,
    lower.joincode,
    lower["join_code"]
  );

  const secret = firstNonEmpty(
    lower.secret,
    lower.secretcode,
    lower["secret_code"]
  );

  return { code, secret };
}

export async function POST(req: Request) {
  try {
    const { ct, payload } = await readLoosePayload(req);
    const { code, secret } = pickCodeAndSecret(payload);

    if (!code || !secret) {
      // Helpful diagnostics in dev so you can see what the client sent
      const devMeta =
        process.env.NODE_ENV !== "production"
          ? { contentType: ct, keys: Object.keys(payload || {}) }
          : undefined;

      return NextResponse.json(
        { ok: false, error: "Missing fields", meta: devMeta },
        { status: 400 }
      );
    }

    // Adjust this query to your actual fields. From your earlier schema, users have joinCode + secretCode
    const user = await db.user.findFirst({
      where: { joinCode: code, secretCode: secret },
      select: { id: true, name: true, email: true, isAdmin: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid code or secret" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true, user });

    // Cookie valid on apex + www in prod
    const host = req.headers.get("host");
    res.cookies.set({
      name: "sid",
      value: String(user.id),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      domain: cookieDomainForProd(host),
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
