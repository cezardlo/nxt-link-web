'use client';

// Vendor onboarding wizard — one guided path from empty account to first
// published listing. Each step checks REAL state and links to where to do it.

import { useEffect, useState } from 'react';

interface Step { key: string; title: string; desc: string; href: string; cta: string; done: boolean }

export default function VendorStartPage() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    document.title = 'Get set up — NXT//LINK';
    (async () => {
      const prof = await fetch('/api/vendor/profile').then((r) => (r.status === 401 ? null : r.json())).catch(() => null);
      if (!prof) { setSignedIn(false); setChecking(false); return; }
      setSignedIn(true);
      const [ag, listings] = await Promise.all([
        fetch('/api/vendor/agreement').then((r) => r.json()).catch(() => null),
        fetch('/api/vendor/listings').then((r) => r.json()).catch(() => null),
      ]);
      const v = prof.vendor || {};
      const all = [...(listings?.products || []), ...(listings?.services || [])];
      const published = all.some((l: { status: string }) => l.status === 'published');

      setSteps([
        { key: 'company', title: 'Name your company', desc: 'Company name, city, and a one-line tagline buyers see first.', href: '/vendor/portal', cta: 'Edit profile', done: Boolean(v.company_name && v.company_name !== 'New company' && v.tagline) },
        { key: 'logo', title: 'Add your logo', desc: 'Your logo appears on your storefront and every listing.', href: '/vendor/portal', cta: 'Upload logo', done: Boolean(prof.logo_url) },
        { key: 'fit', title: 'Say what you do', desc: 'Pick your industries, service areas, and what you sell — this powers search.', href: '/vendor/portal', cta: 'Set industries', done: (v.industries || []).length > 0 && (v.categories || []).length > 0 },
        { key: 'proof', title: 'Add proof', desc: 'Certifications, case studies, or photos — proof wins quotes.', href: '/vendor/portal', cta: 'Add proof', done: false },
        { key: 'terms', title: 'Accept the NXT//LINK terms', desc: 'Commission, protected period, no going around the platform. Required to publish.', href: '/vendor/portal', cta: 'Review terms', done: Boolean(ag?.accepted) },
        { key: 'listing', title: 'Create your first listing', desc: 'A product or a service — AI can draft it from your brochure.', href: '/vendor/listings', cta: 'New listing', done: all.length > 0 },
        { key: 'publish', title: 'Publish it', desc: 'Review, confirm accuracy, publish. Buyers can now find you.', href: '/vendor/listings', cta: 'Review & publish', done: published },
      ]);
      // "proof" done-check: any certs, case studies, or gallery photos
      const [ce, ga] = await Promise.all([
        fetch('/api/vendor/certifications').then((r) => r.json()).catch(() => null),
        fetch('/api/vendor/gallery').then((r) => r.json()).catch(() => null),
      ]);
      const hasProof = (ce?.certifications?.length || 0) > 0 || (ga?.photos?.length || 0) > 0 || (prof.case_studies?.length || 0) > 0;
      setSteps((s) => s.map((st) => (st.key === 'proof' ? { ...st, done: hasProof } : st)));
      setChecking(false);
    })();
  }, []);

  const doneCount = steps.filter((s) => s.done).length;
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const next = steps.find((s) => !s.done);

  return (
    <div className="vw">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="vw-nav">
        <a className="vw-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>Get set up</span></a>
        <a className="vw-link" href="/vendor/listings">Skip to listings</a>
      </nav>
      <main className="vw-wrap">
        {checking ? <div className="vw-empty">Loading…</div>
          : !signedIn ? <div className="vw-empty">Sign in first — <a href="/login">go to sign in</a></div>
          : (
            <>
              <h1>Set up your storefront</h1>
              <p className="vw-sub">Seven steps from empty account to your first buyers. {next ? <>Next up: <b>{next.title}</b>.</> : 'All done — you are live!'}</p>

              <div className="vw-meter">
                <div className="vw-meterbar"><div style={{ width: `${pct}%` }} /></div>
                <span>{doneCount}/{steps.length} complete</span>
              </div>

              <ol className="vw-steps">
                {steps.map((s, i) => (
                  <li key={s.key} className={s.done ? 'done' : (next?.key === s.key ? 'next' : '')}>
                    <span className="vw-num">{s.done ? '✓' : i + 1}</span>
                    <div className="vw-body">
                      <b>{s.title}</b>
                      <p>{s.desc}</p>
                    </div>
                    {!s.done && <a className="vw-cta" href={s.href}>{s.cta} →</a>}
                  </li>
                ))}
              </ol>

              {!next && (
                <div className="vw-done">
                  Storefront live. Watch your <a href="/vendor/leads">leads inbox</a> — quote requests and open buyer needs land there, and every deal runs through NXT{'//'}LINK.
                </div>
              )}
            </>
          )}
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.vw{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.vw *{box-sizing:border-box;}
.vw-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);z-index:20;}
.vw-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.vw-brand b{font-size:17px;}.vw-brand i{color:#A78BFA;font-style:normal;}
.vw-brand span{color:#8080A0;font-size:13px;}
.vw-link{color:#A78BFA;font-size:13.5px;font-weight:600;text-decoration:none;}
.vw-wrap{max-width:640px;margin:0 auto;padding:36px 20px 100px;}
.vw-wrap h1{font-size:27px;font-weight:800;letter-spacing:-.02em;}
.vw-sub{color:#8080A0;font-size:14.5px;margin:8px 0 20px;line-height:1.6;}
.vw-sub b{color:#C4B5FD;}
.vw-empty{text-align:center;color:#8080A0;padding:70px 0;}
.vw-empty a{color:#A78BFA;}
.vw-meter{display:flex;align-items:center;gap:12px;margin-bottom:24px;}
.vw-meterbar{flex:1;height:9px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;}
.vw-meterbar div{height:100%;background:linear-gradient(90deg,#7C5CFC,#34D399);border-radius:99px;transition:width .4s;}
.vw-meter span{font-size:12.5px;font-weight:700;color:#C0C0D0;white-space:nowrap;}
.vw-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px;}
.vw-steps li{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:15px 17px;}
.vw-steps li.done{opacity:.65;}
.vw-steps li.next{border-color:#7C5CFC;background:rgba(124,92,252,.07);}
.vw-num{width:32px;height:32px;flex-shrink:0;border-radius:99px;background:rgba(255,255,255,.07);display:grid;place-items:center;font-weight:800;font-size:14px;color:#C0C0D0;}
li.done .vw-num{background:rgba(52,211,153,.15);color:#34D399;}
li.next .vw-num{background:rgba(124,92,252,.2);color:#C4B5FD;}
.vw-body{flex:1;min-width:0;}
.vw-body b{font-size:14.5px;}
.vw-body p{margin:4px 0 0;font-size:12.5px;color:#8080A0;line-height:1.5;}
.vw-cta{white-space:nowrap;font-size:12.5px;font-weight:700;color:#C4B5FD;text-decoration:none;background:rgba(124,92,252,.12);border:1px solid rgba(124,92,252,.35);border-radius:9px;padding:8px 13px;}
.vw-cta:hover{background:rgba(124,92,252,.22);}
.vw-done{margin-top:22px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.3);color:#6EE7B7;border-radius:14px;padding:16px 18px;font-size:14px;line-height:1.6;}
.vw-done a{color:#34D399;font-weight:700;}
`;
