'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [secretCode, setSecretCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secretCode, name }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Login failed');
      location.href = '/play';
    } catch (e:any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Enter Secret Code</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="border rounded w-full p-2" placeholder="Secret code" value={secretCode} onChange={e=>setSecretCode(e.target.value)} required />
        <input className="border rounded w-full p-2" placeholder="Your name (only first time)" value={name} onChange={e=>setName(e.target.value)} />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button disabled={busy} className="bg-black text-white rounded px-4 py-2">{busy?'Working…':'Continue'}</button>
      </form>
    </main>
  );
}
