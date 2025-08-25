import "./globals.css";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        {/* WATERMARK — keep it ABOVE the body background (no negative z-index) */}
        <div
          aria-hidden
          className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none"
        >
          <div
            className="
              bg-[url('/brand/haven-logo.png')]
              bg-no-repeat bg-center bg-contain
              opacity-[0.06]
              w-[60vw] max-w-[720px] h-[60vw] max-h-[720px]
            "
          />
        </div>

        {/* CONTENT — ensure it sits above the watermark */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
