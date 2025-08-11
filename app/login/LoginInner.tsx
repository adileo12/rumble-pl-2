'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginInner() {
  const search = useSearchParams();            // safe here (inside Suspense)
  const signupSuccess = search.get('new') === '1';

  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string|null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretCode: secret }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Login failed');
      // redirect after login
      window.location.href = '/'; // home (protected area)
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Log in</h1>
      {signupSuccess && (
        <p className="mb-3 text-sm text-green-700">
          Secret created! Enter it below to log in.
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Secret code</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-4 text-sm">
        <a href="/signup" className="underline">Create a secret code</a>
        <a href="/admin/login" className="underline float-right">Admin login</a>
      </div>
    </main>
  );
}