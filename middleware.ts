import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = [
  "/",
  "/login",
  "/signup",
  "/admin-login",
  "/api"
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // allow all public paths and static assets
  if (PUBLIC.some(p => pathname === p|| pathname.startsWith("api"))) {
  return NextResponse.next();
  }

  // check for your session cookie, e.g
   const session = req.cookies.get("session")?.value;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// limit to paths you actually want to guard (optional):
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

