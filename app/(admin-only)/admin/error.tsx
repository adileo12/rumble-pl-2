"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[/admin error]", error); // full stack goes to Vercel Functions logs
  return (
    <div className="p-6 space-y-3">
      <h2 className="text-lg font-semibold">Something went wrong on /admin</h2>
      <p className="text-sm text-gray-600">
        Digest: <code>{error.digest ?? "(none)"}</code>
      </p>
      <button
        onClick={() => reset()}
        className="px-3 py-2 rounded bg-slate-800 text-white"
      >
        Try again
      </button>
    </div>
  );
}
