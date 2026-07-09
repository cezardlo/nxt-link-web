// NXT//LINK vendor terms — the agreement a vendor must accept before publishing
// listings or receiving leads (build step 1: revenue protection). Bump
// VENDOR_TERMS_VERSION when the terms change; vendors must re-accept.
//
// NOTE: business terms, NOT attorney-reviewed legal language. Per
// MARKETPLACE_BLUEPRINT §13, a lawyer must review the final Vendor Agreement
// before real commerce. The fee schedule mirrors fee_policies 'provisional-v1'.

export const VENDOR_TERMS_VERSION = 'v1-2026-07-08';

export interface TermItem { title: string; body: string }

export const VENDOR_TERMS: TermItem[] = [
  {
    title: 'Commission on NXT//LINK deals',
    body: 'NXT//LINK earns a disclosed commission on deals that begin from an NXT//LINK lead. Provisional schedule: 15% up to $10,000, 12.5% up to $50,000, 10% above (subject to final legal/tax review).',
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
