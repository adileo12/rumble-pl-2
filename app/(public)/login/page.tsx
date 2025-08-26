import Link from "next/link";
import LoginInner from "@/app/login/LoginInner";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4">Sign in with Secret Code</h1>
        <LoginInner />

        {/* link under the sign-in button */}
        <div className="mt-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
          >
            Need a code? Generate a secret code →
          </Link>
        </div>

        {/* admin link bottom-right */}
        <div className="mt-10 flex justify-end">
          <Link
            href="/admin"
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-4"
          >
            Admin login
          </Link>
        </div>
      </div>
    </div>
  );
}
