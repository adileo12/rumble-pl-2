import Link from "next/link";
import Image from "next/image";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto h-14 px-4 flex items-center justify-between">
        <Link href="/home" className="inline-flex items-center gap-3">
          <Image
            src="/brand/haven-logo.png"
            alt="Haven Rumble"
            width={28}
            height={28}
            priority
            className="rounded"
          />
          <span className="font-semibold tracking-wide">Haven Rumble</span>
        </Link>

        {/* quick nav (optional) */}
        <nav className="hidden md:flex items-center gap-4 text-sm text-slate-700">
          <Link href="/rumble" className="hover:underline">Rumble</Link>
          <Link href="/rumble/reports" className="hover:underline">Reports</Link>
          <Link href="/profile" className="hover:underline">Profile</Link>
        </nav>
      </div>
    </header>
  );
}
