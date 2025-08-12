// app/(public)/layout.tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // No header/brand here. The global brand is already in app/layout.tsx
  return <div className="page">{children}</div>;
}