import { PageTopBar } from '@/components/PageTopBar';
import { SystemDashboard } from '@/components/SystemDashboard';
import AgentControlRoom from '@/components/AgentControlRoom';
import { BottomNav } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function PlatformStatusPage() {
  return (
    <div className="min-h-screen bg-black">
      <PageTopBar
        backHref="/map"
        backLabel="MAP"
        breadcrumbs={[{ label: 'PLATFORM STATUS' }]}
        showLiveDot={true}
      />
      <main className="max-w-5xl mx-auto px-6 py-6 pb-20">
        <div className="mb-6">
          <h1 className="font-mono text-[11px] tracking-[0.3em] text-white/50 uppercase">Platform Status</h1>
          <p className="font-mono text-[8px] tracking-[0.15em] text-white/20 mt-1">SYSTEM HEALTH + AGENT OPERATIONS</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SystemDashboard />
          <AgentControlRoom />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
