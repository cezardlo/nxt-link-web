'use client';

// Public company profile — the SAME standardized template for every vendor:
// professional company site + storefront + verified industrial supplier
// profile. Header (identity + trust + NXT//LINK deal actions), tabbed body
// (Overview, Expertise, Products, Services, Technology, Case studies,
// Documents, Team, Reviews — unused tabs auto-hide). A buyer should
// understand the company in one minute; every deal action runs through
// NXT//LINK (blueprint §16).

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  PROFILE_TABS, TAB_LABELS, type ProfileTab,
  isTechnologyCategory, yearsInBusiness,
} from '@/lib/vendor/profile-template';
import { cardPriceText } from '@/lib/marketplace/types';
import {
  type CompanySnapshot, SAVED_COMPANIES_KEY, COMPARE_COMPANIES_KEY,
  readCompanyList, writeCompanyList, CompareDrawer,
} from '@/components/marketplace/CompanyCompare';

interface ListingCard {
  id: string; kind: 'product' | 'service'; name: string; category: string;
  overview: string | null; best_for?: string[]; image_url: string | null;
  pilot?: { available?: boolean } | null;
  pricing?: { model?: string; range?: string; buy?: boolean; rent?: boolean; lease?: boolean; models?: unknown[]; has_gated_pricing?: boolean } | null;
  warranty_support?: { warranty?: string } | null;
  lead_time?: string | null; availability?: string[];
  service_areas?: string[]; response_time?: string | null; emergency_available?: boolean;
  pricing_model?: string | null;
}
interface Vendor {
  id: string; company_name: string; city: string | null; website: string | null;
  description: string | null; verified: boolean; logo_url: string | null;
  banner_url: string | null; tagline: string | null;
  categories: string[]; industries: string[]; service_areas: string[]; client_types: string[];
  achievements: string[];
  rating: number | null; review_count: number;
  year_founded: number | null; employee_count: string | null; company_type: string | null;
  languages: string[]; response_time: string | null; projects_completed: number | null;
  emergency_available: boolean; cross_border: boolean; installation_available: boolean;
  pilot_available: boolean;
  main_expertise: string[]; problems_solved: string[]; capabilities: string[];
  cta_label: string | null; visible_tabs: string[]; brand_color: string | null;
  insured: boolean;
}
interface Storefront {
  vendor: Vendor;
  listings: ListingCard[];
  case_studies: Array<{ id: string; title: string; challenge: string | null; solution: string | null; result: string | null }>;
  videos: Array<{ id: string; title: string | null; embed_url: string; provider: string }>;
  reviews: Array<{ rating: number; title: string | null; body: string | null }>;
  certifications: Array<{ id: string; name: string; issuer: string | null; credential: string | null; expires_on: string | null; image_url: string | null }>;
  gallery: Array<{ id: string; caption: string | null; image_url: string | null }>;
  team: Array<{ id: string; name: string; position: string | null; expertise: string | null; languages: string[]; service_region: string | null; photo_url: string | null }>;
  documents: Array<{ id: string; name: string; size_bytes: number; url: string | null }>;
}

const stars = (n: number) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));

export default function VendorStorefrontPage() {
  const params = useParams<{ id: string }>();
  const [d, setD] = useState<Storefront | null>(null);
  const [missing, setMissing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [saved, setSaved] = useState(false);
  const [compare, setCompare] = useState<CompanySnapshot[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState<null | 'quote' | 'question'>(null);

  useEffect(() => {
    fetch(`/api/marketplace/vendor/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) { setD(data); document.title = `${data.vendor.company_name} — NXT//LINK`; }
        else setMissing(true);
      })
      .catch(() => setMissing(true));
    // If the signed-in vendor is viewing their OWN page, show Edit profile.
    fetch('/api/vendor/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => { if (me?.ok && me.vendor?.id === params.id) setIsOwner(true); })
      .catch(() => {});
    setSaved(readCompanyList(SAVED_COMPANIES_KEY).some((c) => c.id === params.id));
    setCompare(readCompanyList(COMPARE_COMPANIES_KEY));
    const hash = window.location.hash.replace('#', '');
    if ((PROFILE_TABS as readonly string[]).includes(hash)) setTab(hash as ProfileTab);
    // Deep link from marketplace company cards: ?request=quote|question.
    const req = new URLSearchParams(window.location.search).get('request');
    if (req === 'quote' || req === 'question') setReqOpen(req);
  }, [params.id]);

  const v = d?.vendor;
  const snapshot = useMemo<CompanySnapshot | null>(() => (d && v ? {
    id: v.id, name: v.company_name, city: v.city, verified: v.verified, insured: v.insured,
    rating: v.rating, review_count: v.review_count, response_time: v.response_time,
    year_founded: v.year_founded, listings: d.listings.length,
    pilot_available: v.pilot_available || d.listings.some((l) => l.pilot?.available),
    installation_available: v.installation_available, cross_border: v.cross_border,
    emergency_available: v.emergency_available,
    industries: v.industries.slice(0, 4), main_expertise: v.main_expertise.slice(0, 5),
  } : null), [d, v]);

  const products = useMemo(() => (d?.listings || []).filter((l) => l.kind === 'product' && !isTechnologyCategory(l.category)), [d]);
  const technology = useMemo(() => (d?.listings || []).filter((l) => l.kind === 'product' && isTechnologyCategory(l.category)), [d]);
  const services = useMemo(() => (d?.listings || []).filter((l) => l.kind === 'service'), [d]);

  // A tab is shown only when it has content; the vendor's visible_tabs (when
  // set) can hide more, but Overview always stays.
  const tabs = useMemo<ProfileTab[]>(() => {
    if (!d || !v) return ['overview'];
    const has: Record<ProfileTab, boolean> = {
      overview: true,
      expertise: v.main_expertise.length > 0 || v.problems_solved.length > 0 || v.capabilities.length > 0 || v.industries.length > 0,
      products: products.length > 0,
      services: services.length > 0,
      technology: technology.length > 0,
      cases: d.case_studies.length > 0,
      documents: d.documents.length > 0 || d.certifications.length > 0,
      team: d.team.length > 0,
      reviews: d.reviews.length > 0,
    };
    const allowed = v.visible_tabs.length ? new Set([...v.visible_tabs, 'overview']) : null;
    return PROFILE_TABS.filter((t) => has[t] && (!allowed || allowed.has(t)));
  }, [d, v, products, services, technology]);

  function pickTab(t: ProfileTab) {
    setTab(t);
    try { history.replaceState(null, '', `#${t}`); } catch { /* older browsers */ }
  }
  function toggleSave() {
    if (!snapshot) return;
    const list = readCompanyList(SAVED_COMPANIES_KEY).filter((c) => c.id !== snapshot.id);
    if (!saved) list.push(snapshot);
    writeCompanyList(SAVED_COMPANIES_KEY, list);
    setSaved(!saved);
  }
  function toggleCompare() {
    if (!snapshot) return;
    let list = readCompanyList(COMPARE_COMPANIES_KEY);
    if (list.some((c) => c.id === snapshot.id)) list = list.filter((c) => c.id !== snapshot.id);
    else { list = [...list, snapshot].slice(-4); setCompareOpen(true); }
    writeCompanyList(COMPARE_COMPANIES_KEY, list);
    setCompare(list);
  }
  function removeCompare(id: string) {
    const list = readCompanyList(COMPARE_COMPANIES_KEY).filter((c) => c.id !== id);
    writeCompanyList(COMPARE_COMPANIES_KEY, list);
    setCompare(list);
    if (!list.length) setCompareOpen(false);
  }

  if (missing) return <div className="vs"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="vs-empty">Vendor not found. <Link href="/marketplace">Back to marketplace</Link></div></div>;
  if (!d || !v) return <div className="vs"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="vs-empty">Loading…</div></div>;

  const inCompare = compare.some((c) => c.id === v.id);
  const years = yearsInBusiness(v.year_founded, new Date().getFullYear());
  const pilotAvailable = v.pilot_available || d.listings.some((l) => l.pilot?.available);
  const ctaLabel = v.cta_label || 'Request Quote';
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(v.brand_color || '') ? (v.brand_color as string) : undefined;

  const quickFacts: Array<[string, string]> = [];
  if (years !== null) quickFacts.push(['Years in business', String(years)]);
  if (v.projects_completed) quickFacts.push(['Projects completed', String(v.projects_completed)]);
  if (v.response_time) quickFacts.push(['Avg. response time', v.response_time]);
  if (v.service_areas.length) quickFacts.push(['Locations served', String(v.service_areas.length)]);
  if (v.industries.length) quickFacts.push(['Industries served', String(v.industries.length)]);
  if (v.emergency_available) quickFacts.push(['Emergency service', 'Yes']);
  if (v.cross_border) quickFacts.push(['Cross-border capability', 'Yes']);
  if (v.installation_available) quickFacts.push(['Installation available', 'Yes']);

  const aboutFacts: Array<[string, string]> = [];
  if (v.year_founded) aboutFacts.push(['Founded', String(v.year_founded)]);
  if (v.employee_count) aboutFacts.push(['Employees', v.employee_count]);
  if (v.company_type) aboutFacts.push(['Company type', v.company_type]);
  if (v.city) aboutFacts.push(['Headquarters', v.city]);
  if (v.languages.length) aboutFacts.push(['Languages', v.languages.join(', ')]);

  return (
    <div className="vs" style={accent ? ({ ['--vsa' as string]: accent } as React.CSSProperties) : undefined}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="vs-nav">
        <Link className="vs-back" href="/marketplace">← Marketplace</Link>
        <span className="vs-thru">Deals run through NXT{'//'}LINK</span>
      </nav>

      {/* ---- Header: identical structure for every company ---- */}
      <div className="vs-cover">
        {v.banner_url ? <img src={v.banner_url} alt="" /> : <div className="vs-coverph" />}
      </div>
      <header className="vs-hero">
        <div className="vs-logo">{v.logo_url ? <img src={v.logo_url} alt={`${v.company_name} logo`} /> : <span>{v.company_name.slice(0, 2).toUpperCase()}</span>}</div>
        <div className="vs-id">
          <div className="vs-namerow">
            <h1>{v.company_name}</h1>
            {isOwner && <Link className="vs-edit" href="/vendor/portal">Edit profile</Link>}
          </div>
          {v.tagline && <p className="vs-tagline">{v.tagline}</p>}
          <div className="vs-sub">
            {v.city && <span>📍 {v.city}</span>}
            {v.service_areas.length > 0 && <span>🌎 Serves {v.service_areas.join(', ')}</span>}
          </div>
          <div className="vs-badges">
            {v.verified && <span className="trust">✓ Verified business</span>}
            {v.insured && <span className="trust">✓ Insured</span>}
            {v.installation_available && <span>✓ Installation available</span>}
            {pilotAvailable && <span>✓ Pilot available</span>}
            {v.emergency_available && <span className="urgent">24/7 emergency</span>}
            {v.response_time && <span>Responds {v.response_time.toLowerCase()}</span>}
            {typeof v.rating === 'number' && v.review_count > 0 && <span className="rating">★ {v.rating.toFixed(1)} ({v.review_count})</span>}
          </div>
          {v.industries.length > 0 && (
            <div className="vs-inds">{v.industries.slice(0, 6).map((i) => <em key={i}>{i}</em>)}</div>
          )}
        </div>
      </header>

      {/* ---- Deal actions — the primary path runs through NXT//LINK ---- */}
      <div className="vs-actions">
        <button className="vs-cta-main" onClick={() => setReqOpen('quote')}>{ctaLabel}<small>via NXT{'//'}LINK</small></button>
        <button className={'vs-cta-sec' + (saved ? ' on' : '')} onClick={toggleSave}>{saved ? '✓ Saved' : 'Save company'}</button>
        <button className={'vs-cta-sec' + (inCompare ? ' on' : '')} onClick={toggleCompare}>{inCompare ? '✓ In comparison' : 'Add to comparison'}</button>
        <button className="vs-cta-sec" onClick={() => setReqOpen('question')}>Ask a question</button>
        {compare.length > 1 && <button className="vs-cta-compare" onClick={() => setCompareOpen(true)}>Compare ({compare.length})</button>}
      </div>

      {/* ---- Tabs (unused tabs auto-hide) ---- */}
      {tabs.length > 1 && (
        <div className="vs-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={'vs-tab' + (tab === t ? ' on' : '')} onClick={() => pickTab(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      <main className="vs-wrap">
        {tab === 'overview' && (
          <>
            {v.description && (
              <section className="vs-sec">
                <h2>About</h2>
                <p className="vs-about">{v.description}</p>
              </section>
            )}
            {aboutFacts.length > 0 && (
              <section className="vs-sec">
                <h2>Company details</h2>
                <div className="vs-factrows">
                  {aboutFacts.map(([k, val]) => <div className="vs-factrow" key={k}><span>{k}</span><b>{val}</b></div>)}
                </div>
              </section>
            )}
            {quickFacts.length > 0 && (
              <section className="vs-sec">
                <h2>Quick facts</h2>
                <div className="vs-quick">
                  {quickFacts.map(([k, val]) => <div className="vs-qcard" key={k}><b>{val}</b><span>{k}</span></div>)}
                </div>
              </section>
            )}
            {v.achievements.length > 0 && (
              <section className="vs-sec">
                <h2>Awards &amp; recognitions</h2>
                <div className="vs-awards">{v.achievements.map((a) => <span key={a} className="vs-award">{a}</span>)}</div>
              </section>
            )}
            {(d.gallery || []).length > 0 && (
              <section className="vs-sec">
                <h2>Photos</h2>
                <div className="vs-photos">
                  {d.gallery.map((g) => (
                    <figure key={g.id} className="vs-photo">
                      {g.image_url && <img src={g.image_url} alt={g.caption || 'Vendor photo'} />}
                      {g.caption && <figcaption>{g.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            )}
            {d.videos.length > 0 && (
              <section className="vs-sec">
                <h2>Videos</h2>
                <div className="vs-videos">
                  {d.videos.filter((vd) => vd.provider !== 'other').map((vd) => (
                    <div className="vs-video" key={vd.id}>
                      <iframe src={vd.embed_url} title={vd.title || 'video'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {tab === 'expertise' && (
          <>
            {v.main_expertise.length > 0 && (
              <section className="vs-sec">
                <h2>Main expertise</h2>
                <div className="vs-expgrid">{v.main_expertise.map((e) => <div key={e} className="vs-exp">{e}</div>)}</div>
              </section>
            )}
            {v.problems_solved.length > 0 && (
              <section className="vs-sec">
                <h2>Problems we solve</h2>
                <ul className="vs-problems">{v.problems_solved.map((p) => <li key={p}>{p}</li>)}</ul>
              </section>
            )}
            {v.industries.length > 0 && (
              <section className="vs-sec">
                <h2>Industries served</h2>
                <div className="vs-awards">{v.industries.map((i) => <span key={i} className="vs-chip">{i}</span>)}</div>
              </section>
            )}
            {v.capabilities.length > 0 && (
              <section className="vs-sec">
                <h2>Capabilities</h2>
                <div className="vs-awards">{v.capabilities.map((c) => <span key={c} className="vs-chip">{c}</span>)}</div>
              </section>
            )}
            {v.client_types.length > 0 && (
              <section className="vs-sec">
                <h2>Typical clients</h2>
                <div className="vs-awards">{v.client_types.map((c) => <span key={c} className="vs-chip">{c}</span>)}</div>
              </section>
            )}
          </>
        )}

        {tab === 'products' && <ListingGrid title="Products & equipment" items={products} cta="Request quote →" />}
        {tab === 'services' && <ListingGrid title="Services" items={services} cta="Request quote →" />}
        {tab === 'technology' && <ListingGrid title="Technology & software" items={technology} cta="Request demo →" />}

        {tab === 'cases' && (
          <section className="vs-sec">
            <h2>Case studies</h2>
            <div className="vs-cases">
              {d.case_studies.map((c) => (
                <div className="vs-case" key={c.id}>
                  <b>{c.title}</b>
                  {c.challenge && <p><span>Challenge:</span> {c.challenge}</p>}
                  {c.solution && <p><span>Solution:</span> {c.solution}</p>}
                  {c.result && <p><span>Result:</span> {c.result}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'documents' && (
          <>
            {d.certifications.length > 0 && (
              <section className="vs-sec">
                <h2>Certifications</h2>
                <div className="vs-certs">
                  {d.certifications.map((c) => {
                    const expired = c.expires_on ? new Date(c.expires_on) < new Date() : false;
                    return (
                      <div className={'vs-cert' + (expired ? ' expired' : '')} key={c.id}>
                        <b>{c.name}</b>
                        <small>{[c.issuer, c.credential && `#${c.credential}`, c.expires_on && (expired ? `EXPIRED ${c.expires_on}` : `valid through ${c.expires_on}`)].filter(Boolean).join(' · ')}</small>
                        <i className="vs-provided">Vendor provided</i>
                        {c.image_url && <a href={c.image_url} target="_blank" rel="noreferrer">View certificate ↗</a>}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            {d.documents.length > 0 && (
              <section className="vs-sec">
                <h2>Documents &amp; brochures</h2>
                <ul className="vs-docs">
                  {d.documents.map((doc) => (
                    <li key={doc.id}>
                      <a href={doc.url || '#'} target="_blank" rel="noreferrer">{doc.name}</a>
                      <span>{(doc.size_bytes / 1024 / 1024).toFixed(1)} MB · Vendor provided</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {tab === 'team' && (
          <section className="vs-sec">
            <h2>Team</h2>
            <p className="vs-none">Introductions run through NXT{'//'}LINK — contact details are shared after a protected introduction.</p>
            <div className="vs-team">
              {d.team.map((m) => (
                <div className="vs-member" key={m.id}>
                  <div className="vs-mphoto">{m.photo_url ? <img src={m.photo_url} alt={m.name} /> : <span>{m.name.slice(0, 2).toUpperCase()}</span>}</div>
                  <b>{m.name}</b>
                  {m.position && <small>{m.position}</small>}
                  {m.expertise && <p>{m.expertise}</p>}
                  <div className="vs-mmeta">
                    {m.languages.length > 0 && <span>{m.languages.join(' · ')}</span>}
                    {m.service_region && <span>{m.service_region}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'reviews' && (
          <section className="vs-sec">
            <h2>Verified reviews</h2>
            <p className="vs-none">From buyers who accepted a quote through NXT{'//'}LINK.</p>
            <div className="vs-reviews">
              {d.reviews.map((r, i) => (
                <div className="vs-review" key={i}>
                  <div className="vs-rvstars">{stars(r.rating)}</div>
                  {r.title && <b>{r.title}</b>}
                  {r.body && <p>{r.body}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Bottom deal actions (spec: profile layout, bottom) ---- */}
        <div className="vs-bottomcta">
          <button className="vs-cta-main" onClick={() => setReqOpen('quote')}>{ctaLabel}<small>via NXT{'//'}LINK</small></button>
          <button className="vs-cta-sec" onClick={() => setReqOpen('question')}>Ask a question</button>
          <button className={'vs-cta-sec' + (saved ? ' on' : '')} onClick={toggleSave}>{saved ? '✓ Saved' : 'Save company'}</button>
        </div>
        <footer className="vs-foot">
          Quotes, demos, pilots, and purchases with {v.company_name} run through NXT{'//'}LINK — tracked, protected, and reviewed.
        </footer>
      </main>

      {reqOpen && <RequestModal vendor={v} listings={d.listings} type={reqOpen} onClose={() => setReqOpen(null)} />}
      {compareOpen && compare.length > 0 && (
        <CompareDrawer companies={compare} onRemove={removeCompare} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ListingGrid({ title, items, cta }: { title: string; items: ListingCard[]; cta: string }) {
  return (
    <section className="vs-sec">
      <h2>{title} <small>{items.length}</small></h2>
      <div className="vs-grid">
        {items.map((l) => {
          const buyOpts = [l.pricing?.buy && 'Buy', l.pricing?.rent && 'Rent', l.pricing?.lease && 'Lease'].filter(Boolean) as string[];
          return (
            <Link href={`/marketplace/${l.kind}/${l.id}`} className="vs-card" key={l.id}>
              <div className="vs-cimg">{l.image_url ? <img src={l.image_url} alt={l.name} /> : <span>{l.kind}</span>}</div>
              <div className="vs-cbody">
                <div className="vs-ctop">
                  <i className={l.kind}>{l.kind}</i>
                  {l.pilot?.available && <b>Pilot</b>}
                  {l.warranty_support?.warranty && <b>Warranty</b>}
                  {l.emergency_available && <b className="urgent">24/7</b>}
                </div>
                <strong>{l.name}</strong>
                <small>{l.category}</small>
                <div className="vs-cmeta">
                  {cardPriceText(l.pricing, l.pricing_model) && <span className="vs-price">{cardPriceText(l.pricing, l.pricing_model)}</span>}
                  {buyOpts.length > 0 && <span>{buyOpts.join(' / ')}</span>}
                  {l.lead_time && <span>Lead time: {l.lead_time}</span>}
                  {l.response_time && <span>Response: {l.response_time}</span>}
                </div>
                <span className="vs-quotecta">{cta}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Company-level "Request Quote" / "Ask a Question" — posts a tracked lead via
// /api/marketplace/request against a chosen listing, so the opportunity stays
// inside NXT//LINK. Vendors with no published listings route to /intake.
function RequestModal({ vendor, listings, type, onClose }: {
  vendor: Vendor; listings: ListingCard[]; type: 'quote' | 'question'; onClose: () => void;
}) {
  const [listingId, setListingId] = useState(listings[0]?.id || '');
  const [form, setForm] = useState({ company: '', contact_name: '', email: '', phone: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const startedAt = useRef(Date.now());

  const title = type === 'quote' ? `Request a quote from ${vendor.company_name}` : `Ask ${vendor.company_name} a question`;

  async function submit() {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) return;
    if (!form.company.trim() || !form.email.trim()) { setErrMsg('Company and a valid email are required.'); return; }
    setBusy(true); setErrMsg('');
    try {
      const res = await fetch('/api/marketplace/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id, kind: listing.kind,
          request_type: type === 'quote' ? 'quote' : 'question',
          started_at: startedAt.current,
          ...form,
        }),
      });
      const data = await res.json();
      if (data.ok) setRef(data.public_ref || 'received');
      else setErrMsg(data.message || 'Could not send the request.');
    } catch { setErrMsg('Could not send the request.'); }
    setBusy(false);
  }

  return (
    <div className="vs-modal" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vs-mbox">
        <button className="vs-mclose" onClick={onClose} aria-label="Close">✕</button>
        <h3>{title}</h3>
        {listings.length === 0 ? (
          <>
            <p className="vs-mhint">This company has no published listings yet. Describe your need to NXT{'//'}LINK and an advisor will coordinate it.</p>
            <Link className="vs-cta-main" href="/intake">Describe your need →</Link>
          </>
        ) : ref ? (
          <>
            <p className="vs-mok">✓ Sent. Your reference is <b>{ref}</b>.</p>
            <p className="vs-mhint">The vendor responds inside NXT{'//'}LINK; you&apos;ll hear back at the email you provided. Your request is tracked and the introduction is protected.</p>
            <button className="vs-cta-sec" onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <p className="vs-mhint">Managed through NXT{'//'}LINK — the request is tracked, the introduction is protected, and NXT{'//'}LINK may receive a commission from the vendor.</p>
            <label className="vs-mfield">
              <span>{type === 'quote' ? 'What do you need a quote for?' : 'Which offering is your question about?'}</span>
              <select value={listingId} onChange={(e) => setListingId(e.target.value)}>
                {listings.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.kind})</option>)}
              </select>
            </label>
            <div className="vs-mgrid">
              <label className="vs-mfield"><span>Company *</span><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></label>
              <label className="vs-mfield"><span>Contact name</span><input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></label>
              <label className="vs-mfield"><span>Email *</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label className="vs-mfield"><span>Phone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            </div>
            <label className="vs-mfield">
              <span>{type === 'quote' ? 'Describe what you need' : 'Your question'}</span>
              <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </label>
            {errMsg && <p className="vs-merr">{errMsg}</p>}
            <button className="vs-cta-main" disabled={busy} onClick={submit}>{busy ? 'Sending…' : (type === 'quote' ? 'Send quote request' : 'Send question')}<small>via NXT{'//'}LINK</small></button>
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.vs{--vsa:#7C5CFC;min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.vs *{box-sizing:border-box;}
.vs-empty{min-height:60vh;display:grid;place-items:center;color:#8080A0;}
.vs-empty a{color:#A78BFA;}
.vs-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.85);backdrop-filter:blur(20px);z-index:20;}
.vs-back{color:#C0C0D0;text-decoration:none;font-size:14px;font-weight:600;}
.vs-thru{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#C4B5FD;background:rgba(124,92,252,.14);border:1px solid rgba(124,92,252,.3);padding:4px 10px;border-radius:99px;}
.vs-cover{height:220px;overflow:hidden;position:relative;background:#0E0E16;}
.vs-cover img{width:100%;height:100%;object-fit:cover;}
.vs-coverph{width:100%;height:100%;background:linear-gradient(120deg,#1b1533 0%,#241a4d 40%,#12244a 100%);}
.vs-hero{display:flex;gap:22px;align-items:flex-end;max-width:960px;margin:-52px auto 0;padding:0 20px 8px;position:relative;z-index:2;}
.vs-logo{width:112px;height:112px;flex-shrink:0;border-radius:20px;border:4px solid #0A0A0F;background:#14141F;display:grid;place-items:center;overflow:hidden;font-size:30px;font-weight:800;color:var(--vsa);box-shadow:0 8px 30px rgba(0,0,0,.45);}
.vs-logo img{width:100%;height:100%;object-fit:contain;}
.vs-id{padding-bottom:2px;min-width:0;}
.vs-namerow{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.vs-id h1{font-size:clamp(22px,3.6vw,32px);font-weight:800;letter-spacing:-.02em;}
.vs-edit{font-size:12.5px;font-weight:700;color:#C4B5FD;background:rgba(124,92,252,.14);border:1px solid rgba(124,92,252,.4);border-radius:9px;padding:7px 14px;text-decoration:none;}
.vs-edit:hover{background:rgba(124,92,252,.24);}
.vs-tagline{color:#B8B6CC;font-size:14.5px;margin:6px 0 0;font-weight:300;}
.vs-sub{display:flex;gap:14px;color:#8080A0;font-size:14px;margin-top:6px;flex-wrap:wrap;}
.vs-badges{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px;}
.vs-badges span{font-size:11px;font-weight:600;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;}
.vs-badges span.trust{background:rgba(52,211,153,.12);color:#34D399;}
.vs-badges span.rating{background:rgba(251,191,36,.14);color:#FBBF24;font-weight:700;}
.vs-badges span.urgent{background:rgba(251,191,36,.12);color:#FBBF24;}
.vs-inds{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;}
.vs-inds em{font-style:normal;font-size:11.5px;color:#A78BFA;background:rgba(124,92,252,.08);padding:3px 9px;border-radius:6px;}
.vs-actions{display:flex;flex-wrap:wrap;gap:10px;max-width:960px;margin:16px auto 0;padding:0 20px;}
.vs-cta-main{font-family:inherit;display:inline-flex;flex-direction:column;align-items:center;gap:1px;border:none;cursor:pointer;font-size:14.5px;font-weight:700;border-radius:11px;padding:11px 22px;background:var(--vsa);color:#fff;text-decoration:none;box-shadow:0 4px 18px rgba(124,92,252,.35);}
.vs-cta-main small{font-size:9.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.8;}
.vs-cta-main:hover{filter:brightness(1.1);}
.vs-cta-main:disabled{opacity:.6;}
.vs-cta-sec{font-family:inherit;border:1px solid rgba(255,255,255,.14);cursor:pointer;font-size:13.5px;font-weight:600;border-radius:11px;padding:11px 18px;background:rgba(255,255,255,.04);color:#E0E0EA;}
.vs-cta-sec:hover{border-color:var(--vsa);}
.vs-cta-sec.on{border-color:rgba(52,211,153,.5);color:#34D399;}
.vs-cta-compare{font-family:inherit;border:1px solid rgba(124,92,252,.5);cursor:pointer;font-size:13.5px;font-weight:700;border-radius:11px;padding:11px 18px;background:rgba(124,92,252,.14);color:#C4B5FD;}
.vs-tabs{display:flex;gap:2px;max-width:960px;margin:22px auto 0;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.08);overflow-x:auto;position:sticky;top:53px;background:rgba(10,10,15,.92);backdrop-filter:blur(16px);z-index:15;}
.vs-tab{font-family:inherit;background:none;border:none;border-bottom:2px solid transparent;color:#8080A0;font-size:13.5px;font-weight:600;padding:12px 15px;cursor:pointer;white-space:nowrap;}
.vs-tab:hover{color:#C0C0D0;}
.vs-tab.on{color:#F0F0F5;border-bottom-color:var(--vsa);}
.vs-wrap{max-width:960px;margin:0 auto;padding:10px 20px 110px;}
.vs-sec{margin-top:34px;}
.vs-sec h2{font-size:18px;font-weight:800;letter-spacing:-.01em;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:9px;}
.vs-sec h2 small{color:#8080A0;font-weight:600;font-size:13px;margin-left:8px;}
.vs-about{font-size:15px;line-height:1.7;color:#D5D4E0;font-weight:300;white-space:pre-wrap;max-width:760px;}
.vs-none{color:#8080A0;font-size:13.5px;margin-bottom:10px;}
.vs-factrows{display:flex;flex-direction:column;gap:0;max-width:560px;}
.vs-factrow{display:flex;justify-content:space-between;gap:20px;padding:10px 2px;border-bottom:1px solid rgba(255,255,255,.05);font-size:14px;}
.vs-factrow span{color:#8080A0;}
.vs-factrow b{font-weight:600;text-align:right;}
.vs-quick{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;}
.vs-qcard{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;}
.vs-qcard b{font-size:18px;font-weight:800;color:#F0F0F5;}
.vs-qcard span{font-size:11.5px;color:#8080A0;}
.vs-awards{display:flex;flex-wrap:wrap;gap:9px;}
.vs-award{font-size:13px;font-weight:600;padding:8px 14px;border-radius:99px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);color:#FBBF24;}
.vs-chip{font-size:13px;font-weight:500;padding:7px 13px;border-radius:99px;background:rgba(124,92,252,.08);border:1px solid rgba(124,92,252,.25);color:#C4B5FD;}
.vs-expgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}
.vs-exp{background:linear-gradient(135deg,rgba(124,92,252,.14),rgba(124,92,252,.05));border:1px solid rgba(124,92,252,.35);border-radius:13px;padding:16px 18px;font-size:14.5px;font-weight:700;color:#E4DEFF;}
.vs-problems{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:9px;}
.vs-problems li{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:11px 14px;font-size:13.5px;color:#D5D4E0;}
.vs-problems li:before{content:'✓ ';color:#34D399;font-weight:700;}
.vs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;}
.vs-card{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:15px;overflow:hidden;text-decoration:none;color:#F0F0F5;display:flex;flex-direction:column;transition:border-color .15s,transform .15s;}
.vs-card:hover{border-color:rgba(124,92,252,.5);transform:translateY(-2px);}
.vs-cimg{height:130px;background:#0E0E16;display:grid;place-items:center;color:#505068;font-size:12px;letter-spacing:.14em;text-transform:uppercase;}
.vs-cimg img{width:100%;height:100%;object-fit:cover;}
.vs-cbody{padding:13px 15px 15px;display:flex;flex-direction:column;gap:6px;flex:1;}
.vs-ctop{display:flex;gap:6px;flex-wrap:wrap;}
.vs-ctop i{font-style:normal;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:rgba(124,92,252,.15);color:#C4B5FD;}
.vs-ctop i.service{background:rgba(52,211,153,.12);color:#34D399;}
.vs-ctop b{font-size:10px;font-weight:600;padding:3px 8px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;}
.vs-ctop b.urgent{background:rgba(251,191,36,.12);color:#FBBF24;}
.vs-cbody strong{font-size:15px;font-weight:700;line-height:1.3;}
.vs-cbody small{color:#8080A0;font-size:12px;}
.vs-cmeta{display:flex;flex-direction:column;gap:2px;}
.vs-price{color:#34D399;font-weight:700;}
.vs-cmeta span{font-size:11.5px;color:#A0A0B5;}
.vs-quotecta{margin-top:auto;padding-top:8px;color:#C4B5FD;font-size:12.5px;font-weight:700;}
.vs-certs{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}
.vs-cert{display:flex;flex-direction:column;gap:5px;background:#14141F;border:1px solid rgba(251,191,36,.25);border-radius:13px;padding:14px 16px;}
.vs-cert.expired{border-color:rgba(252,165,165,.4);}
.vs-cert.expired small{color:#FCA5A5;font-weight:600;}
.vs-cert b{font-size:14px;}
.vs-cert small{color:#8080A0;font-size:12px;line-height:1.45;}
.vs-cert a{color:#FBBF24;font-size:12.5px;font-weight:600;text-decoration:none;margin-top:3px;}
.vs-provided{font-style:normal;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#63607A;}
.vs-docs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px;}
.vs-docs li{display:flex;justify-content:space-between;align-items:center;gap:14px;background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:12px 16px;}
.vs-docs a{color:#A78BFA;font-size:14px;font-weight:600;text-decoration:none;}
.vs-docs li span{color:#63607A;font-size:11.5px;white-space:nowrap;}
.vs-team{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;}
.vs-member{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:4px;align-items:flex-start;}
.vs-mphoto{width:64px;height:64px;border-radius:99px;background:#0E0E16;display:grid;place-items:center;overflow:hidden;color:var(--vsa);font-weight:800;font-size:18px;margin-bottom:8px;}
.vs-mphoto img{width:100%;height:100%;object-fit:cover;}
.vs-member b{font-size:14.5px;}
.vs-member small{color:#A78BFA;font-size:12px;font-weight:600;}
.vs-member p{font-size:12.5px;color:#A0A0B5;margin:5px 0 0;line-height:1.5;}
.vs-mmeta{display:flex;flex-wrap:wrap;gap:8px;margin-top:7px;}
.vs-mmeta span{font-size:11px;color:#63607A;}
.vs-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}
.vs-photo{margin:0;background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:13px;overflow:hidden;}
.vs-photo img{width:100%;height:150px;object-fit:cover;display:block;}
.vs-photo figcaption{padding:8px 12px;font-size:12px;color:#8080A0;}
.vs-cases{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;}
.vs-case{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 18px;}
.vs-case b{font-size:14.5px;}
.vs-case p{font-size:13px;color:#C0C0D0;margin:8px 0 0;line-height:1.55;}
.vs-case p span{color:#8080A0;}
.vs-videos{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;}
.vs-video{position:relative;padding-top:56.25%;background:#000;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.08);}
.vs-video iframe{position:absolute;inset:0;width:100%;height:100%;border:none;}
.vs-reviews{display:flex;flex-direction:column;gap:12px;}
.vs-review{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:14px 16px;}
.vs-rvstars{color:#FBBF24;letter-spacing:2px;font-size:15px;margin-bottom:5px;}
.vs-review b{font-size:14px;}
.vs-review p{font-size:13.5px;color:#C0C0D0;margin:7px 0 0;line-height:1.55;white-space:pre-wrap;}
.vs-bottomcta{display:flex;flex-wrap:wrap;gap:10px;margin-top:44px;padding-top:24px;border-top:1px solid rgba(255,255,255,.07);}
.vs-foot{margin-top:26px;color:#63607A;font-size:12.5px;text-align:center;line-height:1.6;}
.vs-modal{position:fixed;inset:0;background:rgba(5,5,10,.72);backdrop-filter:blur(6px);z-index:50;display:grid;place-items:center;padding:18px;}
.vs-mbox{position:relative;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;background:#12121B;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:26px;}
.vs-mbox.wide{max-width:860px;}
.vs-mbox h3{font-size:18px;font-weight:800;margin:0 0 10px;padding-right:30px;}
.vs-mclose{position:absolute;top:14px;right:14px;background:none;border:none;color:#8080A0;font-size:15px;cursor:pointer;}
.vs-mclose:hover{color:#F0F0F5;}
.vs-mhint{color:#8080A0;font-size:13px;line-height:1.55;margin:0 0 16px;}
.vs-mok{color:#34D399;font-size:14.5px;margin:0 0 10px;}
.vs-merr{color:#FCA5A5;font-size:13px;margin:0 0 12px;}
.vs-mgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media(max-width:520px){.vs-mgrid{grid-template-columns:1fr;}}
.vs-mfield{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:600;color:#C0C0D0;margin-bottom:12px;}
.vs-mfield input,.vs-mfield textarea,.vs-mfield select{font-family:inherit;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;font-size:14px;outline:none;resize:vertical;}
.vs-mfield input:focus,.vs-mfield textarea:focus,.vs-mfield select:focus{border-color:var(--vsa);}
@media(max-width:560px){.vs-hero{flex-direction:column;align-items:flex-start;}.vs-tabs{top:52px;}}
`;
