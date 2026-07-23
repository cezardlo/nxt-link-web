'use client';

// ONE shared vendor nav (Flow Blueprint 2026-07-22, §4 "ONE shared VendorNav"
// — workplace/plans/FLOW-BLUEPRINT-2026-07-22.md). Replaces five divergent
// implementations (.vp-navlink on /vendor/portal, .sc-link on /vendor/listings,
// .ld-link on /vendor/leads, .vd-pill on /vendor/deals, .vp-pill on
// /vendor/quotes) that disagreed on the link set and never surfaced
// /vendor/quotes from portal/listings/leads. Every consuming page now gets the
// identical link set: Portal · Listings · Leads · Quotes · Deals, "Seller
// Central" subtitle, Sign out.
//
// Premium polish Phase 2 (2026-07-23): reskinned light per Design System v1.0
// — the dashboards now continue the marketplace's light violet look instead
// of the old dark v4 chrome. Visual/CSS only; structure unchanged.
//
// Mobile: the link row reuses the homepage's proven horizontal-scroll pill
// mechanism (`.hp-catbar` in src/app/page.tsx) instead of inventing a new
// pattern — direct fix for the audited vendor-dashboard mobile nav overflow
// at 360-414px.
//
// `extra` is an escape hatch for the handful of page-specific controls that
// existed in one or two of the five old navs (language toggle, notification
// bell, approval-status badge) — kept so consolidating to the shared nav
// doesn't quietly remove functionality. It renders left of Sign out.

import { IBM_Plex_Sans } from 'next/font/google';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { clearLocalCart } from '@/components/cart/useCart';
import { useLang } from '@/components/LanguageToggle';
import type { ReactNode } from 'react';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-vnav',
  display: 'swap',
});

export type VendorNavKey = 'portal' | 'listings' | 'leads' | 'quotes' | 'deals' | 'marketplace';

const LINKS: { key: VendorNavKey; href: string; label: string }[] = [
  { key: 'portal', href: '/vendor/portal', label: 'Portal' },
  { key: 'listings', href: '/vendor/listings', label: 'Listings' },
  { key: 'leads', href: '/vendor/leads', label: 'Leads' },
  { key: 'quotes', href: '/vendor/quotes', label: 'Quotes' },
  { key: 'deals', href: '/vendor/deals', label: 'Deals' },
  // The public marketplace — added so a signed-in vendor can always reach it
  // (fix for the nav trap where /marketplace was invisible from Seller Central,
  // 2026-07-23). It is a jump-out to the browse surface, never an "active"
  // state on any vendor page, so it carries no aria-current. Label is the one
  // localized item in this otherwise English section-name nav (EN/ES rule).
  { key: 'marketplace', href: '/marketplace', label: 'Marketplace' },
];

export default function VendorNav({ active, extra }: { active: VendorNavKey; extra?: ReactNode }) {
  const [lang] = useLang();
  async function signOut() {
    try {
      const sb = createBrowserSupabaseClient();
      await sb.auth.signOut();
      clearLocalCart();
    } catch { /* ignore — still send them to sign-in */ }
    window.location.href = '/vendor-login';
  }

  return (
    <nav className={`vnav ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="vnav-top">
        <a className="vnav-brand" href="/vendor/portal"><b>NXT<i>{'//'}</i>LINK</b><span>Seller Central</span></a>
        <div className="vnav-right">
          {extra}
          <button type="button" className="vnav-signout" onClick={signOut}>Sign out</button>
        </div>
      </div>
      <div className="vnav-linkrow">
        {LINKS.map((l) => (
          <a
            key={l.key}
            className="vnav-link"
            href={l.href}
            aria-current={l.key === active ? 'page' : undefined}
          >
            {l.key === 'marketplace' && lang === 'es' ? 'Mercado' : l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

const CSS = `
.vnav{position:sticky;top:0;z-index:30;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--spec-border,#E2DFEC);font-family:var(--font-ibm-plex-sans-vnav),'IBM Plex Sans',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.vnav *{box-sizing:border-box;}
.vnav-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px 14px;padding:14px 26px 10px;}
.vnav-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;flex-shrink:0;}
.vnav-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:17px;font-weight:700;letter-spacing:-.02em;}
.vnav-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.vnav-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;font-weight:500;}
.vnav-right{display:flex;align-items:center;gap:12px;flex-shrink:0;}
.vnav-signout{font-family:inherit;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);font-size:13px;font-weight:500;padding:8px 14px;border-radius:9px;cursor:pointer;white-space:nowrap;}
.vnav-signout:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.vnav-linkrow{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:0 26px 12px;}
.vnav-linkrow::-webkit-scrollbar{display:none;}
.vnav-link{flex-shrink:0;font-size:13px;font-weight:600;color:var(--spec-text-2nd,#615F72);background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:99px;padding:8px 14px;text-decoration:none;white-space:nowrap;transition:border-color .15s,color .15s,background .15s;}
.vnav-link:hover{color:var(--spec-violet-deep,#4A3DB0);border-color:var(--spec-violet,#6C5CE0);}
.vnav-link[aria-current="page"]{color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.12);border-color:var(--spec-violet,#6C5CE0);font-weight:700;}
.vnav a:focus-visible,.vnav button:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
@media(max-width:600px){.vnav-top{padding:12px 16px 8px;}.vnav-linkrow{padding:0 16px 12px;}}
`;
