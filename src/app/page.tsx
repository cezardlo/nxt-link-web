// NXT//LINK web-app entrance: role selection (Customer / Vendor / Operator).
// Replaces the old redirect to public/landing.html (still reachable directly
// at /landing.html until the marketing site is retired).

import Link from 'next/link';

const CSS = `
.wl-root{min-height:100vh;background:#0B0B12;color:#EDECF5;font-family:'Outfit',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 20px}
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
    href: '/intake',
    role: 'Customer',
    roleEs: 'Cliente',
    title: 'I need a solution',
    desc: 'Describe your problem in English or Spanish. We find verified vendors, protect your identity, and manage the process.',
    cta: 'Start my search',
  },
  {
    href: '/vendor-login',
    role: 'Vendor',
    roleEs: 'Proveedor',
    title: 'I provide solutions',
    desc: 'Get matched to real, qualified opportunities. Your pricing and quotes stay private — competitors never see them.',
    cta: 'Vendor sign in',
  },
  {
    href: '/sign-in',
    role: 'Operator',
    roleEs: 'Operador',
    title: 'NXT Link team',
    desc: 'Review intakes, build anonymized RFQ packets, select vendors, compare quotes, and advance deals.',
    cta: 'Operator sign in',
  },
];

export default function Home() {
  return (
    <div className="wl-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
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
        New vendor? <a href="/apply">Apply to join the network</a>
      </div>
    </div>
  );
}
