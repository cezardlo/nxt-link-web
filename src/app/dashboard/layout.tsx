import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NXT//LINK — CEO Intelligence Dashboard',
  description: 'Your daily technology intelligence briefing. See what is moving, what is surging, and what matters.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#000', overflowX: 'hidden' }}>
      {children}
    </div>
  );
}
