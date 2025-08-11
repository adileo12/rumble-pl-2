// app/(site)/layout.tsx
import { cookies } from "next/headers";
import { db } from "@/src/lib/db";
import Link from "next/link";

// app/(protected)/layout.tsx
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <div>{/* Navbar/Tabs here */}{children}</div>;
}

  if (token) {
    const session = await db.session.findUnique({
      where: { token },
      select: { user: { select: { displayName: true, isAdmin: true } } }
    });
    user = session?.user ?? null;
  }

  return (
    <div>
      <nav className="border-b p-4 flex gap-4">
        <Link href="/home">Home</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/play">Play</Link>
        {user?.isAdmin && <Link href="/admin">Admin</Link>}
        <form action="/api/auth/logout" method="post" className="ml-auto">
          <button className="underline text-sm">Logout</button>
        </form>
      </nav>
      <div>{children}</div>
    </div>
  );
}
