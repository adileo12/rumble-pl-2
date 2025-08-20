import { cookies } from "next/headers";

export async function getUserIdFromCookies() {
  const jar = await cookies();
  const sid = jar.get("sid")?.value || jar.get("rumble_session")?.value;
  return sid ?? null;

  // If you store userId directly in the cookie, return it here.
  // Otherwise, look up a session row by sid.
  const session = await prisma.session.findUnique({ where: { id: sid } }).catch(() => null);
  return session?.userId ?? null;
}
