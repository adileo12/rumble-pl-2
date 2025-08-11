import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Nav from "@/src/components/Nav";
import { db } from "@/src/lib/db";

export default async function ProtectedLayout({
  children,
}: { children: React.ReactNode }) {
  const sid = cookies().get("sid")?.value;

  if (!sid) {
    // no cookie → bounce to login
    redirect("/login");
  }

  // Look up the user by id stored in the cookie
  const user = await db.user.findUnique({
    where: { id: sid },
    select: { id: true, displayName: true, isAdmin: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <Nav currentUser={user} />
      <div className="p-4">{children}</div>
    </div>
  );
}