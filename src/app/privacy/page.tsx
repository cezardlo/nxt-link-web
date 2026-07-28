// Privacy Policy — plain-language DRAFT pending attorney review.
import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — NXT//LINK' };

export default function PrivacyPage() {
  return (
    <div style={S.page} className="pp-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={S.wrap}>
        <Link href="/" style={S.brand} className="pp-brand">NXT//LINK</Link>
        <div style={S.draft}>DRAFT — pending attorney review. This plain-language policy describes how the platform handles data today.</div>
        <h1 style={S.h1}>Privacy Policy</h1>
        <p style={S.meta}>Last updated: July 9, 2026</p>

        {SECTIONS.map((s) => (
          <section key={s.t}>
            <h2 style={S.h2}>{s.t}</h2>
            {s.p.map((p, i) => <p key={i} style={S.p}>{p}</p>)}
          </section>
        ))}

        <p style={S.p}>Questions or requests? Email <a style={S.a} className="pp-a" href="mailto:hello@nxtlinktech.com">hello@nxtlinktech.com</a>. See also our <Link style={S.a} className="pp-a" href="/terms">Terms of Service</Link>.</p>
      </div>
    </div>
  );
}

const SECTIONS = [
  { t: '1. What we collect', p: [
    'Account details (email, role, password handled by our authentication provider); profile details you add (company, name, position, industry, city, phone, logos and photos); marketplace activity (listings, quote requests, quotes, messages, demos/pilots, purchases, reviews, saved listings); and basic technical logs used for security and reliability.',
  ]},
  { t: '2. How we use it', p: [
    'To run the marketplace: matching requests to vendors, delivering quotes and messages, tracking deals and commissions, sending notifications and transactional emails, preventing fraud and platform bypass, and improving the product.',
    'We do not sell your personal information.',
  ]},
  { t: '3. When information is shared', p: [
    'With the other party to your deal: vendors see a buyer’s request details; the buyer’s contact details and profile card are shared with a vendor only after the buyer accepts that vendor’s quote. Buyers see vendor storefront information, quotes, and messages.',
    'With service providers that run the platform (hosting, database, email delivery) under their own safeguards. With authorities if legally required.',
  ]},
  { t: '4. Contact-detail protection', p: [
    'Before a quote is accepted, the platform automatically hides emails, phone numbers, and links exchanged in chat and deal documents. This protects both parties and the integrity of the marketplace.',
  ]},
  { t: '5. Retention and your choices', p: [
    'We keep deal records (quotes, messages, purchases, commissions) as business records of the transactions. You can update your profile at any time, change your email or password in Account settings, and request account deletion or a copy of your data by emailing us.',
  ]},
  { t: '6. Cookies', p: [
    'We use session cookies to keep you signed in and basic protective measures against bots. No third-party advertising cookies.',
  ]},
  { t: '7. Changes', p: [
    'We will update this page when practices change; material changes will be flagged on the site.',
  ]},
];

// Design System v1.0 light reskin (2026-07-28, design batch 1): swaps the old
// v4 dark theme (#0A0A0F) for the spec's warm-white + violet tokens, same as
// every other public page. Visual/CSS only — SECTIONS copy above is
// byte-identical, untouched. The `pp-` classes below only add a
// :hover/:focus-visible ring in the brand violet (inline style objects can't
// express pseudo-classes); the global `a:focus-visible` rule already gave
// every link a visible ring, this just brings the color on-brand for light bg.
const CSS = `
.pp-a:hover{color:var(--spec-violet,#6C5CE0);text-decoration:underline;}
.pp-a:focus-visible,.pp-brand:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;border-radius:2px;}
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
