'use client';

// Public vendor storefront — LinkedIn-style profile, one clean format for every
// vendor: header + trust badges + stats, about, expertise, products & services,
// case studies, verified reviews, and a sidebar (quick facts, brands supported,
// coverage, certifications, team). Every section degrades gracefully when the
// vendor hasn't filled it in. Deal actions run through NXT//LINK listing pages.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { levelAtLeast } from '@/components/marketplace/TrustBadges';

interface ListingCard {
  id: string; kind: 'product' | 'service'; name: string; category: string;
  overview: string | null; best_for?: string[]; image_url: string | null;
  pilot?: { available?: boolean } | null; pricing?: { model?: string; range?: string } | null;
  warranty_support?: { warranty?: string } | null; response_time?: string | null; emergency_available?: boolean;
  lead_time?: string | null; implementation?: { typical_timeline?: string } | null;
}

const MODEL_LABEL: Record<string, string> = {
  one_time: 'One-time', subscription: 'Subscription', monthly: 'Monthly', hourly: 'Hourly',
  per_project: 'Per project', quote: 'By quote', usage: 'Usage-based', lease: 'Lease', rental: 'Rental',
};
// Price shown in the compare table — prefer an explicit range, else the model.
const priceText = (l: ListingCard) => l.pricing?.range?.trim()
  || (l.pricing?.model ? (MODEL_LABEL[l.pricing.model] || l.pricing.model) : '') || 'By quote';
// Numeric key for sorting by price — first dollar figure in the range, else last.
const priceValue = (l: ListingCard) => {
  const m = (l.pricing?.range || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
};
// Timeline shown in the compare table — product lead time, else implementation
// timeline, else a service's response time.
const timelineText = (l: ListingCard) => l.lead_time?.trim()
  || l.implementation?.typical_timeline?.trim()
  || (l.kind === 'service' && l.response_time ? `Responds in ${l.response_time}` : '') || '—';
// Numeric days from a timeline string ("2–4 weeks", "10 days", "4h"), for the
// length-proportional compare bar. Returns null when nothing parses.
const daysOf = (l: ListingCard): number | null => {
  const s = timelineText(l);
  const m = s.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|days?|d|weeks?|wks?|w|months?|mos?|mo|m)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]); const u = m[2].toLowerCase();
  if (u.startsWith('h')) return n / 24;
  if (u.startsWith('d')) return n;
  if (u.startsWith('w')) return n * 7;
  return n * 30;
};
interface Vendor {
  id: string; company_name: string; city: string | null; website: string | null;
  description: string | null; verified: boolean; verification_level?: string | null;
  logo_url: string | null; banner_url: string | null;
  tagline: string | null;
  categories: string[]; industries: string[]; service_areas: string[]; client_types: string[]; achievements: string[];
  company_type: string | null; year_founded: number | null; employee_count: string | null; languages: string[];
  response_time: string | null; emergency_available: boolean; cross_border: boolean;
  installation_available: boolean; pilot_available: boolean;
  main_expertise: string[]; problems_solved: string[]; capabilities: string[]; brands_supported: string[];
  rating: number | null; review_count: number; deals_closed: number;
}
interface Storefront {
  vendor: Vendor;
  listings: ListingCard[];
  case_studies: Array<{ id: string; title: string; challenge: string | null; solution: string | null; result: string | null }>;
  reviews: Array<{ rating: number; title: string | null; body: string | null }>;
  certifications: Array<{ id: string; name: string; issuer: string | null; expires_on: string | null }>;
  team: Array<{ id: string; name: string; position: string | null; expertise: string | null; languages: string[] | null; service_region: string | null }>;
}

const stars = (n: number) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
const initials = (s: string) => s.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const TYPE_LABEL: Record<string, string> = { manufacturer: 'Manufacturer', distributor: 'Distributor', integrator: 'Systems Integrator', consultant: 'Consultant', service_provider: 'Service Provider', software: 'Software Company' };

export default function VendorStorefrontPage() {
  const params = useParams<{ id: string }>();
  const [d, setD] = useState<Storefront | null>(null);
  const [missing, setMissing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [sort, setSort] = useState<'name' | 'price_asc' | 'price_desc'>('name');

  useEffect(() => {
    fetch(`/api/marketplace/vendor/${params.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) { setD(data); document.title = `${data.vendor.company_name} — NXT//LINK`; } else setMissing(true); })
      .catch(() => setMissing(true));
    fetch('/api/vendor/profile').then((r) => (r.ok ? r.json() : null))
      .then((me) => { if (me?.ok && me.vendor?.id === params.id) setIsOwner(true); }).catch(() => {});
  }, [params.id]);

  if (missing) return <div className="vs"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="vs-empty">Vendor not found. <Link href="/marketplace">Back to marketplace</Link></div></div>;
  if (!d) return <div className="vs"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="vs-empty">Loading…</div></div>;

  const v = d.vendor;
  const products = d.listings.filter((l) => l.kind === 'product');
  const services = d.listings.filter((l) => l.kind === 'service');
  const firstListing = d.listings[0];

  // Build the badge + stat + nav sets from real data only.
  const badges: Array<[string, string]> = [];
  if (levelAtLeast(v.verification_level, 'identity_verified')) badges.push(['v', '✓ Verified identity']);
  else if (v.verified) badges.push(['v', '✓ Verified business']);
  if (levelAtLeast(v.verification_level, 'insurance_reviewed')) badges.push(['g', '✓ Insurance reviewed']);
  if (levelAtLeast(v.verification_level, 'certifications_reviewed')) badges.push(['p', '✓ Certified']);
  if (v.pilot_available) badges.push(['p', 'Pilot available']);
  if (v.cross_border) badges.push(['a', 'Cross-border ready']);
  if (v.emergency_available) badges.push(['g', '24/7 emergency']);
  if (v.installation_available) badges.push(['g', 'Installation available']);

  const stats: Array<[string, string]> = [];
  if (v.response_time) stats.push([v.response_time, 'Avg. response']);
  if (v.deals_closed > 0) stats.push([String(v.deals_closed), 'Deals on NXT//LINK']);
  if (v.rating != null) stats.push([`${v.rating}★`, `${v.review_count} reviews`]);
  if (v.year_founded) stats.push([String(v.year_founded), v.employee_count ? `Founded · ${v.employee_count} staff` : 'Founded']);

  // Unified compare table across every offering (products, tech, services),
  // sortable by price so buyers can scan value and timeline at a glance.
  const compareRows = [...d.listings].sort((a, b) => {
    if (sort === 'price_asc') return priceValue(a) - priceValue(b);
    if (sort === 'price_desc') return priceValue(b) - priceValue(a);
    return a.name.localeCompare(b.name);
  });
  // Scaling for the length-proportional compare bars (finite values only).
  const priceVals = compareRows.map(priceValue).filter((n) => Number.isFinite(n));
  const cmpMaxPrice = priceVals.length ? Math.max(...priceVals) : 0;
  const cmpMinPrice = priceVals.length ? Math.min(...priceVals) : 0;
  const dayVals = compareRows.map(daysOf).filter((n): n is number => n != null);
  const cmpMaxDays = dayVals.length ? Math.max(...dayVals) : 0;
  const cmpMinDays = dayVals.length ? Math.min(...dayVals) : 0;

  const nav: Array<[string, string]> = [['about', 'Overview']];
  if (v.main_expertise.length || v.problems_solved.length || v.capabilities.length) nav.push(['expertise', 'Expertise']);
  if (d.listings.length >= 2) nav.push(['compare', 'Compare']);
  if (products.length) nav.push(['products', 'Products']);
  if (services.length) nav.push(['services', 'Services']);
  if (d.case_studies.length) nav.push(['cases', 'Case studies']);
  if (d.reviews.length) nav.push(['reviews', 'Reviews']);

  const ListingCards = ({ items }: { items: ListingCard[] }) => (
    <div className="vs-plist">
      {items.map((l) => (
        <Link key={l.id} className="vs-pcard" href={`/marketplace/${l.kind}/${l.id}`}>
          <div className="vs-pimg">{l.image_url ? <img src={l.image_url} alt={l.name} loading="lazy" /> : <div className="vs-noimg">NXT//LINK</div>}</div>
          <div className="vs-pb">
            {l.pilot?.available && <span className="vs-ptag">Pilot available</span>}
            <div className="vs-pn">{l.name}</div>
            {l.pricing?.range && <div className="vs-pp">{l.pricing.range}</div>}
            <div className="vs-pm">{l.category}</div>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="vs">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="vs-topbar">
        <Link className="vs-brand" href="/"><b>NXT<i>//</i>LINK</b></Link>
        <div className="vs-topr">
          <Link className="vs-pill" href="/marketplace">Marketplace</Link>
          {isOwner && <Link className="vs-pill on" href="/vendor/portal">Edit my profile</Link>}
        </div>
      </nav>

      {isOwner && (
        <div className="vs-ownerbar">
          <span>👁 You’re viewing your storefront exactly as buyers see it.</span>
          <Link href="/vendor/portal">← Back to editing</Link>
        </div>
      )}

      <div className="vs-banner" style={v.banner_url ? { backgroundImage: `url(${v.banner_url})` } : undefined} />

      <div className="vs-wrap">
        <div className="vs-head">
          <div className="vs-headrow">
            <div className="vs-logo">{v.logo_url ? <img src={v.logo_url} alt={v.company_name} /> : initials(v.company_name)}</div>
            <div className="vs-headmain">
              <div className="vs-name">{v.company_name}{v.verified && <span className="vs-tick" title="Verified">✓</span>}</div>
              {v.tagline && <div className="vs-tag">{v.tagline}</div>}
              <div className="vs-meta">
                {v.city && <span>📍 <b>{v.city}</b></span>}
                {v.service_areas.length > 0 && <span>🌎 {v.service_areas.slice(0, 4).join(' · ')}</span>}
                {v.response_time && <span>⚡ Responds in <b>{v.response_time}</b></span>}
              </div>
              {badges.length > 0 && <div className="vs-badges">{badges.map(([c, t], i) => <span key={i} className={`vs-badge ${c}`}>{t}</span>)}</div>}
            </div>
          </div>

          <div className="vs-actions">
            <Link className="vs-btn pri" href={firstListing ? `/marketplace/${firstListing.kind}/${firstListing.id}#quote` : '/marketplace'}>Request quote through NXT//LINK</Link>
            <button className="vs-btn" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>View offerings</button>
          </div>

          {stats.length > 0 && (
            <div className="vs-stats" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)` }}>
              {stats.map(([b, s], i) => <div key={i} className="vs-stat"><b>{b}</b><span>{s}</span></div>)}
            </div>
          )}
        </div>

        {nav.length > 1 && (
          <nav className="vs-subnav">
            {nav.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
        )}

        <div className="vs-grid">
          <main>
            <section id="about" className="vs-card">
              <h2>About</h2>
              {v.description ? <p className="vs-prose">{v.description}</p> : <p className="vs-prose vs-dim">This company hasn’t added a description yet.</p>}
              {v.industries.length > 0 && (<><h3>Industries served</h3><div className="vs-chips">{v.industries.map((c) => <span key={c} className="vs-chip">{c}</span>)}</div></>)}
              {v.client_types.length > 0 && (<><h3>Clients they specialize in</h3><ul className="vs-bullets">{v.client_types.map((c) => <li key={c}>{c}</li>)}</ul></>)}
            </section>

            {(v.main_expertise.length > 0 || v.problems_solved.length > 0 || v.capabilities.length > 0) && (
              <section id="expertise" className="vs-card">
                <h2>Expertise</h2>
                {v.main_expertise.length > 0 && (<><h3>What they’re known for</h3><ul className="vs-bullets">{v.main_expertise.map((c) => <li key={c}>{c}</li>)}</ul></>)}
                {v.problems_solved.length > 0 && (<><h3>Problems they solve</h3><div className="vs-chips">{v.problems_solved.map((c) => <span key={c} className="vs-chip n">{c}</span>)}</div></>)}
                {v.capabilities.length > 0 && (<><h3>Capabilities</h3><ul className="vs-bullets g">{v.capabilities.map((c) => <li key={c}>{c}</li>)}</ul></>)}
              </section>
            )}

            {d.listings.length >= 2 && (
              <section id="compare" className="vs-card">
                <div className="vs-cmphead">
                  <h2>Compare offerings</h2>
                  <div className="vs-sort">
                    <span>Sort</span>
                    <button className={sort === 'name' ? 'on' : ''} onClick={() => setSort('name')}>A–Z</button>
                    <button className={sort === 'price_asc' ? 'on' : ''} onClick={() => setSort('price_asc')}>Price ↑</button>
                    <button className={sort === 'price_desc' ? 'on' : ''} onClick={() => setSort('price_desc')}>Price ↓</button>
                  </div>
                </div>
                <div className="vs-cmpscroll">
                  <table className="vs-cmp">
                    <thead>
                      <tr><th>Offering</th><th>Type</th><th>Price</th><th>Timeline</th><th>Best for</th><th aria-label="Action" /></tr>
                    </thead>
                    <tbody>
                      {compareRows.map((l) => (
                        <tr key={l.id}>
                          <td><Link className="vs-cmpname" href={`/marketplace/${l.kind}/${l.id}`}>{l.name}</Link><span className="vs-cmpcat">{l.category}</span></td>
                          <td><span className={`vs-kind ${l.kind}`}>{l.kind === 'product' ? 'Product' : 'Service'}</span></td>
                          <td className="vs-cmpprice">{priceText(l)}
                            {Number.isFinite(priceValue(l)) && cmpMaxPrice > 0 && (
                              <div className="vs-bar"><i className={priceValue(l) === cmpMinPrice ? 'best' : ''} style={{ width: `${Math.max(6, (priceValue(l) / cmpMaxPrice) * 100)}%` }} /></div>
                            )}
                          </td>
                          <td className="vs-cmptime">{timelineText(l)}
                            {(() => { const dd = daysOf(l); return dd != null && cmpMaxDays > 0 ? (
                              <div className="vs-bar"><i className={dd === cmpMinDays ? 'best' : ''} style={{ width: `${Math.max(6, (dd / cmpMaxDays) * 100)}%` }} /></div>
                            ) : null; })()}
                          </td>
                          <td className="vs-cmpbest">{(l.best_for && l.best_for.length) ? l.best_for.slice(0, 2).join(', ') : '—'}</td>
                          <td><Link className="vs-cmpview" href={`/marketplace/${l.kind}/${l.id}`}>View →</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="vs-cmpnote">Prices and timelines are vendor-provided estimates. Request a quote through NXT//LINK for firm numbers.</p>
              </section>
            )}

            {products.length > 0 && <section id="products" className="vs-card"><h2>Products &amp; equipment</h2><ListingCards items={products} /></section>}
            {services.length > 0 && <section id="services" className="vs-card"><h2>Services</h2><ListingCards items={services} /></section>}

            {d.case_studies.length > 0 && (
              <section id="cases" className="vs-card">
                <h2>Case studies</h2>
                {d.case_studies.map((c) => (
                  <div key={c.id} className="vs-cs">
                    <h4>{c.title}</h4>
                    {c.challenge && <p className="vs-cprob"><b>Challenge:</b> {c.challenge}</p>}
                    {c.solution && <p className="vs-csol"><b>Solution:</b> {c.solution}</p>}
                    {c.result && <p className="vs-cres">{c.result}</p>}
                  </div>
                ))}
              </section>
            )}

            {d.reviews.length > 0 && (
              <section id="reviews" className="vs-card">
                <h2>Reviews <span className="vs-subtle">· from verified NXT//LINK deals only</span></h2>
                {d.reviews.map((r, i) => (
                  <div key={i} className="vs-rev">
                    <div className="vs-revtop"><span className="vs-stars">{stars(r.rating)}</span><span className="vs-revverif">✓ Verified deal</span></div>
                    {r.title && <div className="vs-revtitle">{r.title}</div>}
                    {r.body && <p className="vs-revbody">{r.body}</p>}
                  </div>
                ))}
              </section>
            )}
          </main>

          <aside className="vs-side">
            <div className="vs-card vs-sidecta">
              <h2>Work with this vendor</h2>
              <p>All quotes, files, and messaging run through NXT//LINK. Your introduction is protected.</p>
              <Link className="vs-btn pri vs-full" href={firstListing ? `/marketplace/${firstListing.kind}/${firstListing.id}#quote` : '/marketplace'}>Request a quote</Link>
            </div>

            <div className="vs-card">
              <h2>Quick facts</h2>
              {v.company_type && <div className="vs-qf"><span>Company type</span><b>{TYPE_LABEL[v.company_type] || v.company_type}</b></div>}
              {v.year_founded && <div className="vs-qf"><span>Founded</span><b>{v.year_founded}</b></div>}
              {v.employee_count && <div className="vs-qf"><span>Employees</span><b>{v.employee_count}</b></div>}
              {v.languages.length > 0 && <div className="vs-qf"><span>Languages</span><b>{v.languages.map((l) => l === 'es' ? 'Español' : l === 'en' ? 'English' : l).join(' · ')}</b></div>}
              {v.emergency_available && <div className="vs-qf"><span>Emergency service</span><b>24/7</b></div>}
              {v.website && <div className="vs-qf"><span>Website</span><b><a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noopener noreferrer nofollow" className="vs-link">Visit ↗</a></b></div>}
              {!v.company_type && !v.year_founded && !v.employee_count && !v.languages.length && <p className="vs-prose vs-dim" style={{ margin: 0 }}>Company details coming soon.</p>}
            </div>

            {v.brands_supported.length > 0 && (
              <div className="vs-card"><h2>Brands &amp; equipment supported</h2><div className="vs-brandgrid">{v.brands_supported.map((b) => <span key={b} className="vs-brandpill">{b}</span>)}</div></div>
            )}

            {v.service_areas.length > 0 && (
              <div className="vs-card"><h2>Coverage</h2><div className="vs-coverage">{v.service_areas.map((a) => <div key={a}><span className="vs-dot" />{a}</div>)}</div></div>
            )}

            {d.certifications.length > 0 && (
              <div className="vs-card"><h2>Certifications</h2>{d.certifications.map((c) => <div key={c.id} className="vs-cert"><span className="vs-certi">🛡️</span>{c.name}{c.issuer ? ` · ${c.issuer}` : ''}</div>)}</div>
            )}

            {d.team.length > 0 && (
              <div className="vs-card">
                <h2>Team</h2>
                <div className="vs-team">
                  {d.team.map((m) => (
                    <div key={m.id} className="vs-member">
                      <div className="vs-avatar">{initials(m.name)}</div>
                      <div><b>{m.name}</b><span>{[m.position, m.service_region].filter(Boolean).join(' · ')}</span></div>
                    </div>
                  ))}
                </div>
                <p className="vs-teamnote">Direct contact is shared after a protected NXT//LINK introduction.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.vs{background:#09090F;color:#F1F0F7;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh;}
.vs *{box-sizing:border-box;}
.vs a{text-decoration:none;color:inherit;}
.vs-empty{max-width:600px;margin:90px auto;text-align:center;color:#8A88A0;padding:0 20px;}
.vs-empty a{color:#A78BFA;}
.vs-topbar{position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;padding:13px 22px;background:rgba(9,9,15,.86);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.08);}
.vs-brand b{font-size:16px;font-weight:800;letter-spacing:-.02em;}.vs-brand i{color:#A78BFA;font-style:normal;}
.vs-topr{display:flex;gap:8px;}
.vs-pill{font-size:12.5px;font-weight:600;color:#8A88A0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:7px 13px;}
.vs-pill.on{background:rgba(124,92,252,.16);border-color:#7C5CFC;color:#C4B5FD;}
.vs-ownerbar{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;padding:9px 18px;background:rgba(124,92,252,.14);border-bottom:1px solid rgba(124,92,252,.3);font-size:13px;color:#C4B5FD;}
.vs-ownerbar a{color:#F1F0F7;font-weight:700;text-decoration:none;}
.vs-ownerbar a:hover{text-decoration:underline;}
.vs-banner{height:190px;background-color:#12121F;background-size:cover;background-position:center;background-image:radial-gradient(600px 300px at 80% 0%,rgba(124,92,252,.5),transparent 60%),radial-gradient(500px 300px at 10% 120%,rgba(52,211,153,.32),transparent 55%),linear-gradient(120deg,#171326,#0c1420);}
.vs-wrap{max-width:1120px;margin:0 auto;padding:0 20px;}
.vs-head{position:relative;margin-top:-52px;}
.vs-headrow{display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap;}
.vs-logo{width:112px;height:112px;border-radius:24px;background:linear-gradient(135deg,#7C5CFC,#34D399);display:grid;place-items:center;font-size:38px;font-weight:800;color:#09090F;border:4px solid #09090F;flex-shrink:0;overflow:hidden;box-shadow:0 14px 40px -12px rgba(0,0,0,.7);}
.vs-logo img{width:100%;height:100%;object-fit:cover;}
.vs-headmain{flex:1;min-width:260px;padding-bottom:4px;}
.vs-name{font-size:clamp(23px,3.4vw,31px);font-weight:800;letter-spacing:-.02em;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.vs-tick{width:22px;height:22px;border-radius:50%;background:#60A5FA;color:#09090F;display:inline-grid;place-items:center;font-size:13px;font-weight:900;}
.vs-tag{color:#8A88A0;font-size:14.5px;margin-top:6px;max-width:60ch;}
.vs-meta{display:flex;gap:16px;flex-wrap:wrap;margin-top:11px;font-size:13px;color:#8A88A0;}
.vs-meta b{color:#F1F0F7;font-weight:600;}
.vs-badges{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px;}
.vs-badge{font-size:11.5px;font-weight:600;padding:5px 11px;border-radius:99px;border:1px solid transparent;}
.vs-badge.v{background:rgba(96,165,250,.12);color:#60A5FA;border-color:rgba(96,165,250,.3);}
.vs-badge.g{background:rgba(52,211,153,.12);color:#34D399;border-color:rgba(52,211,153,.3);}
.vs-badge.a{background:rgba(251,191,36,.1);color:#FBBF24;border-color:rgba(251,191,36,.28);}
.vs-badge.p{background:rgba(124,92,252,.12);color:#C4B5FD;border-color:rgba(124,92,252,.3);}
.vs-actions{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0 6px;}
.vs-btn{font-family:inherit;font-size:14px;font-weight:700;border-radius:11px;padding:12px 20px;cursor:pointer;border:1px solid rgba(255,255,255,.14);background:transparent;color:#F1F0F7;}
.vs-btn:hover{border-color:#7C5CFC;}
.vs-btn.pri{background:#7C5CFC;border-color:#7C5CFC;color:#fff;box-shadow:0 12px 30px -12px rgba(124,92,252,.7);}
.vs-btn.pri:hover{background:#6344DF;}
.vs-btn.vs-full{width:100%;text-align:center;}
.vs-stats{display:grid;gap:1px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;margin-top:16px;}
.vs-stat{background:#14141F;padding:15px 16px;}
.vs-stat b{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;display:block;}
.vs-stat span{font-size:11.5px;color:#8A88A0;}
.vs-subnav{position:sticky;top:53px;z-index:40;display:flex;gap:4px;overflow-x:auto;background:rgba(9,9,15,.9);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.08);margin-top:24px;scrollbar-width:none;}
.vs-subnav::-webkit-scrollbar{display:none;}
.vs-subnav a{font-size:13.5px;font-weight:600;color:#8A88A0;padding:14px 15px;border-bottom:2px solid transparent;white-space:nowrap;}
.vs-subnav a:hover{color:#F1F0F7;}
.vs-grid{display:grid;grid-template-columns:1fr 320px;gap:26px;padding:30px 0 90px;align-items:start;}
@media(max-width:900px){.vs-grid{grid-template-columns:1fr;}}
.vs-grid section{scroll-margin-top:110px;}
.vs-card{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px;margin-bottom:18px;}
.vs-card h2{font-size:18px;font-weight:800;letter-spacing:-.02em;margin:0 0 14px;}
.vs-card h3{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8A88A0;margin:18px 0 9px;}
.vs-subtle,.vs-subnav+*{}
.vs-subtle{font-size:13px;font-weight:600;color:#8A88A0;}
.vs-prose{color:#CFCEDC;font-size:14.5px;line-height:1.7;}
.vs-dim{color:#6C6A82;}
.vs-bullets{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px;}
.vs-bullets li{display:flex;gap:10px;font-size:14px;color:#D5D4E0;line-height:1.5;}
.vs-bullets li::before{content:'';width:7px;height:7px;border-radius:50%;background:#7C5CFC;margin-top:7px;flex-shrink:0;}
.vs-bullets.g li::before{background:#34D399;}
.vs-chips{display:flex;flex-wrap:wrap;gap:8px;}
.vs-chip{font-size:12.5px;font-weight:600;padding:7px 13px;border-radius:99px;background:rgba(124,92,252,.1);color:#C4B5FD;border:1px solid rgba(124,92,252,.22);}
.vs-chip.n{background:#1A1A28;color:#C0C0D0;border-color:rgba(255,255,255,.14);}
.vs-plist{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:560px){.vs-plist{grid-template-columns:1fr;}}
.vs-pcard{border:1px solid rgba(255,255,255,.08);border-radius:13px;overflow:hidden;background:#0E0E16;display:flex;flex-direction:column;transition:border-color .15s,transform .15s;}
.vs-pcard:hover{border-color:rgba(124,92,252,.5);transform:translateY(-2px);}
.vs-pimg{height:118px;background:#0E0E16;}
.vs-pimg img{width:100%;height:100%;object-fit:cover;}
.vs-noimg{height:100%;display:grid;place-items:center;color:#42425A;font-size:11px;letter-spacing:.2em;font-weight:700;}
.vs-pb{padding:13px 14px 15px;display:flex;flex-direction:column;gap:6px;flex:1;}
.vs-pn{font-size:14px;font-weight:700;line-height:1.3;}
.vs-pp{font-size:14px;font-weight:800;color:#C4B5FD;font-variant-numeric:tabular-nums;}
.vs-pm{font-size:11.5px;color:#8A88A0;margin-top:auto;}
.vs-ptag{align-self:flex-start;font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:rgba(52,211,153,.12);color:#34D399;}
.vs-cmphead{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
.vs-cmphead h2{margin:0;}
.vs-sort{display:flex;align-items:center;gap:6px;font-size:12px;color:#8A88A0;}
.vs-sort button{font-family:inherit;font-size:12px;font-weight:600;color:#C0C0D0;background:#1A1A28;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 10px;cursor:pointer;}
.vs-sort button.on{background:rgba(124,92,252,.16);border-color:#7C5CFC;color:#C4B5FD;}
.vs-cmpscroll{overflow-x:auto;margin:0 -4px;}
.vs-cmp{width:100%;border-collapse:collapse;font-size:13.5px;min-width:560px;}
.vs-cmp th{text-align:left;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8A88A0;padding:0 12px 10px;border-bottom:1px solid rgba(255,255,255,.1);}
.vs-cmp td{padding:13px 12px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:top;}
.vs-cmp tr:last-child td{border-bottom:none;}
.vs-cmpname{font-weight:700;color:#F1F0F7;display:block;}
.vs-cmpname:hover{color:#C4B5FD;}
.vs-cmpcat{font-size:11.5px;color:#8A88A0;}
.vs-kind{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;white-space:nowrap;}
.vs-kind.product{background:rgba(124,92,252,.12);color:#C4B5FD;}
.vs-kind.service{background:rgba(52,211,153,.12);color:#34D399;}
.vs-cmpprice{font-weight:800;color:#F1F0F7;font-variant-numeric:tabular-nums;white-space:nowrap;}
.vs-cmptime{color:#D5D4E0;white-space:nowrap;}
.vs-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.07);margin-top:6px;overflow:hidden;min-width:64px;max-width:120px;}
.vs-bar i{display:block;height:100%;border-radius:99px;background:#7C5CFC;}
.vs-bar i.best{background:#3B6EA5;}
.vs-cmpbest{color:#A9A8BC;max-width:220px;}
.vs-cmpview{font-weight:700;color:#A78BFA;white-space:nowrap;}
.vs-cmpview:hover{color:#C4B5FD;}
.vs-cmpnote{font-size:11.5px;color:#6C6A82;margin:14px 0 0;line-height:1.5;}
.vs-cs{border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:16px 18px;margin-bottom:12px;background:#0E0E16;}
.vs-cs h4{font-size:15.5px;font-weight:800;margin:0 0 8px;}
.vs-cprob,.vs-csol{font-size:13.5px;color:#C7C6D4;margin:0 0 7px;line-height:1.55;}
.vs-cprob b,.vs-csol b{color:#A78BFA;}
.vs-cres{font-size:13.5px;color:#34D399;font-weight:600;margin:8px 0 0;border-top:1px solid rgba(255,255,255,.08);padding-top:10px;}
.vs-rev{border-bottom:1px solid rgba(255,255,255,.08);padding:14px 0;}
.vs-rev:last-child{border-bottom:none;padding-bottom:0;}
.vs-revtop{display:flex;justify-content:space-between;align-items:center;gap:10px;}
.vs-stars{color:#FBBF24;font-size:13px;letter-spacing:1px;}
.vs-revverif{font-size:10.5px;font-weight:700;color:#34D399;background:rgba(52,211,153,.1);padding:2px 8px;border-radius:99px;}
.vs-revtitle{font-size:14px;font-weight:700;margin-top:8px;}
.vs-revbody{font-size:13.5px;color:#D5D4E0;margin:6px 0 0;line-height:1.55;}
.vs-side{position:sticky;top:110px;display:flex;flex-direction:column;gap:0;}
.vs-side .vs-card{margin-bottom:16px;}
.vs-sidecta{background:linear-gradient(135deg,rgba(124,92,252,.16),rgba(52,211,153,.08));border-color:rgba(124,92,252,.3);}
.vs-sidecta p{font-size:12.5px;color:#8A88A0;margin:6px 0 12px;line-height:1.5;}
.vs-qf{display:flex;justify-content:space-between;gap:12px;font-size:13.5px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);}
.vs-qf:last-child{border-bottom:none;}
.vs-qf span{color:#8A88A0;}
.vs-qf b{font-weight:600;text-align:right;}
.vs-link{color:#A78BFA;}
.vs-brandgrid{display:flex;flex-wrap:wrap;gap:8px;}
.vs-brandpill{font-size:12px;font-weight:600;color:#D5D4E0;background:#1A1A28;border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:7px 11px;}
.vs-coverage{display:flex;flex-direction:column;gap:7px;font-size:13px;color:#D5D4E0;}
.vs-coverage div{display:flex;align-items:center;gap:8px;}
.vs-dot{width:7px;height:7px;border-radius:50%;background:#34D399;}
.vs-cert{display:flex;align-items:center;gap:9px;font-size:13px;padding:7px 0;color:#D5D4E0;}
.vs-certi{flex-shrink:0;}
.vs-team{display:flex;flex-direction:column;gap:13px;}
.vs-member{display:flex;gap:12px;align-items:center;}
.vs-avatar{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-weight:800;font-size:15px;color:#09090F;background:linear-gradient(135deg,#7C5CFC,#A78BFA);}
.vs-member b{font-size:14px;display:block;}
.vs-member span{font-size:12px;color:#8A88A0;}
.vs-teamnote{font-size:11.5px;color:#6C6A82;margin:13px 0 0;line-height:1.5;}
`;
