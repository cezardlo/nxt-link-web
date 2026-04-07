// Force dynamic rendering — no edge cache
export const dynamic = 'force-dynamic';

export default function IntelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
