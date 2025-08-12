import "./globals.css";
import Image from "next/image";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-white text-slate-900">
        {/* Single, persistent brand header */}
        <header className="w-full border-b bg-white/90 backdrop-blur py-4">
          <Link
            href="/home"
            aria-label="Haven Games Home"
            className="group mx-auto flex max-w-5xl items-center justify-center gap-3 px-4 no-underline text-inherit hover:opacity-90"
          >
            <span className="select-none text-2xl sm:text-3xl font-extrabold tracking-tight">
              HAVEN
            </span>
            <Image
              src="/haven-logo.png"
              alt="Haven Games Logo"
              width={44}
              height={44}
              priority
              className="object-contain"
            />
            <span className="select-none text-2xl sm:text-3xl font-extrabold tracking-tight">
              GAMES
            </span>
          </Link>
        </header>

        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}