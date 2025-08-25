import Link from "next/link";
import Image from "next/image";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur border-b">
      {/* 3-column grid keeps brand perfectly centered on all widths */}
      <div className="max-w-6xl mx-auto h-16 px-4 grid grid-cols-3 items-center">
        {/* left spacer */}
        <div />

        {/* centered brand with subtle hover animation */}
        <div className="justify-self-center">
          <Link
            href="/home"
            aria-label="Go to home"
            className="
              group relative inline-flex items-center gap-3 rounded-lg px-2 py-1
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70
              transition-colors
            "
          >
            <Image
              src="/brand/haven-logo.png"
              alt="Haven Rumble"
              width={36}
              height={36}
              priority
              className="
                rounded drop-shadow-sm
                transition-transform motion-safe:duration-200 motion-safe:ease-out
                group-hover:scale-110 group-hover:-rotate-1
                motion-reduce:transform-none motion-reduce:transition-none
              "
            />
            <span
              className="
                text-2xl font-semibold tracking-wide
                transition-transform motion-safe:duration-200
                group-hover:translate-x-[1px]
                motion-reduce:transform-none motion-reduce:transition-none
              "
            >
              Haven Rumble
            </span>
          </Link>
        </div>

        {/* right spacer */}
        <div />
      </div>
    </header>
  );
}
