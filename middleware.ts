import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login",
  "/signup",
  "/admin-login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/signup",
  "/api/auth/admin-login",
  "/_next", // next assets
  "/favicon.ico",
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // allow all public paths and static assets
  if ([...PUBLIC_PATHS].some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/api")) return NextResponse.next();

  // require session for everything else
  const token = req.cookies.get("session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
