import type { ReactNode } from 'react';
import { AccessGate } from '@/components/AccessGate';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AccessGate title="Admin tools">{children}</AccessGate>;
}
