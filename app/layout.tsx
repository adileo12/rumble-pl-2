export const metadata = { title: 'Rumble', description: 'PL Rumble Game' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', margin: 0, padding: 20 }}>
        <header style={{ display:'flex', gap:16, alignItems:'center', marginBottom:16 }}>
          <h1 style={{ margin:0 }}>Rumble</h1>
          <nav style={{ display:'flex', gap:12 }}>
            <a href="/">Dashboard</a>
            <a href="/leaderboard">Leaderboard</a>
            <a href="/admin">Admin</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
