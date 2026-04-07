// Force dynamic rendering — no edge cache
// Prevents Vercel edge cache from serving stale SSR HTML
export const dynamic = 'force-dynamic';

export default function IntelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
