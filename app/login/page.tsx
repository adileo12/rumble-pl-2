// app/login/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import LoginInner from './LoginInner';

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading login…</div>}>
      <LoginInner />
    </Suspense>
  );
}