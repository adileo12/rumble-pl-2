// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rumble",
  description: "Rumble PL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Global <head> is handled by Next; add fonts/meta in here if needed */}
      <body className="min-h-screen bg-white text-black">
        {children}
      </body>
    </html>
  );
}