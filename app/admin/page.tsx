async function call(path: string) {
  'use server';
  const res = await fetch(path, { method: 'POST' });
  return await res.json();
}

export default function Admin() {
  return (
    <main>
      <h2>Admin</h2>
      <form action={async () => { await call('/api/admin/seed'); }}>
        <button type="submit">Seed DB (Clubs + Season)</button>
      </form>
      <form action={async () => { await call('/api/fixtures/sync'); }}>
        <button type="submit" style={{ marginTop: 12 }}>Sync Fixtures (FPL)</button>
      </form>
      <p style={{ marginTop: 12 }}>1) Seed → 2) Sync Fixtures → check /api/status.</p>
      <p>Note: This MVP leaves auth/picks/jokers for the next step.</p>
    </main>
  );
}
