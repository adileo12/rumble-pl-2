import { cookies } from "next/headers";
import { prisma } from "./db";

export async function getUserIdFromCookies() {
  const jar = await cookies();
  const sid = jar.get("sid")?.value || jar.get("rumble_session")?.value;
  if (!sid) return null;

  // If you store userId directly in the cookie, return it here.
  // Otherwise, look up a session row by sid.
  const session = await prisma.session.findUnique({ where: { id: sid } }).catch(() => null);
  return session?.userId ?? null;
}
