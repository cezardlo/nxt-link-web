// src/app/command-center/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NXT//LINK — Command Center',
  description: 'Technology Intelligence Operations Center',
};

export default function CommandCenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#03050a' }}>
      {children}
    </div>
  );
}
