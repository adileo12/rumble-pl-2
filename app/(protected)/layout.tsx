// app/(protected)/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/src/lib/db";
import Nav from "@/src/components/Nav";

export default async function ProtectedLayout({
  children,
}: { children: React.ReactNode }) {
  const sid = cookies().get("sid")?.value;
  if (!sid) redirect("/login?next=/home");

  const user = await db.user.findUnique({
    where: { id: sid },
    select: { id: true, displayName: true, isAdmin: true },
  });
  if (!user) redirect("/login?next=/home");

  return (
    <>
      <Nav user={user} />
      <div className="min-h-screen">{children}</div>
    </>
  );
}