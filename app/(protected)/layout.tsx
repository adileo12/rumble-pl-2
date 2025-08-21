export const dynamic = 'force-dynamic';
export const revalidate = false;

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/src/lib/db";
import Nav from "@/src/components/Nav";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const sid = cookies().get("sid")?.value;
  if (!sid) redirect("/login?next=/home");

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { id: true, name: true, isAdmin: true },
  });
  if (!user) redirect("/login?next=/home");

  return (
    <div className="min-h-screen flex flex-col">
      <Nav currentUser={{ name: user.name, isAdmin: user.isAdmin }} />
      <main className="flex-1">{children}</main>
    </div>
  );
}

console.log("[tripwire] app/(protected)/layout.tsx -> revalidate =", revalidate);
