export const dynamic = 'force-dynamic';
export const revalidate = 0;

import React from "react";
import SiteBrand from "@/src/components/SiteBrand";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteBrand />
      <main className="flex-1">{children}</main>
    </div>
  );
}