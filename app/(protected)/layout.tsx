// app/(protected)/layout.tsx
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Assumes middleware already redirected unauthenticated users to /login
  return (
    <div className="min-h-screen">
      {/* Put your site chrome (header/nav) here if you like */}
      {children}
    </div>
  );
}