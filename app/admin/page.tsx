// app/admin/page.tsx
"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Make this page dynamic (no static export/prerender)
export const dynamic = "force-dynamic";
export const revalidate = 0;

function Button({
  onClick,
  children,
}: {
  onClick: () => Promise<void> | void;
  children: React.ReactNode;
}) {
  return (
    <button
      onCli
