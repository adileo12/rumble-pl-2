export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/src/lib/db";
import Nav from "@/src/components/Nav";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const sid = cookies().get("sid")?.value;
  if (!sid) redirect("/login?next=/home");

  const currentUser = await db.user.findUnique({
    where: { id: sid },
    select: { id: true, displayName: true, isAdmin: true, email: true },
  });

  if (!currentUser) redirect("/login?next=/home");

  return (
    <>
      <Nav currentUser={currentUser} />
      <div className="min-h-screen">{children}</div>
    </>
  );
}