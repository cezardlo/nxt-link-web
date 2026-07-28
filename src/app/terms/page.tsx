// Marketplace Terms — plain-language DRAFT pending attorney review.
import Link from 'next/link';

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

        {SECTIONS.map((s) => (
          <section key={s.t}>
            <h2 style={S.h2}>{s.t}</h2>
            {s.p.map((p, i) => <p key={i} style={S.p}>{p}</p>)}
          </section>
        ))}

        <p style={S.p}>Questions? Contact <a style={S.a} className="tos-a" href="mailto:hello@nxtlinktech.com">hello@nxtlinktech.com</a>. See also our <Link style={S.a} className="tos-a" href="/privacy">Privacy Policy</Link>.</p>
      </div>
    </div>
  );
}

const SECTIONS = [
  { t: '1. What NXT//LINK is', p: [
    'NXT//LINK is an industrial supply chain marketplace connecting buyers with vendors of technology, hardware, equipment, and services. NXT//LINK is a marketplace and coordinator — we are not the seller of record, manufacturer, or provider of the listed products and services. Contracts for purchases are between the buyer and the vendor.',
  ]},
  { t: '2. Accounts', p: [
    'You must provide accurate information and keep your login credentials secure. You are responsible for activity under your account. Operator accounts are granted by NXT//LINK only.',
  ]},
  { t: '3. How deals work (both parties)', p: [
    'Public discovery is open: anyone can browse vendors, listings, brochures, and case studies. Deal activity — quote requests, sales conversations, demos, pilots, purchases — is managed through NXT//LINK. Contact details are withheld until a buyer accepts a quote. Attempting to bypass the platform to avoid its rules or fees is a violation of these terms.',
  ]},
  { t: '4. Buyer terms', p: [
    'Quote requests you submit are shared with the relevant vendor as an NXT//LINK-originated opportunity. NXT//LINK may receive a commission from the vendor on deals that begin on the platform; this never increases the legitimate quoted price you receive — vendors are prohibited from adding the commission as a buyer surcharge.',
    'Reviews may only be left after a verified engagement (an accepted quote).',
  ]},
  { t: '5. Vendor terms', p: [
    'Before publishing listings or receiving leads, vendors must accept the NXT//LINK vendor terms, which include: a disclosed commission on NXT//LINK-originated deals (4% on the first $50,000 of the eligible subtotal, 2% above that, capped at $20,000 — subject to final review); a protected period (currently 90 days) during which commission remains owed even if the same opportunity closes off-platform; responding to platform leads inside the platform; not redirecting platform buyers off-platform; keeping listings accurate; and reporting closed deals. NXT//LINK may suspend vendors who violate these rules.',
  ]},
  { t: '6. Content and conduct', p: [
    'You may not post unlawful, misleading, or infringing content; misrepresent credentials or certifications; scrape the platform; or interfere with its operation. NXT//LINK may remove content and restrict accounts to protect the marketplace.',
  ]},
  { t: '7. Verification and disclaimers', p: [
    'Verification badges describe evidence NXT//LINK reviewed; they are not a guarantee of any product, service, or outcome. Vendors remain responsible for the lawful sale, safety, quality, warranties, and delivery of what they offer. The platform is provided "as is" to the maximum extent permitted by law.',
  ]},
  { t: '8. Fees and payment', p: [
    'Vendor commissions are invoiced by NXT//LINK with stated payment terms. Marketplace payment processing (buyer payments through the platform) is not yet offered; buyers pay vendors directly under their own commercial terms.',
  ]},
  { t: '9. Changes and termination', p: [
    'We may update these terms; continued use after an update is acceptance. You may close your account at any time; obligations already incurred (including commissions on originated deals within the protected period) survive termination.',
  ]},
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
  h2: { fontFamily: 'var(--font-space-grotesk), "Space Grotesk", system-ui, sans-serif', fontSize: 'var(--spec-text-h4, 19px)', fontWeight: 700, margin: '26px 0 8px', color: 'var(--spec-ink, #141320)' },
  meta: { color: 'var(--spec-text-2nd, #615F72)', fontSize: 'var(--spec-text-caption, 12px)', marginBottom: 8 },
  p: { color: 'var(--spec-text-2nd, #615F72)', fontSize: 'var(--spec-text-body-sm, 14px)', margin: '0 0 10px' },
  a: { color: 'var(--spec-violet-deep, #4A3DB0)', textDecoration: 'none' },
};
