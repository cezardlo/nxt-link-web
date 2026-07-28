// Env-gated site-mode banner (real/demo split-prep, workplace/plans task).
//
// When NEXT_PUBLIC_SITE_MODE is exactly 'demo', renders a slim, non-dismissable
// strip at the very top of the page — above any per-page nav — so nobody
// mistakes the demo/sample-data site for the real production marketplace.
// Any other value (including unset, which is production's current state)
// renders nothing: zero DOM, zero layout shift. Production stays
// pixel-identical until the var is deliberately set on the demo deployment.
//
// Server component (no 'use client', no hooks) — NEXT_PUBLIC_* vars are
// inlined at build time, so reading one here needs no client JS.
//
// The root layout is a server component with no access to the client-side
// `nxt_lang` language toggle (localStorage-only — see
// src/components/LanguageToggle.tsx), so both languages are shown together
// on one line instead of picking one.
export default function SiteModeBanner() {
  if (process.env.NEXT_PUBLIC_SITE_MODE !== 'demo') return null;

  return (
    <div
      className="w-full min-h-[32px] flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-3 py-1.5 bg-spec-warning text-spec-ink text-center text-xs font-semibold leading-tight"
    >
      <span lang="en">Demo environment — sample data only</span>
      <span aria-hidden="true">·</span>
      <span lang="es">Entorno de demostración — solo datos de ejemplo</span>
    </div>
  );
}
