// Marketplace Terms — plain-language DRAFT pending attorney review.
import Link from 'next/link';
import {
  Handshake, KeyRound, Workflow, ClipboardList, Percent, ShieldAlert,
  BadgeCheck, Receipt, RefreshCw, ShieldCheck, ListChecks, type LucideIcon,
} from 'lucide-react';

export const metadata = { title: 'Terms of Service — NXT//LINK' };

export default function TermsPage() {
  return (
    <div style={S.page} className="tos-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={S.wrap}>
        <Link href="/" style={S.brand} className="tos-brand">NXT//LINK</Link>
        <div style={S.draft}>DRAFT — pending attorney review. These plain-language terms describe how the marketplace works today and will be replaced by a professionally reviewed version before general availability.</div>
        <h1 style={S.h1}>Terms of Service</h1>
        <p style={S.meta}>Last updated: July 9, 2026</p>

        <div style={S.summary}>
          <div style={S.summaryTitle}>
            <span style={S.summaryTitleIcon} aria-hidden="true"><ListChecks size={16} strokeWidth={1.75} /></span>
            The short version
          </div>
          <ul style={S.summaryList} className="tos-sumlist" role="list">
            {SUMMARY.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={i} style={i > 0 ? { ...S.summaryItem, ...S.summaryItemDivider } : S.summaryItem} role="listitem">
                  <span style={S.summaryIcon} aria-hidden="true"><Icon size={16} strokeWidth={1.75} /></span>
                  <span style={S.summaryItemBody}>
                    <span style={S.summaryLabel}>{item.label}</span>
                    <span style={S.summaryText}>{item.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p style={S.summaryNote}>This is a plain-language summary to help you read quickly. The numbered sections below are the full terms — they’re what’s binding.</p>
        </div>

        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
          <section key={s.t}>
            <h2 style={S.h2}>
              <span style={S.h2icon} aria-hidden="true"><Icon size={14} strokeWidth={1.75} /></span>
              {s.t}
            </h2>
            <p style={S.plain}><span style={S.plainLbl}>In plain terms — </span>{s.plain}</p>
            {s.feebar && (
              <div style={S.feebar} aria-hidden="true">
                <span style={S.feebarSeg1} />
                <span style={S.feebarSeg2} />
                <span style={S.feebarCap} />
              </div>
            )}
            {s.p.map((p, i) => <p key={i} style={S.p}>{p}</p>)}
          </section>
          );
        })}

        <p style={S.p}>Questions? Contact <a style={S.a} className="tos-a" href="mailto:hello@nxtlinktech.com">hello@nxtlinktech.com</a>. See also our <Link style={S.a} className="tos-a" href="/privacy">Privacy Policy</Link>.</p>
      </div>
    </div>
  );
}

// Each section keeps its formal, binding paragraphs (`p`, unchanged pending
// attorney review) and adds a friendly one-line `plain` summary rendered above
// them. The plain lines are a reader aid, NOT a substitute for the binding text
// (stated in the summary box + draft banner). Keep `plain` faithful to `p`.
type Section = { t: string; icon: LucideIcon; plain: string; feebar?: boolean; p: string[] };
const SECTIONS: Section[] = [
  { t: '1. What NXT//LINK is', icon: Handshake,
    plain: 'We’re the marketplace that introduces buyers and vendors. The actual sale is a contract between those two companies — not with us.',
    p: [
    'NXT//LINK is an industrial supply chain marketplace connecting buyers with vendors of technology, hardware, equipment, and services. NXT//LINK is a marketplace and coordinator — we are not the seller of record, manufacturer, or provider of the listed products and services. Contracts for purchases are between the buyer and the vendor.',
  ]},
  { t: '2. Accounts', icon: KeyRound,
    plain: 'Use real information, keep your password safe, and you’re responsible for what happens under your account.',
    p: [
    'You must provide accurate information and keep your login credentials secure. You are responsible for activity under your account. Operator accounts are granted by NXT//LINK only.',
  ]},
  { t: '3. How deals work (both parties)', icon: Workflow,
    plain: 'Anyone can browse. Once you’re talking about a deal, keep it on NXT//LINK. Contact details stay hidden until a quote is accepted, and going around the platform to dodge the fees or rules isn’t allowed.',
    p: [
    'Public discovery is open: anyone can browse vendors, listings, brochures, and case studies. Deal activity — quote requests, sales conversations, demos, pilots, purchases — is managed through NXT//LINK. Contact details are withheld until a buyer accepts a quote. Attempting to bypass the platform to avoid its rules or fees is a violation of these terms.',
  ]},
  { t: '4. Buyer terms', icon: ClipboardList,
    plain: 'Your request goes to the right vendors. We may earn a commission from the vendor — never from you, and it can’t be added on top of your price. You can review a vendor after an accepted quote.',
    p: [
    'Quote requests you submit are shared with the relevant vendor as an NXT//LINK-originated opportunity. NXT//LINK may receive a commission from the vendor on deals that begin on the platform; this never increases the legitimate quoted price you receive — vendors are prohibited from adding the commission as a buyer surcharge.',
    'Reviews may only be left after a verified engagement (an accepted quote).',
  ]},
  { t: '5. Vendor terms', icon: Percent, feebar: true,
    plain: 'To sell here you accept a commission on deals that start on NXT//LINK — 4% of the first $50,000, 2% after that, capped at $20,000. Keep those deals on-platform during a protected period (currently 12 months), keep your listings accurate, respond to leads here, and report closed deals.',
    p: [
    'Before publishing listings or receiving leads, vendors must accept the NXT//LINK vendor terms, which include: a disclosed commission on NXT//LINK-originated deals (4% on the first $50,000 of the eligible subtotal, 2% above that, capped at $20,000 — subject to final review); a protected period (currently 12 months) during which commission remains owed even if the same opportunity closes off-platform; responding to platform leads inside the platform; not redirecting platform buyers off-platform; keeping listings accurate; and reporting closed deals. NXT//LINK may suspend vendors who violate these rules.',
  ]},
  { t: '6. Content and conduct', icon: ShieldAlert,
    plain: 'Don’t post anything false, illegal, or that isn’t yours, and don’t try to scrape or break the site. We can remove content and limit accounts that do.',
    p: [
    'You may not post unlawful, misleading, or infringing content; misrepresent credentials or certifications; scrape the platform; or interfere with its operation. NXT//LINK may remove content and restrict accounts to protect the marketplace.',
  ]},
  { t: '7. Verification and disclaimers', icon: BadgeCheck,
    plain: 'A “Verified” badge means we reviewed some evidence — it’s not a guarantee. Vendors are responsible for what they sell, and the site is provided “as is.”',
    p: [
    'Verification badges describe evidence NXT//LINK reviewed; they are not a guarantee of any product, service, or outcome. Vendors remain responsible for the lawful sale, safety, quality, warranties, and delivery of what they offer. The platform is provided "as is" to the maximum extent permitted by law.',
  ]},
  { t: '8. Fees and payment', icon: Receipt,
    plain: 'We invoice vendors for their commission. Buyers don’t pay through the site yet — for now you pay the vendor directly.',
    p: [
    'Vendor commissions are invoiced by NXT//LINK with stated payment terms. Marketplace payment processing (buyer payments through the platform) is not yet offered; buyers pay vendors directly under their own commercial terms.',
  ]},
  { t: '9. Changes and termination', icon: RefreshCw,
    plain: 'We can update these terms. You can close your account anytime, but anything you already owe — like a commission during the protected period — still applies.',
    p: [
    'We may update these terms; continued use after an update is acceptance. You may close your account at any time; obligations already incurred (including commissions on originated deals within the protected period) survive termination.',
  ]},
];

// A friendly whole-page summary shown above the sections. Explicitly labeled as
// a summary that does not replace the binding text below.
type SummaryItem = { icon: LucideIcon; label: string; text: string };
const SUMMARY: SummaryItem[] = [
  { icon: Handshake, label: 'Marketplace, not the seller',
    text: 'NXT//LINK connects buyers and vendors. We’re the marketplace, not the seller — your contract is with the other company.' },
  { icon: Workflow, label: 'Open browsing, tracked deals',
    text: 'Browsing is open to everyone. Once a deal starts, keep the conversation and the deal on NXT//LINK.' },
  { icon: ShieldCheck, label: 'Free for buyers',
    text: 'Buyers use it free. A vendor’s price to you is never marked up to cover our fee.' },
  { icon: Percent, label: 'Vendor commission applies',
    text: 'Vendors accept a commission on deals that start here: 4% of the first $50,000, 2% above that, capped at $20,000.' },
  { icon: ShieldAlert, label: 'Play it straight',
    text: 'Be honest, keep listings accurate, and don’t route around the platform to avoid the rules or fees.' },
];

// Design System v1.0 light reskin (2026-07-28, design batch 1): swaps the old
// v4 dark theme (#0A0A0F) for the spec's warm-white + violet tokens, same as
// every other public page. Visual/CSS only — SECTIONS copy above is
// byte-identical, untouched. The `tos-` classes below only add a
// :hover/:focus-visible ring in the brand violet (inline style objects can't
// express pseudo-classes); the global `a:focus-visible` rule already gave
// every link a visible ring, this just brings the color on-brand for light bg.
const CSS = `
.tos-a:hover{color:var(--spec-violet,#6C5CE0);text-decoration:underline;}
.tos-a:focus-visible,.tos-brand:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;border-radius:2px;}
`;

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: 'var(--spec-warm-white, #F8F7FB)', color: 'var(--spec-ink, #141320)', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  wrap: { maxWidth: '68ch', margin: '0 auto', padding: '40px 20px 90px', lineHeight: 1.7 },
  brand: { color: 'var(--spec-violet, #6C5CE0)', fontFamily: 'var(--font-space-grotesk), "Space Grotesk", system-ui, sans-serif', fontWeight: 700, letterSpacing: '.2em', textDecoration: 'none', fontSize: 13 },
  draft: { margin: '18px 0', background: '#FBF3E7', border: '1px solid #EFD9AE', color: '#8A5D14', borderRadius: 'var(--spec-radius-md, 12px)', padding: '12px 16px', fontSize: 13, lineHeight: 1.6 },
  h1: { fontFamily: 'var(--font-space-grotesk), "Space Grotesk", system-ui, sans-serif', fontSize: 'var(--spec-text-h1, 40px)', fontWeight: 700, letterSpacing: 'var(--spec-tracking-heading, -0.02em)', lineHeight: 1.15, margin: '10px 0 4px', color: 'var(--spec-ink, #141320)' },
  h2: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-space-grotesk), "Space Grotesk", system-ui, sans-serif', fontSize: 'var(--spec-text-h4, 19px)', fontWeight: 700, margin: '26px 0 8px', color: 'var(--spec-ink, #141320)' },
  h2icon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 8, background: 'rgba(124,58,237,0.08)', color: 'var(--spec-violet, #6C5CE0)', flexShrink: 0 },
  meta: { color: 'var(--spec-text-2nd, #615F72)', fontSize: 'var(--spec-text-caption, 12px)', marginBottom: 8 },
  p: { color: 'var(--spec-text-2nd, #615F72)', fontSize: 'var(--spec-text-body-sm, 14px)', margin: '0 0 10px' },
  a: { color: 'var(--spec-violet-deep, #4A3DB0)', textDecoration: 'none' },
  summary: { margin: '18px 0 10px', background: '#fff', border: '1px solid var(--spec-border, #EFEDF5)', borderRadius: 'var(--spec-radius-lg, 16px)', padding: '18px 20px', boxShadow: '0 4px 12px rgba(124,58,237,0.08)' },
  summaryTitle: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-space-grotesk), "Space Grotesk", system-ui, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--spec-ink, #141320)', margin: '0 0 12px' },
  summaryTitleIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 8, background: 'rgba(124,58,237,0.08)', color: 'var(--spec-violet-deep, #4A3DB0)', flexShrink: 0 },
  summaryList: { margin: '0 0 12px', padding: 0, listStyle: 'none', display: 'grid', gap: 12 },
  summaryItem: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  summaryItemDivider: { borderTop: '1px solid var(--spec-border, #EFEDF5)', paddingTop: 12 },
  summaryIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(124,58,237,0.08)', color: 'var(--spec-violet-deep, #4A3DB0)', flexShrink: 0 },
  summaryItemBody: { display: 'flex', flexDirection: 'column', gap: 4 },
  summaryLabel: { fontWeight: 700, fontSize: 13, lineHeight: 1.3, color: 'var(--spec-ink, #141320)' },
  summaryText: { color: 'var(--spec-ink, #141320)', fontSize: 14, lineHeight: 1.5 },
  summaryNote: { margin: '2px 0 0', color: 'var(--spec-text-2nd, #615F72)', fontSize: 12, lineHeight: 1.5 },
  plain: { color: 'var(--spec-violet-deep, #4A3DB0)', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 10px', background: 'rgba(124,58,237,0.05)', borderLeft: '3px solid var(--spec-violet, #6C5CE0)', borderRadius: '0 8px 8px 0', padding: '8px 12px' },
  plainLbl: { fontWeight: 700, color: 'var(--spec-violet-deep, #4A3DB0)' },
  feebar: { display: 'flex', alignItems: 'center', gap: 4, margin: '12px 0 4px', maxWidth: 180 },
  feebarSeg1: { flex: '1.6 0 auto', height: 8, borderRadius: 4, background: 'var(--spec-violet, #6C5CE0)' },
  feebarSeg2: { flex: '0.9 0 auto', height: 8, borderRadius: 4, background: 'var(--spec-lilac, #A99DF2)' },
  feebarCap: { width: 4, height: 16, borderRadius: 2, background: 'var(--spec-violet-deep, #4A3DB0)', flexShrink: 0 },
};
