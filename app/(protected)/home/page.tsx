// app/(protected)/home/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Home</h1>
      <p>If you can see this, auth worked and the page is dynamic.</p>
    </main>
  );
}