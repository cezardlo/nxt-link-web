// Privacy Policy — plain-language DRAFT pending attorney review.
import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — NXT//LINK' };

export default function PrivacyPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Link href="/" style={S.brand}>NXT//LINK</Link>
        <div style={S.draft}>DRAFT — pending attorney review. This plain-language policy describes how the platform handles data today.</div>
        <h1 style={S.h1}>Privacy Policy</h1>
        <p style={S.meta}>Last updated: July 9, 2026</p>

        {SECTIONS.map((s) => (
          <section key={s.t}>
            <h2 style={S.h2}>{s.t}</h2>
            {s.p.map((p, i) => <p key={i} style={S.p}>{p}</p>)}
          </section>
        ))}

        <p style={S.p}>Questions or requests? Email <a style={S.a} href="mailto:hello@nxtlinktech.com">hello@nxtlinktech.com</a>. See also our <Link style={S.a} href="/terms">Terms of Service</Link>.</p>
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

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0A0A0F', color: '#E5E4F0', fontFamily: 'system-ui, sans-serif' },
  wrap: { maxWidth: 720, margin: '0 auto', padding: '40px 20px 90px', lineHeight: 1.7 },
  brand: { color: '#A78BFA', fontWeight: 800, letterSpacing: '.2em', textDecoration: 'none', fontSize: 13 },
  draft: { margin: '18px 0', background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.35)', color: '#FBBF24', borderRadius: 12, padding: '12px 16px', fontSize: 13, lineHeight: 1.6 },
  h1: { fontSize: 30, fontWeight: 800, margin: '10px 0 4px' },
  h2: { fontSize: 17, fontWeight: 700, margin: '26px 0 8px', color: '#F0F0F5' },
  meta: { color: '#8080A0', fontSize: 13, marginBottom: 8 },
  p: { color: '#B8B6CC', fontSize: 14.5, margin: '0 0 10px' },
  a: { color: '#A78BFA' },
};
