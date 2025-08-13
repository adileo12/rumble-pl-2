import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const sid = req.cookies.get("sid")?.value;
  const path = req.nextUrl.pathname;

  const needsAuth =
    path.startsWith("/home") ||
    path.startsWith("/leaderboard") ||
    path.startsWith("/admin");

  if (needsAuth && !sid) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/leaderboard/:path*", "/admin/:path*"],
};