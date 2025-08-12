// app/(public)/login/page.tsx
"use client";
import { Suspense } from "react";
import LoginInner from "./LoginInner";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}