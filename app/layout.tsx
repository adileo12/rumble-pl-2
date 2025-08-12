import "./globals.css";
import Image from "next/image";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Persistent Header */}
        <header className="w-full border-b bg-white shadow-sm py-4">
          <div className="flex justify-center items-center gap-3">
            <span className="text-3xl font-extrabold tracking-wide">HAVEN</span>
            <Image
              src="/haven-logo.png"
              alt="Haven Games Logo"
              width={50}
              height={50}
              className="object-contain"
            />
            <span className="text-3xl font-extrabold tracking-wide">GAMES</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}