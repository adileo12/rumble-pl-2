import Link from "next/link";
import LoginInner from "./LoginInner";

export const dynamic = "force-static";

export default function LoginPage() {
  return (
    <main className="min-h-screen relative">
      <LoginInner />

      {/* Bottom-right admin link */}
      <Link
        href="/admin-login"
        className="fixed bottom-5 right-5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 shadow-sm border border-slate-200/70 bg-white/70 backdrop-blur"
      >
        Admin login
      </Link>
    </main>
  );
}
