// NXT//LINK web-app entrance: role selection (Customer / Vendor / Operator).
// Replaces the old redirect to public/landing.html (still reachable directly
// at /landing.html until the marketing site is retired).

import Link from 'next/link';

const CSS = `
.wl-root{min-height:100vh;background:#0B0B12;color:#EDECF5;font-family:'Outfit',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:88px 20px 48px;position:relative}
.wl-nav{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:16px 26px}
.wl-navbrand{font-size:16px;font-weight:800;letter-spacing:-.02em}
.wl-navbrand span{color:#7C5CFC}
.wl-navr{display:flex;gap:16px;align-items:center}
.wl-navr a{color:#9A97AF;font-size:13.5px;font-weight:600;text-decoration:none}
.wl-navr a:hover{color:#EDECF5}
.wl-navcta{background:#7C5CFC;color:#fff !important;padding:9px 16px;border-radius:10px}
.wl-navcta:hover{background:#6344DF}
.wl-brand{font-size:15px;letter-spacing:.35em;color:#7C5CFC;font-weight:700;margin-bottom:14px}
.wl-h1{font-size:clamp(26px,4.5vw,40px);font-weight:700;text-align:center;line-height:1.15;max-width:680px}
.wl-sub{margin-top:12px;color:#9A97AF;font-size:16px;text-align:center;max-width:560px;line-height:1.5}
.wl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-top:40px;width:100%;max-width:880px}
.wl-card{display:block;background:#14141F;border:1px solid #26263A;border-radius:14px;padding:26px 22px;text-decoration:none;color:inherit;transition:border-color .15s,transform .15s}
.wl-card:hover{border-color:#7C5CFC;transform:translateY(-2px)}
.wl-role{font-size:12px;letter-spacing:.18em;color:#7C5CFC;font-weight:600;text-transform:uppercase}
.wl-title{font-size:20px;font-weight:700;margin-top:8px}
.wl-desc{margin-top:8px;color:#9A97AF;font-size:14px;line-height:1.5}
.wl-cta{margin-top:16px;font-size:14px;font-weight:600;color:#B7A6FF}
.wl-foot{margin-top:44px;color:#63607A;font-size:13px;text-align:center;line-height:1.6}
.wl-foot a{color:#9A97AF}
`;

const ROLES = [
  {
    href: '/marketplace',
    role: 'Buyer',
    roleEs: 'Comprador',
    title: 'Browse the marketplace',
    desc: 'Search industrial products and services with standardized listings — pilots, implementation, warranties, and pricing up front. No login needed.',
    cta: 'Browse listings',
  },
  {
    href: '/login',
    role: 'Vendor',
    roleEs: 'Proveedor',
    title: 'I provide solutions',
    desc: 'Build your storefront, publish product and service listings (AI drafts them from your brochures), and receive qualified leads.',
    cta: 'Vendor sign in',
  },
  {
    href: '/login',
    role: 'Operator',
    roleEs: 'Operador',
    title: 'NXT Link team',
    desc: 'Oversee vendors and listings, review what is published, and manage leads and deals.',
    cta: 'Operator sign in',
  },
];

export default function Home() {
  return (
    <div className="wl-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="wl-nav">
        <span className="wl-navbrand">NXT<span>{'//'}</span>LINK</span>
        <div className="wl-navr">
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/login">Sign in</Link>
          <Link className="wl-navcta" href="/signup">Create account</Link>
        </div>
      </nav>
      <div className="wl-brand">NXT//LINK</div>
      <h1 className="wl-h1">We connect industrial problems with the right problem-solvers.</h1>
      <p className="wl-sub">
        Private, bilingual B2B sourcing for the El Paso–Juárez Borderplex. Confidential by default —
        identities are revealed only when you approve.
      </p>
      <div className="wl-grid">
        {ROLES.map((r) => (
          <Link key={r.href} href={r.href} className="wl-card">
            <div className="wl-role">{r.role} · {r.roleEs}</div>
            <div className="wl-title">{r.title}</div>
            <div className="wl-desc">{r.desc}</div>
            <div className="wl-cta">{r.cta} →</div>
          </Link>
        ))}
      </div>
      <div className="wl-foot">
        <a href="/signup">Create an account</a> · New vendor? <a href="/apply">Apply to join the network</a> ·
        Prefer we find it for you? <a href="/intake">Describe your need</a>
      </div>
    </div>
  );
}
