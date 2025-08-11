// middleware.ts (at repo root)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/api/auth/login",
  "/api/auth/signup",
  "/favicon.ico",
  "/_next",     // Next.js internals
  "/assets",    // static assets if you have them
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow all public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check session cookie for all other paths
  const session = req.cookies.get("session")?.value; // <-- use your real cookie name
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except files and Next internals
  matcher: ["/((?!_next|.*\\..*).*)"],
};