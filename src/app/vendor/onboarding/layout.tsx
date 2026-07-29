import type { Viewport } from 'next';

// Route-scoped viewport override: adds `viewport-fit=cover` so the card
// flow's pinned bottom CTA can use `env(safe-area-inset-bottom)` on iOS
// (that env() var only resolves once viewport-fit=cover is set — the root
// layout doesn't set it site-wide, so this is scoped to just this new route
// rather than changing global behavior).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function VendorOnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
