// NXT//LINK vendor terms — the agreement a vendor must accept before publishing
// listings or receiving leads (build step 1: revenue protection). Bump
// VENDOR_TERMS_VERSION when the terms change; vendors must re-accept.
//
// NOTE: business terms, NOT attorney-reviewed legal language. Per
// MARKETPLACE_BLUEPRINT §13, a lawyer must review the final Vendor Agreement
// before real commerce. The fee schedule mirrors the sacred fee engine
// (src/lib/fees/engine.ts, launch-v3): 4% first $50k, 2% above, $12,500 cap.

export const VENDOR_TERMS_VERSION = 'v1-2026-07-08';

export interface TermItem { title: string; body: string }

export const VENDOR_TERMS: TermItem[] = [
  {
    title: 'Commission on NXT//LINK deals',
    body: 'NXT//LINK earns a disclosed commission on deals that begin from an NXT//LINK lead: 4% on the first $50,000 of the eligible subtotal, 2% above that, capped at $12,500. The commission is vendor-side and charged only on deals that close through NXT//LINK (subject to final legal/tax review).',
  },
  {
    title: 'Protected period',
    body: 'When a buyer reaches you through NXT//LINK, that opportunity is protected for a set period. If it closes during that period — even off-platform — the commission is still owed.',
  },
  {
    title: 'No going around the platform',
    body: 'You will not redirect an NXT//LINK buyer off-platform to avoid the commission. Quote requests, sales conversations, demos, and pilots for NXT//LINK buyers happen inside NXT//LINK.',
  },
  {
    title: 'Accurate listings',
    body: 'You are responsible for the accuracy of your listings, credentials, pricing, and claims. Misleading listings can be unpublished.',
  },
  {
    title: 'Fair quote responses',
    body: 'You will respond to NXT//LINK quote requests promptly and give an honest, same-scope quote — never penalizing NXT//LINK buyers with an added fee.',
  },
];

export const VENDOR_TERMS_SUMMARY =
  'Commission on NXT//LINK-originated deals, a protected period, no going around the platform, accurate listings, and fair quote responses.';
