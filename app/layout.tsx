// app/layout.tsx
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Haven Games",
  description: "Haven Games",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="w-full border-b bg-white shadow-sm py-4">
          <Link
            href="/home"
            className="mx-auto flex max-w-5xl items-center justify-center gap-3 px-4"
            aria-label="Haven Games Home"
          >
            <span className="text-2xl sm:text-3xl font-extrabold tracking-wide">HAVEN</span>
            <Image
              src="/haven-logo.png"
              alt="Haven Games Logo"
              width={48}
              height={48}
              priority
              className="object-contain"
            />
            <span className="text-2xl sm:text-3xl font-extrabold tracking-wide">GAMES</span>
          </Link>
        </header>

        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}