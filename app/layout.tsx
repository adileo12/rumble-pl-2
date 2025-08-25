// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* set your site-wide bg color here if you want */}
      <body className="min-h-screen bg-slate-50 relative">
        {/* GLOBAL WATERMARK (background layer) */}
        <div
          aria-hidden
          className="fixed inset-0 -z-10 flex items-center justify-center pointer-events-none"
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

        {/* page content */}
        {children}
      </body>
    </html>
  );
}
