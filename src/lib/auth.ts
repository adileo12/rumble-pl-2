import { cookies } from "next/headers";

export function getUserIdFromCookies(): string | null {
  const jar = cookies();
  return jar.get("sid")?.value ?? jar.get("rumble_session")?.value ?? null;
}

  // If you store userId directly in the cookie, return it here.
  // Otherwise, look up a session row by sid.
  const session = await prisma.session.findUnique({ where: { id: sid } }).catch(() => null);
  return session?.userId ?? null;
}
