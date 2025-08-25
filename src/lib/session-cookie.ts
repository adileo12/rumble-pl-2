// Return cookie options, using the shared domain only in production.
export function sessionCookieOptions() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const isProd = base.includes("havengames.org");

  return {
    secure: true,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    ...(isProd ? { domain: ".havengames.org" } : {}), // works for apex + www in prod
  };
}
