'use client';

// NXT//LINK homepage — Amazon Business–style landing:
// hero "Create a free account" → featured live listings → shop by department →
// buying tools → for-vendors band → FAQs → footer. Dark premium brand.
// Featured products & departments are REAL data from the marketplace API.

import { useEffect, useRef, useState, type FormEvent } from 'react';

interface Card {
  id: string; kind: 'product' | 'service'; name: string; category: string;
  overview: string | null; image_url: string | null; vendor_name: string;
  vendor_city: string | null; vendor_verified?: boolean;
  pricing: { range?: string } | null; pilot: { available?: boolean } | null;
}
interface Dept { fg: string; label_en: string; is_service: boolean }

const FAQS: Array<[string, string]> = [
  ['What is NXT//LINK?', 'NXT//LINK is the industrial marketplace for the El Paso–Juárez Borderplex. Warehouses, 3PLs, distribution centers, and manufacturers use it to find, compare, and request quotes for the equipment, products, technology, and services they need — and to manage the whole project in one place.'],
  ['Is it free to use?', 'Yes. Creating an account, browsing, comparing, and requesting quotes is free for buyers. Vendors join free too — NXT//LINK only earns a success fee after a deal closes, and your first deals are free.'],
  ['How do quotes work?', 'Describe what you need (or search for it), pick the vendors you want, and send one request. Vendors respond with structured quotes — price, lead time, warranty, support — that you compare side by side. All communication runs through NXT//LINK.'],
  ['What areas do you serve?', 'We focus on the Borderplex: El Paso, Horizon City, Juárez, southern New Mexico, and West Texas — including cross-border and customs-ready vendors.'],
  ['I’m a vendor — how do I join?', 'Create a vendor account, upload a brochure, and our AI drafts your listing for you. Once your profile is complete and verified, you start receiving qualified leads from local buyers.'],
];

export default function Home() {
  const [featured, setFeatured] = useState<Card[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  function goSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    window.location.href = q ? `/marketplace?q=${encodeURIComponent(q)}` : '/marketplace';
  }
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [eaOpen, setEaOpen] = useState(false);
  const [ea, setEa] = useState({ company_name: '', contact_name: '', email: '', phone: '', city: '', note: '' });
  const [eaDone, setEaDone] = useState(false);
  const [eaBusy, setEaBusy] = useState(false);
  const eaStarted = useRef(0);

  async function submitEarlyAccess() {
    if (!ea.email.trim()) return;
    setEaBusy(true);
    try {
      await fetch('/api/early-access', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ea, kind: 'vendor', started_at: eaStarted.current, website_url: '' }),
      });
      setEaDone(true);
    } catch { setEaDone(true); }
    setEaBusy(false);
  }

  useEffect(() => {
    (async () => {
      try {
        const [l, c] = await Promise.all([
          fetch('/api/marketplace/listings?kind=product'),
          fetch('/api/marketplace/categories'),
        ]);
        const lj = await l.json();
        setFeatured((lj.listings || []).slice(0, 8));
        const cj = await c.json();
        setDepts((cj.departments || []).map((d: Dept) => ({ fg: d.fg, label_en: d.label_en, is_service: d.is_service })));
      } catch { /* landing still works without live data */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="hp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Nav */}
      <nav className="hp-nav">
        <a className="hp-brand" href="/"><b>NXT<i>//</i>LINK</b></a>
        <div className="hp-navr">
          <a href="/marketplace">Marketplace</a>
          <a href="/login">Sign in</a>
          <a className="hp-navcta" href="/signup">Create free account</a>
        </div>
      </nav>

      {/* Hero */}
      <header className="hp-hero">
        <div className="hp-heroin">
          <span className="hp-eyebrow">Borderplex Industrial Marketplace</span>
          <h1>Source equipment &amp; services the smart way.</h1>
          <p>Find, compare, and request quotes from verified El Paso &amp; Juárez vendors — equipment, products, technology, and services, all in one place.</p>
          <form className="hp-search" onSubmit={goSearch} role="search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search forklifts, pallet racking, WMS software, maintenance…" aria-label="Search the marketplace" />
            <button type="submit">Search</button>
          </form>
          <div className="hp-herocta">
            <a className="hp-btn" href="/intake">Post a request &amp; get matched quotes</a>
            <a className="hp-btn ghost" href="/marketplace">Browse the marketplace</a>
          </div>
          <div className="hp-trust">
            <span>✓ Free for buyers</span><span>✓ Verified vendors</span><span>✓ Pilot before you buy</span><span>✓ Quotes in one place</span>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section className="hp-how">
        {[
          ['1', 'Post your need', 'Search the catalog or post one request describing what you need.'],
          ['2', 'Get matched quotes', 'Verified Borderplex vendors respond with price, lead time, and warranty.'],
          ['3', 'Compare & close', 'Compare side by side, pilot if you want, and close the deal through NXT//LINK.'],
        ].map(([n, t, d]) => (
          <div className="hp-step" key={n}>
            <span className="hp-stepn">{n}</span>
            <div><b>{t}</b><p>{d}</p></div>
          </div>
        ))}
      </section>

      {/* Featured live listings */}
      {loading && (
        <section className="hp-sec">
          <div className="hp-sechead"><h2>Featured on NXT//LINK</h2></div>
          <div className="hp-prods">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="hp-prod hp-prodskel" />)}</div>
        </section>
      )}
      {!loading && featured.length > 0 && (
        <section className="hp-sec">
          <div className="hp-sechead"><h2>Featured on NXT//LINK</h2><a href="/marketplace">See all →</a></div>
          <div className="hp-prods">
            {featured.map((c) => (
              <a key={c.id} className="hp-prod" href={`/marketplace/${c.kind}/${c.id}`}>
                <div className="hp-prodimg">{c.image_url ? <img src={c.image_url} alt={c.name} loading="lazy" /> : <div className="hp-noimg">NXT//LINK</div>}</div>
                <div className="hp-prodbody">
                  {c.pilot?.available && <span className="hp-badge">Pilot available</span>}
                  <div className="hp-prodname">{c.name}</div>
                  {c.pricing?.range && <div className="hp-price">{c.pricing.range}</div>}
                  <div className="hp-vend">{c.vendor_name}{c.vendor_city ? ` · ${c.vendor_city}` : ''}</div>
                </div>
              </a>
            ))}
          </div>
          <a className="hp-bigcta" href="/signup">Create a free account</a>
        </section>
      )}

      {/* Shop by department */}
      {depts.length > 0 && (
        <section className="hp-sec">
          <div className="hp-sechead"><h2>Shop by department</h2></div>
          <div className="hp-depts">
            {depts.map((d) => (
              <a key={d.fg} className={`hp-dept ${d.is_service ? 'svc' : ''}`} href={`/marketplace?department=${d.fg}`}>{d.label_en}</a>
            ))}
          </div>
        </section>
      )}

      {/* Buying tools */}
      <section className="hp-sec">
        <div className="hp-sechead"><h2>Everything the buying process needs</h2></div>
        <div className="hp-tools">
          {[
            ['Request quotes in one place', 'Send one request, reach the vendors you choose. No chasing emails.'],
            ['Compare vendors side by side', 'Price, lead time, installation, warranty, and support — lined up to decide fast.'],
            ['Pilot before you buy', 'Try equipment on your own dock, with real success criteria, before committing.'],
            ['Track every project', 'From quote to install to warranty — one workspace with the next step always clear.'],
            ['Protected & transparent', 'Deals run through NXT//LINK. Your introduction is protected and pricing is clear.'],
            ['Built for the Borderplex', 'Local El Paso & Juárez vendors, cross-border ready, English and Spanish.'],
          ].map(([t, d]) => (
            <div key={t} className="hp-tool"><div className="hp-tooldot" /><b>{t}</b><p>{d}</p></div>
          ))}
        </div>
      </section>

      {/* For vendors band — early access (concierge onboarding) */}
      <section className="hp-vendorband">
        <div className="hp-vbin">
          <div>
            <h2>Are you a supplier?</h2>
            <p>We’re onboarding the first Borderplex vendors now — personally. Apply for early access and we’ll set up your storefront with you, free. Your first two deals are commission-free.</p>
          </div>
          <button className="hp-btn" onClick={() => { setEaOpen(true); setEaDone(false); eaStarted.current = Date.now(); }}>Apply for early access</button>
        </div>
      </section>

      {/* Early-access modal */}
      {eaOpen && (
        <div className="hp-modal" onClick={() => setEaOpen(false)}>
          <div className="hp-modalin" onClick={(e) => e.stopPropagation()}>
            <button className="hp-modalx" onClick={() => setEaOpen(false)} aria-label="Close">×</button>
            {eaDone ? (
              <div className="hp-eadone">
                <div className="hp-eabig">✓</div>
                <h3>You’re on the list.</h3>
                <p>Thanks — a member of the NXT//LINK team will reach out personally to set up your storefront. Keep an eye on your inbox.</p>
                <button className="hp-btn" onClick={() => setEaOpen(false)}>Done</button>
              </div>
            ) : (
              <>
                <h3>Apply for early access</h3>
                <p className="hp-easub">Tell us about your company. We onboard vendors one-on-one — no long forms, no cost to join.</p>
                <input type="text" name="website_url" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true" />
                <div className="hp-earow">
                  <input placeholder="Company name" value={ea.company_name} onChange={(e) => setEa({ ...ea, company_name: e.target.value })} />
                  <input placeholder="Your name" value={ea.contact_name} onChange={(e) => setEa({ ...ea, contact_name: e.target.value })} />
                </div>
                <div className="hp-earow">
                  <input placeholder="Work email" value={ea.email} onChange={(e) => setEa({ ...ea, email: e.target.value })} />
                  <input placeholder="Phone (optional)" value={ea.phone} onChange={(e) => setEa({ ...ea, phone: e.target.value })} />
                </div>
                <input placeholder="City (El Paso, Juárez…)" value={ea.city} onChange={(e) => setEa({ ...ea, city: e.target.value })} />
                <textarea rows={2} placeholder="What do you sell or service? (optional)" value={ea.note} onChange={(e) => setEa({ ...ea, note: e.target.value })} />
                <button className="hp-btn" disabled={eaBusy || !ea.email.trim()} onClick={submitEarlyAccess} style={{ width: '100%', marginTop: 8 }}>{eaBusy ? 'Sending…' : 'Request early access'}</button>
                <p className="hp-eanote">Free to join · first two deals commission-free · then 5% when you get paid.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* FAQs */}
      <section className="hp-sec">
        <div className="hp-sechead"><h2>Frequently asked questions</h2></div>
        <div className="hp-faqs">
          {FAQS.map(([q, a], i) => (
            <div key={i} className={`hp-faq ${openFaq === i ? 'open' : ''}`}>
              <button className="hp-faqq" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{q}</span><span className="hp-faqi">{openFaq === i ? '–' : '+'}</span>
              </button>
              {openFaq === i && <div className="hp-faqa">{a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="hp-foot">
        <div className="hp-footcols">
          <div>
            <b>NXT<i style={{ color: '#A78BFA', fontStyle: 'normal' }}>//</i>LINK</b>
            <p className="hp-foottag">The industrial supply chain marketplace for the El Paso–Juárez Borderplex.</p>
          </div>
          <div>
            <h4>For buyers</h4>
            <a href="/marketplace">Browse marketplace</a>
            <a href="/signup">Create account</a>
            <a href="/projects">My projects</a>
            <a href="/login">Sign in</a>
          </div>
          <div>
            <h4>For vendors</h4>
            <a href="/signup">List your company</a>
            <a href="/vendor-login">Vendor sign in</a>
            <a href="/vendor/leads">Seller Central</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </div>
        </div>
        <div className="hp-footbottom">© 2026 NXT//LINK · El Paso, Texas · Serving the Borderplex</div>
      </footer>
    </div>
  );
}

const CSS = `
.hp{background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.hp *{box-sizing:border-box;}
.hp a{text-decoration:none;}
.hp-nav{display:flex;justify-content:space-between;align-items:center;padding:15px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);z-index:40;}
.hp-brand b{font-size:18px;font-weight:800;letter-spacing:-.02em;color:#F0F0F5;}.hp-brand i{color:#A78BFA;font-style:normal;}
.hp-navr{display:flex;gap:18px;align-items:center;}
.hp-navr a{color:#9A97AF;font-size:13.5px;font-weight:600;}
.hp-navr a:hover{color:#F0F0F5;}
.hp-navcta{background:#7C5CFC;color:#fff !important;padding:9px 16px;border-radius:10px;}
.hp-navcta:hover{background:#6344DF;}
@media(max-width:560px){.hp-navr a:not(.hp-navcta){display:none;}}
.hp-hero{position:relative;overflow:hidden;border-bottom:1px solid rgba(255,255,255,.06);
  background:radial-gradient(900px 500px at 78% -10%,rgba(124,92,252,.18),transparent 60%),radial-gradient(600px 400px at 5% 110%,rgba(52,211,153,.08),transparent 55%);}
.hp-heroin{max-width:920px;margin:0 auto;padding:80px 22px 72px;text-align:center;}
.hp-eyebrow{font-size:12.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#C4B5FD;}
.hp-hero h1{font-size:clamp(30px,6vw,54px);font-weight:800;letter-spacing:-.03em;line-height:1.04;margin:16px auto 0;max-width:14ch;text-wrap:balance;}
.hp-hero p{color:#9A97AF;font-size:clamp(15px,2vw,18px);line-height:1.6;margin:18px auto 0;max-width:56ch;}
.hp-search{display:flex;align-items:center;gap:10px;max-width:640px;margin:30px auto 0;background:#14141F;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:6px 6px 6px 16px;color:#8080A0;box-shadow:0 18px 44px -20px rgba(0,0,0,.7);}
.hp-search:focus-within{border-color:#7C5CFC;box-shadow:0 0 0 3px rgba(124,92,252,.2);}
.hp-search svg{flex-shrink:0;}
.hp-search input{flex:1;background:none;border:none;outline:none;color:#F0F0F5;font-family:inherit;font-size:15.5px;padding:12px 0;}
.hp-search input::placeholder{color:#6A6A85;}
.hp-search button{flex-shrink:0;background:#7C5CFC;color:#fff;font-family:inherit;font-weight:700;font-size:14.5px;border:none;border-radius:10px;padding:12px 22px;cursor:pointer;}
.hp-search button:hover{background:#6344DF;}
.hp-herocta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px;}
.hp-how{max-width:1000px;margin:0 auto;padding:46px 22px 8px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
@media(max-width:720px){.hp-how{grid-template-columns:1fr;}}
.hp-step{display:flex;gap:14px;align-items:flex-start;background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:20px;}
.hp-stepn{flex-shrink:0;width:30px;height:30px;border-radius:50%;background:rgba(124,92,252,.16);color:#C4B5FD;font-weight:800;display:grid;place-items:center;font-size:14px;}
.hp-step b{font-size:15.5px;font-weight:800;display:block;}
.hp-step p{color:#8080A0;font-size:13px;line-height:1.55;margin:5px 0 0;}
.hp-btn{background:#7C5CFC;color:#fff;font-weight:700;font-size:15px;padding:14px 26px;border-radius:12px;box-shadow:0 14px 34px -14px rgba(124,92,252,.7);}
.hp-btn:hover{background:#6344DF;}
.hp-btn.ghost{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);box-shadow:none;color:#E8E7F0;}
.hp-trust{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;margin-top:26px;color:#8080A0;font-size:13px;font-weight:600;}
.hp-sec{max-width:1160px;margin:0 auto;padding:52px 22px 0;}
.hp-sechead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:20px;}
.hp-sechead h2{font-size:clamp(19px,2.6vw,26px);font-weight:800;letter-spacing:-.02em;}
.hp-sechead a{color:#A78BFA;font-size:13.5px;font-weight:600;}
.hp-prods{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;}
.hp-prod{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .15s,transform .15s;color:#F0F0F5;}
.hp-prodskel{height:236px;background:linear-gradient(100deg,#14141F 30%,#1c1c2b 50%,#14141F 70%);background-size:200% 100%;animation:hpshimmer 1.3s ease-in-out infinite;}
@keyframes hpshimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
@media (prefers-reduced-motion:reduce){.hp-prodskel{animation:none;}}
.hp-prod:hover{border-color:rgba(124,92,252,.5);transform:translateY(-3px);}
.hp-prodimg{height:150px;background:#0E0E16;}
.hp-prodimg img{width:100%;height:100%;object-fit:cover;}
.hp-noimg{height:100%;display:grid;place-items:center;color:#42425A;font-size:12px;letter-spacing:.2em;font-weight:700;}
.hp-prodbody{padding:13px 14px 15px;display:flex;flex-direction:column;gap:6px;flex:1;}
.hp-badge{align-self:flex-start;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#34D399;background:rgba(52,211,153,.12);padding:3px 8px;border-radius:99px;}
.hp-prodname{font-size:14px;font-weight:700;line-height:1.3;}
.hp-price{font-size:15px;font-weight:800;color:#C4B5FD;font-variant-numeric:tabular-nums;}
.hp-vend{font-size:11.5px;color:#8080A0;margin-top:auto;}
.hp-bigcta{display:block;width:max-content;margin:26px auto 0;background:#7C5CFC;color:#fff;font-weight:700;font-size:14.5px;padding:13px 30px;border-radius:12px;}
.hp-bigcta:hover{background:#6344DF;}
.hp-depts{display:flex;flex-wrap:wrap;gap:10px;}
.hp-dept{background:#14141F;border:1px solid rgba(255,255,255,.1);border-radius:11px;padding:14px 16px;font-size:13.5px;font-weight:600;color:#D5D4E0;transition:border-color .15s,background .15s;}
.hp-dept:hover{border-color:rgba(124,92,252,.5);background:rgba(124,92,252,.08);color:#C4B5FD;}
.hp-dept.svc:hover{border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.08);color:#34D399;}
.hp-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;}
.hp-tool{background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;}
.hp-tooldot{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#7C5CFC,#34D399);margin-bottom:13px;}
.hp-tool b{font-size:15.5px;font-weight:800;}
.hp-tool p{color:#9A97AF;font-size:13.5px;line-height:1.6;margin:7px 0 0;}
.hp-vendorband{max-width:1160px;margin:56px auto 0;padding:0 22px;}
.hp-vbin{background:linear-gradient(120deg,rgba(124,92,252,.16),rgba(52,211,153,.08));border:1px solid rgba(124,92,252,.3);border-radius:18px;padding:30px 32px;display:flex;justify-content:space-between;align-items:center;gap:22px;flex-wrap:wrap;}
.hp-vbin h2{font-size:22px;font-weight:800;letter-spacing:-.02em;}
.hp-vbin p{color:#B8B6CC;font-size:14.5px;line-height:1.55;margin:8px 0 0;max-width:52ch;}
.hp-faqs{display:flex;flex-direction:column;gap:10px;max-width:820px;}
.hp-faq{background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;}
.hp-faq.open{border-color:rgba(124,92,252,.35);}
.hp-faqq{width:100%;display:flex;justify-content:space-between;align-items:center;gap:14px;font-family:inherit;font-size:15px;font-weight:700;color:#F0F0F5;background:none;border:none;padding:17px 18px;cursor:pointer;text-align:left;}
.hp-faqi{color:#A78BFA;font-size:20px;font-weight:400;flex-shrink:0;}
.hp-faqa{padding:0 18px 17px;color:#B8B6CC;font-size:14px;line-height:1.65;}
.hp-foot{margin-top:64px;border-top:1px solid rgba(255,255,255,.08);background:#0C0C13;}
.hp-footcols{max-width:1160px;margin:0 auto;padding:44px 22px 30px;display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:28px;}
@media(max-width:720px){.hp-footcols{grid-template-columns:1fr 1fr;}}
.hp-footcols>div>b{font-size:17px;font-weight:800;}
.hp-foottag{color:#8080A0;font-size:13px;line-height:1.6;margin:10px 0 0;max-width:34ch;}
.hp-footcols h4{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8080A0;margin:0 0 12px;}
.hp-footcols a{display:block;color:#B8B6CC;font-size:13.5px;margin-bottom:9px;}
.hp-footcols a:hover{color:#C4B5FD;}
.hp-footbottom{border-top:1px solid rgba(255,255,255,.06);padding:18px 22px;text-align:center;color:#5A5A70;font-size:12.5px;}
.hp-modal{position:fixed;inset:0;background:rgba(0,0,0,.62);display:grid;place-items:center;z-index:60;padding:20px;}
.hp-modalin{position:relative;background:#12121B;border:1px solid rgba(255,255,255,.12);border-radius:18px;max-width:460px;width:100%;padding:26px;}
.hp-modalx{position:absolute;top:14px;right:16px;background:none;border:none;color:#8080A0;font-size:24px;line-height:1;cursor:pointer;}
.hp-modalin h3{font-size:20px;font-weight:800;letter-spacing:-.02em;margin:0;}
.hp-easub{color:#9A97AF;font-size:13.5px;line-height:1.5;margin:8px 0 16px;}
.hp-earow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
@media(max-width:440px){.hp-earow{grid-template-columns:1fr;}}
.hp-modalin input,.hp-modalin textarea{width:100%;font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0A0A0F;color:#F0F0F5;outline:none;margin-bottom:10px;resize:vertical;}
.hp-modalin input:focus,.hp-modalin textarea:focus{border-color:#7C5CFC;}
.hp-eanote{font-size:11.5px;color:#63607A;text-align:center;margin:12px 0 0;line-height:1.5;}
.hp-eadone{text-align:center;padding:8px 0;}
.hp-eabig{width:52px;height:52px;border-radius:50%;background:rgba(52,211,153,.16);color:#34D399;display:grid;place-items:center;font-size:26px;margin:0 auto 14px;}
.hp-eadone h3{font-size:20px;}
.hp-eadone p{color:#9A97AF;font-size:14px;line-height:1.6;margin:10px 0 18px;}
`;
