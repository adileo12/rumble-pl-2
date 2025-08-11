// app/(public)/layout.tsx
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth checks here. Keep it simple and fast.
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {children}
    </div>
  );
}