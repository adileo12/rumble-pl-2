import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

// ───────── helpers ─────────

/** cookie domain that works on apex + www in prod; undefined in dev/previews */
function cookieDomainForProd(host?: string | null) {
  if (process.env.NODE_ENV !== "production") return undefined;
  const forced = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  if (forced) return forced; // e.g. ".havengames.org"
  if (!host) return undefined;
  const h = host.toLowerCase();
  return h === "havengames.org" || h.endsWith(".havengames.org")
    ? ".havengames.org"
    : undefined;
}

/** normalize a key: lower-case & strip non-alphanumerics (handles join_code, join-code, user[code], etc.) */
const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

/** flatten nested JSON objects into a single-level map of strings */
function flatten(obj: unknown, out: Record<string, string> = {}, prefix = ""): Record<string,string> {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k;
      flatten(v, out, key);
    }
  } else if (prefix) {
    out[prefix] = obj == null ? "" : String(obj);
  }
  return out;
}

/** read the request body in a very forgiving way (FormData → JSON → text → query) */
async function readLoosePayload(req: Request) {
  // 1) FormData (covers urlencoded + multipart)
  try {
    const fd = await req.clone().formData();
    const m = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    if (Object.keys(m).length) return m;
  } catch {}

  // 2) JSON
  try {
    const j = await req.clone().json();
    if (j && typeof j === "object") {
      const flat = flatten(j);
      if (Object.keys(flat).length) return flat;
    }
  } catch {}

  // 3) text (enctype="text/plain" or custom fetch)
  try {
    const t = await req.clone().text();
    const trimmed = t.trim();
    if (trimmed) {
      // try parse "a=b&c=d" or newline separated "a=b"
      const params = new URLSearchParams(trimmed.replace(/\n+/g, "&"));
      const m: Record<string,string> = {};
      params.forEach((v, k) => (m[k] = v));
      if (Object.keys(m).length) return m;
      // fallback: treat whole thing as a single field named "raw"
      return { raw: trimmed };
    }
  } catch {}

  // 4) query params
  const url = new URL(req.url);
  const q: Record<string,string> = {};
  url.searchParams.forEach((v, k) => (q[k] = v));
  return q;
}

/** pick the two credentials from a loose payload using lots of synonyms */
function pickCredentials(raw: Record<string, string>) {
  // normalize keys -> value
  const table = new Map<string,string>();
  for (const [k, v] of Object.entries(raw)) table.set(norm(k), v?.trim() ?? "");

  // synonyms for the "code" (join code)
  const codeKeys = [
    "code", "joincode", "rumblecode", "invitecode", "gamecode", "usercode",
    "jcode", "jc", "join", "teamcode", "codeid", "username" // last two are "just in case"
  ];
  // synonyms for the "secret" (secret/pin)
  const secretKeys = [
    "secret", "secretcode", "pin", "pincode", "passcode", "password",
    "userpin", "skey", "sec", "pwd"
  ];

  const getFirst = (keys: string[]) => {
    for (const k of keys) {
      const val = table.get(k);
      if (val) return val;
    }
    return "";
  };

  const code = getFirst(codeKeys);
  const secret = getFirst(secretKeys);
  return { code, secret, debugKeys: [...new Set([...table.keys()])].sort() };
}

// ───────── handler ─────────

export async function POST(req: Request) {
  try {
    const payload = await readLoosePayload(req);
    const { code, secret, debugKeys } = pickCredentials(payload);

    if (!code || !secret) {
      // Always include ONLY the keys we saw, for quick debugging (no values)
      return NextResponse.json(
        { ok: false, error: "Missing fields", seenKeys: debugKeys },
        { status: 400 }
      );
    }

    // Adjust these field names ONLY if your Prisma model uses different ones.
    // From your earlier schema, users have joinCode + secretCode.
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
    const host = req.headers.get("host");
    const cookieBase = {
      httpOnly: true as const,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      domain: cookieDomainForProd(host),
      maxAge: 60 * 60 * 24 * 30, // 30 days
    };

    // Set BOTH to be maximally compatible with the rest of your app
    res.cookies.set({ name: "sid", value: String(user.id), ...cookieBase });
    res.cookies.set({ name: "session", value: String(user.id), ...cookieBase });

    return res;
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
