import "./globals.css";
import type { ReactNode } from "react";
import SiteHeader from "@/src/components/site-header";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        {/* GLOBAL WATERMARK (background on all pages) */}
        <div
          aria-hidden
          className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none"
        >
          <div
            className="
              bg-[url('/brand/haven-logo.png')]
              bg-no-repeat bg-center bg-contain
              opacity-[0.06] dark:opacity-[0.08]
              w-[60vw] max-w-[720px] h-[60vw] max-h-[720px]
            "
          />
        </div>

        {/* EVERYTHING visible sits above the watermark */}
        <div className="relative z-10">
          {/* HEADER always on top */}
          <SiteHeader />

          {/* PAGE CONTENT */}
          {children}
        </div>
      </body>
    </html>
  );
}
