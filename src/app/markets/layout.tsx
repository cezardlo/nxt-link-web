import { AccessGate } from '@/components/AccessGate';

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return <AccessGate title="Private market intelligence">{children}</AccessGate>;
}
