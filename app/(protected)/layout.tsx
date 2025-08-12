export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/src/lib/db";
import Nav from "@/src/components/Nav";
import SiteBrand from "@/src/components/SiteBrand";

export default async function ProtectedLayout({ children, }: { children: React.ReactNode }) {
  const sid = cookies().get("sid")?.value;
  if (!sid) redirect("/login?next=/home");

  const currentUser = await db.user.findUnique({
    where: { id: sid },
    select: { id: true, displayName: true, isAdmin: true, email: true },
  });

  if (!currentUser) redirect("/login?next=/home");

  return (
    <div className= "min-h-screen flex flex-col">
      <SiteBrand />
      <Nav currentUser={{ displayName : User.displayName, isAdmin: user.isAdmin}} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
}
