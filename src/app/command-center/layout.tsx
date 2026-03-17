// src/app/command-center/layout.tsx
// Suppresses the global NavRail/AppShell for the command center — full-screen layout only.

export default function CommandCenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#07070F' }}>
      {children}
    </div>
  );
}
