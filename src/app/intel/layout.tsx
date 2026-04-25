// Force dynamic rendering — no edge cache
// Prevents Vercel edge cache from serving stale SSR HTML
import { AccessGate } from '@/components/AccessGate';

export const dynamic = 'force-dynamic';

export default function IntelLayout({ children }: { children: React.ReactNode }) {
  return <AccessGate title="Private signals desk">{children}</AccessGate>;
}
