import Image from "next/image";
import Link from "next/link";

export default function SiteBrand() {
  return (
    <header className="w-full">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 p-6">
        <Link
          href="/"
          className="flex items-center gap-3 select-none no-underline"
          aria-label="Go to Home"
        >
          <span className="text-3xl font-extrabold tracking-wider">
            HAVEN
          </span>

          {/* Logo between HAVEN and GAMES */}
          <Image
            src="/haven-logo.png"
            width={48}
            height={48}
            alt="Haven Games logo"
            priority
            className="h-12 w-12"
          />

          <span className="text-3xl font-extrabold tracking-wider">
            GAMES
          </span>
        </Link>
      </div>
    </header>
  );
}