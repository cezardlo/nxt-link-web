// Force this route segment to be dynamically rendered on every request.
// Without this, Vercel's edge cache serves stale SSR HTML (loading=true, 0 signals)
// and the client-side fetch never replaces the cached initial state.
// deploy-trigger: 2026-04-06
export const dynamic = 'force-dynamic';

export default function IntelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
