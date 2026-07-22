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
// Deliberately keeps the vendor pages' existing DARK chrome (this is a
// navigation-coherence fix, not the light Design System v1.0 reskin — that is
// a later slice per the blueprint's Stage 4 note).
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

import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { clearLocalCart } from '@/components/cart/useCart';
import type { ReactNode } from 'react';

export type VendorNavKey = 'portal' | 'listings' | 'leads' | 'quotes' | 'deals';

const LINKS: { key: VendorNavKey; href: string; label: string }[] = [
  { key: 'portal', href: '/vendor/portal', label: 'Portal' },
  { key: 'listings', href: '/vendor/listings', label: 'Listings' },
  { key: 'leads', href: '/vendor/leads', label: 'Leads' },
  { key: 'quotes', href: '/vendor/quotes', label: 'Quotes' },
  { key: 'deals', href: '/vendor/deals', label: 'Deals' },
];

export default function VendorNav({ active, extra }: { active: VendorNavKey; extra?: ReactNode }) {
  async function signOut() {
    try {
      const sb = createBrowserSupabaseClient();
      await sb.auth.signOut();
      clearLocalCart();
    } catch { /* ignore — still send them to sign-in */ }
    window.location.href = '/vendor-login';
  }

  return (
    <nav className="vnav">
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
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

const CSS = `
.vnav{position:sticky;top:0;z-index:30;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.08);font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.vnav *{box-sizing:border-box;}
.vnav-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px 14px;padding:14px 26px 10px;}
.vnav-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;flex-shrink:0;}
.vnav-brand b{font-size:17px;font-weight:700;letter-spacing:-.02em;}
.vnav-brand i{color:#A78BFA;font-style:normal;}
.vnav-brand span{color:#8080A0;font-size:13px;font-weight:500;}
.vnav-right{display:flex;align-items:center;gap:12px;flex-shrink:0;}
.vnav-signout{font-family:inherit;background:none;border:1px solid rgba(255,255,255,.12);color:#C0C0D0;font-size:13px;font-weight:500;padding:8px 14px;border-radius:9px;cursor:pointer;white-space:nowrap;}
.vnav-signout:hover{border-color:#A78BFA;color:#F0F0F5;}
.vnav-linkrow{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:0 26px 12px;}
.vnav-linkrow::-webkit-scrollbar{display:none;}
.vnav-link{flex-shrink:0;font-size:13px;font-weight:600;color:#C0C0D0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:8px 14px;text-decoration:none;white-space:nowrap;transition:border-color .15s,color .15s,background .15s;}
.vnav-link:hover{color:#F0F0F5;border-color:#A78BFA;}
.vnav-link[aria-current="page"]{color:#F0F0F5;background:rgba(124,92,252,.2);border-color:#7C5CFC;}
.vnav a:focus-visible,.vnav button:focus-visible{outline:2px solid #A78BFA;outline-offset:2px;}
@media(max-width:600px){.vnav-top{padding:12px 16px 8px;}.vnav-linkrow{padding:0 16px 12px;}}
`;
