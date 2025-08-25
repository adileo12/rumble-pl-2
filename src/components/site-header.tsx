import Link from "next/link";
import Image from "next/image";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur border-b">
      {/* 3-column grid keeps the brand perfectly centered on all widths */}
      <div className="max-w-6xl mx-auto h-16 px-4 grid grid-cols-3 items-center">
        {/* left spacer */}
        <div />

        {/* centered brand */}
        <div className="justify-self-center">
          <Link href="/home" className="inline-flex items-center gap-3">
            <Image
              src="/brand/haven-logo.png"
              alt="Haven Rumble"
              width={36}   // a bit larger
              height={36}
              priority
              className="rounded"
            />
            <span className="text-2xl font-semibold tracking-wide">
              Haven Rumble
            </span>
          </Link>
        </div>

        {/* right spacer (keeps brand centered even if future actions are added) */}
        <div />
      </div>
    </header>
  );
}
