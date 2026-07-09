'use client';

// Public marketplace — Amazon/Carvana-style industrial discovery.
// Left-rail smart filters, Products/Services/Solutions tabs, sort, clean cards
// with data-driven badges, save + compare (localStorage), and Request-Quote
// through NXT//LINK. FILTERS ARE DATA-DRIVEN: every facet value and badge is
// derived from real vendor-entered listing data — nothing is invented. If a
// field is empty, its badge/filter option does not appear.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface Card {
  id: string; vendor_id?: string; kind: 'product' | 'service'; name: string; category: string;
  overview: string | null; best_for: string[]; industries: string[];
  image_url: string | null; vendor_name: string; vendor_city: string | null;
  pilot: { available?: boolean } | null;
  pricing: { model?: string; range?: string } | null;
  warranty_support: { warranty?: string } | null;
  availability?: string[]; lead_time?: string | null; published_at?: string | null;
  service_areas?: string[]; response_time?: string | null; emergency_available?: boolean;
  pricing_model?: string | null;
  vendor_verified?: boolean; has_documents?: boolean; has_case_studies?: boolean;
  vendor_rating?: number | null; vendor_review_count?: number;
}

type Tab = 'all' | 'product' | 'service' | 'solution';
type Sort = 'best' | 'recent' | 'lead' | 'pilot' | 'verified';

const SORTS: Array<[Sort, string]> = [
  ['best', 'Best match'],
  ['recent', 'Recently added'],
  ['lead', 'Fastest response'],
  ['pilot', 'Pilot available first'],
  ['verified', 'Verified vendors first'],
];

// A few starting points for the Solutions tab (problem-first discovery). These
// set the search box; results still come only from real vendor data.
const PROBLEM_STARTERS = ['reduce labor', 'prevent cargo theft', 'improve safety', 'speed up picking', 'reduce downtime', 'warehouse automation'];

function useLocalSet(key: string): [Set<string>, (id: string) => void] {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { setSet(new Set(JSON.parse(localStorage.getItem(key) || '[]'))); } catch { /* ignore */ }
  }, [key]);
  const toggle = (id: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };
  return [set, toggle];
}

// ---- trust badge helpers (data-driven, no invented values) ----
const LOCAL_AREAS = ['el paso', 'juárez', 'juarez'];
function isLocal(c: Card): boolean {
  return (c.service_areas || []).some((a) => LOCAL_AREAS.includes(a.toLowerCase()));
}
function isFast(c: Card): boolean {
  const t = (c.kind === 'service' ? c.response_time : c.lead_time) || '';
  return /\b(hour|same[- ]?day|24\/7|immediate|in stock)\b/i.test(t);
}

// ---- ranking helpers ----
function qualityScore(c: Card): number {
  let n = 0;
  if (c.image_url) n += 2;
  if ((c.overview || '').length > 40) n += 2;
  if (c.best_for?.length) n += 1;
  if (c.industries?.length) n += 1;
  if (c.pilot?.available) n += 1;
  if (c.warranty_support?.warranty) n += 1;
  if (c.has_documents) n += 1;
  if (c.has_case_studies) n += 2;
  if (c.pricing?.range || c.pricing?.model || c.pricing_model) n += 1;
  if (c.vendor_verified) n += 2;
  if (c.lead_time || c.response_time) n += 1;
  return n; // 0..15
}
function relevance(c: Card, tokens: string[]): number {
  if (!tokens.length) return 0;
  const hay = {
    name: c.name.toLowerCase(), cat: c.category.toLowerCase(),
    best: c.best_for.join(' ').toLowerCase(), ind: c.industries.join(' ').toLowerCase(),
    ov: (c.overview || '').toLowerCase(),
  };
  let score = 0;
  for (const t of tokens) {
    if (hay.name.includes(t)) score += 5;
    if (hay.cat.includes(t)) score += 3;
    if (hay.best.includes(t)) score += 3;
    if (hay.ind.includes(t)) score += 2;
    if (hay.ov.includes(t)) score += 1;
  }
  return score;
}
function leadRank(c: Card): number {
  const t = (c.lead_time || c.response_time || '').toLowerCase();
  if (!t) return Number.POSITIVE_INFINITY;
  if (/same[- ]?day|immediate|in stock|24\/7|1 ?hour|hour/.test(t)) return 0;
  const m = t.match(/\d+/);
  if (!m) return 500;
  let n = parseInt(m[0], 10);
  if (/week/.test(t)) n *= 7;
  if (/month/.test(t)) n *= 30;
  return n;
}

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('best');
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false); // mobile filter drawer

  // selected facet filters (data-driven)
  const [fCategory, setFCategory] = useState('');
  const [fIndustry, setFIndustry] = useState('');
  const [fArea, setFArea] = useState('');
  const [fPricing, setFPricing] = useState('');
  const [fPilot, setFPilot] = useState(false);
  const [fWarranty, setFWarranty] = useState(false);
  const [fEmergency, setFEmergency] = useState(false);
  const [fVerified, setFVerified] = useState(false);
  const [fCases, setFCases] = useState(false);
  const [fLocal, setFLocal] = useState(false);
  const [fFast, setFFast] = useState(false);

  const [saved, toggleSaved] = useLocalSet('nxt_saved');
  const [compare, toggleCompare] = useLocalSet('nxt_compare');
  const [showCompare, setShowCompare] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  // Fetch the full published set once; all search/filter/sort is client-side so
  // facets always reflect real, available data.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/marketplace/listings');
        const data = await res.json();
        setCards(data.listings || []);
      } catch { setCards([]); }
      setLoading(false);
    })();
  }, []);

  const resetFilters = () => {
    setFCategory(''); setFIndustry(''); setFArea(''); setFPricing('');
    setFPilot(false); setFWarranty(false); setFEmergency(false); setFVerified(false); setFCases(false);
    setFLocal(false); setFFast(false);
  };

  // listings for the active tab (before facet/search filtering) — drives facets
  const tabCards = useMemo(() => {
    if (tab === 'product' || tab === 'service') return cards.filter((c) => c.kind === tab);
    return cards; // 'all' and 'solution' consider everything
  }, [cards, tab]);

  // Build facet option lists from REAL data only.
  const facets = useMemo(() => {
    const cat = new Set<string>(); const ind = new Set<string>(); const area = new Set<string>(); const price = new Set<string>();
    let anyPilot = false, anyWarranty = false, anyEmergency = false, anyVerified = false, anyCases = false, anyLocal = false, anyFast = false;
    for (const c of tabCards) {
      if (c.category) cat.add(c.category);
      c.industries?.forEach((i) => i && ind.add(i));
      c.service_areas?.forEach((a) => a && area.add(a));
      const pm = c.pricing?.model || c.pricing_model; if (pm) price.add(pm);
      if (c.pilot?.available) anyPilot = true;
      if (c.warranty_support?.warranty) anyWarranty = true;
      if (c.emergency_available) anyEmergency = true;
      if (c.vendor_verified) anyVerified = true;
      if (c.has_case_studies) anyCases = true;
      if (isLocal(c)) anyLocal = true;
      if (isFast(c)) anyFast = true;
    }
    const sortArr = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b));
    return {
      categories: sortArr(cat), industries: sortArr(ind), areas: sortArr(area), pricing: sortArr(price),
      anyPilot, anyWarranty, anyEmergency, anyVerified, anyCases, anyLocal, anyFast,
    };
  }, [tabCards]);

  const tokens = useMemo(() => q.toLowerCase().split(/\s+/).filter(Boolean), [q]);

  const results = useMemo(() => {
    let list = tabCards.filter((c) => {
      if (fCategory && c.category !== fCategory) return false;
      if (fIndustry && !(c.industries || []).includes(fIndustry)) return false;
      if (fArea && !(c.service_areas || []).includes(fArea)) return false;
      if (fPricing && (c.pricing?.model || c.pricing_model) !== fPricing) return false;
      if (fPilot && !c.pilot?.available) return false;
      if (fWarranty && !c.warranty_support?.warranty) return false;
      if (fEmergency && !c.emergency_available) return false;
      if (fVerified && !c.vendor_verified) return false;
      if (fCases && !c.has_case_studies) return false;
      if (fLocal && !isLocal(c)) return false;
      if (fFast && !isFast(c)) return false;
      if (savedOnly && !saved.has(c.id)) return false;
      if (tokens.length && relevance(c, tokens) === 0) return false;
      return true;
    });
    // ranking: 40% relevance, plus listing quality; simple, extensible.
    list = list.slice().sort((a, b) => {
      if (sort === 'recent') return (b.published_at || '').localeCompare(a.published_at || '');
      if (sort === 'lead') return leadRank(a) - leadRank(b);
      if (sort === 'pilot') return Number(Boolean(b.pilot?.available)) - Number(Boolean(a.pilot?.available)) || qualityScore(b) - qualityScore(a);
      if (sort === 'verified') return Number(Boolean(b.vendor_verified)) - Number(Boolean(a.vendor_verified)) || qualityScore(b) - qualityScore(a);
      // best match: relevance (weighted) + quality
      const sa = relevance(a, tokens) * 4 + qualityScore(a);
      const sb = relevance(b, tokens) * 4 + qualityScore(b);
      return sb - sa;
    });
    return list;
  }, [tabCards, fCategory, fIndustry, fArea, fPricing, fPilot, fWarranty, fEmergency, fVerified, fCases, fLocal, fFast, savedOnly, saved, tokens, sort]);

  const compareCards = useMemo(() => cards.filter((c) => compare.has(c.id)).slice(0, 5), [cards, compare]);
  const activeFilterCount = [fCategory, fIndustry, fArea, fPricing].filter(Boolean).length +
    [fPilot, fWarranty, fEmergency, fVerified, fCases, fLocal, fFast].filter(Boolean).length;
  const marketplaceEmpty = !loading && cards.length === 0;

  // Suggested related searches for empty states (from real category data).
  const suggestions = facets.categories.slice(0, 6);

  return (
    <div className="mk">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="mk-nav">
        <Link className="mk-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>Marketplace</span></Link>
        <div className="mk-navr">
          <button className={'mk-pill' + (savedOnly ? ' on' : '')} onClick={() => setSavedOnly((v) => !v)}>Saved ({saved.size})</button>
          <Link className="mk-pill" href="/buyer">My dashboard</Link>
          <Link className="mk-pill" href="/vendor-login">For vendors</Link>
        </div>
      </nav>

      {/* Search bar */}
      <div className="mk-searchbar">
        <div className="mk-searchwrap">
          <SearchIcon />
          <input
            className="mk-search"
            placeholder="Search products, services, or a problem — e.g. “forklift maintenance El Paso”, “reduce downtime”"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && <button className="mk-clearq" onClick={() => setQ('')} aria-label="Clear search">×</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="mk-tabsrow">
        <div className="mk-tabs">
          {([['all', 'Everything'], ['product', 'Products'], ['service', 'Services'], ['solution', 'Solutions']] as Array<[Tab, string]>).map(([k, label]) => (
            <button key={k} className={'mk-tab' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); resetFilters(); }}>{label}</button>
          ))}
        </div>
        <div className="mk-tabsr">
          <button className="mk-filterbtn" onClick={() => setDrawer(true)}>
            <FilterIcon /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
          <label className="mk-sort">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
      </div>

      {tab === 'solution' ? (
        <SolutionsPanel onPick={(p) => { setQ(p); setTab('all'); }} starters={PROBLEM_STARTERS} />
      ) : (
        <div className="mk-layout">
          {/* Left filter rail (desktop) + drawer (mobile) */}
          <aside className={'mk-rail' + (drawer ? ' open' : '')}>
            <div className="mk-railhead">
              <b>Filters</b>
              <div>
                {activeFilterCount > 0 && <button className="mk-clear" onClick={resetFilters}>Clear all</button>}
                <button className="mk-railclose" onClick={() => setDrawer(false)} aria-label="Close filters">Done</button>
              </div>
            </div>

            <FacetSelect label="Category" value={fCategory} onChange={setFCategory} options={facets.categories} />
            <FacetSelect label="Industry" value={fIndustry} onChange={setFIndustry} options={facets.industries} />
            {(tab !== 'product') && facets.areas.length > 0 && <FacetSelect label="Service area" value={fArea} onChange={setFArea} options={facets.areas} />}
            {facets.pricing.length > 0 && <FacetSelect label="Pricing model" value={fPricing} onChange={setFPricing} options={facets.pricing} />}

            {(facets.anyPilot || facets.anyWarranty || facets.anyEmergency || facets.anyVerified || facets.anyCases || facets.anyLocal || facets.anyFast) && (
              <div className="mk-facet">
                <div className="mk-facetlabel">Show only</div>
                {facets.anyPilot && <FacetCheck label="Pilot / demo available" checked={fPilot} onChange={setFPilot} />}
                {facets.anyWarranty && <FacetCheck label="Warranty / support" checked={fWarranty} onChange={setFWarranty} />}
                {facets.anyLocal && <FacetCheck label="Local support" checked={fLocal} onChange={setFLocal} />}
                {facets.anyFast && <FacetCheck label="Fast response / lead time" checked={fFast} onChange={setFFast} />}
                {facets.anyEmergency && <FacetCheck label="24/7 emergency" checked={fEmergency} onChange={setFEmergency} />}
                {facets.anyVerified && <FacetCheck label="Verified vendor" checked={fVerified} onChange={setFVerified} />}
                {facets.anyCases && <FacetCheck label="Has case studies" checked={fCases} onChange={setFCases} />}
              </div>
            )}
            <p className="mk-railnote">Filters reflect what vendors actually listed. Options with no data are hidden.</p>
          </aside>
          {drawer && <div className="mk-scrim" onClick={() => setDrawer(false)} />}

          {/* Results */}
          <main className="mk-results">
            <div className="mk-count">
              {loading ? 'Loading…' : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
              {q && !loading ? <> for <b>“{q}”</b></> : null}
            </div>

            {loading ? (
              <div className="mk-skeletons">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="mk-skel" />)}</div>
            ) : marketplaceEmpty ? (
              <EmptyMarketplace />
            ) : results.length === 0 ? (
              <NoResults q={q} savedOnly={savedOnly} suggestions={suggestions} onPick={setQ} onReset={() => { resetFilters(); setSavedOnly(false); }} />
            ) : (
              <div className="mk-grid">
                {results.map((c) => (
                  <ListingCard
                    key={c.id}
                    c={c}
                    saved={saved.has(c.id)}
                    inCompare={compare.has(c.id)}
                    onSave={() => toggleSaved(c.id)}
                    onCompare={() => toggleCompare(c.id)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      )}

      {/* Compare bar */}
      {compareCards.length > 0 && (
        <div className="mk-cbar">
          <span>{compareCards.length} to compare</span>
          <button className="mk-mini on" onClick={() => setShowCompare(true)} disabled={compareCards.length < 2}>Compare now</button>
          <button className="mk-mini" onClick={() => compareCards.forEach((c) => toggleCompare(c.id))}>Clear</button>
        </div>
      )}

      {showCompare && compareCards.length >= 2 && (
        <CompareModal cards={compareCards} onClose={() => setShowCompare(false)} />
      )}
    </div>
  );
}

// ---- sub-components ----
function ListingCard({ c, saved, inCompare, onSave, onCompare }: { c: Card; saved: boolean; inCompare: boolean; onSave: () => void; onCompare: () => void }) {
  return (
    <div className="mk-card">
      <Link href={`/marketplace/${c.kind}/${c.id}`} className="mk-card-img">
        {c.image_url ? <img src={c.image_url} alt={c.name} /> : <div className="mk-noimg">{c.kind === 'product' ? 'Product' : 'Service'}</div>}
      </Link>
      <div className="mk-card-body">
        <div className="mk-kindrow">
          <span className={'mk-kind ' + c.kind}>{c.kind}</span>
          {c.vendor_verified && <span className="mk-badge trust">Verified</span>}
          {c.pilot?.available && <span className="mk-badge">Pilot</span>}
          {c.warranty_support?.warranty && <span className="mk-badge">Warranty</span>}
          {c.has_case_studies && <span className="mk-badge">Case study</span>}
          {c.has_documents && <span className="mk-badge">Docs</span>}
          {isLocal(c) && <span className="mk-badge">Local support</span>}
          {isFast(c) && <span className="mk-badge">Fast {c.kind === 'service' ? 'response' : 'lead time'}</span>}
          {c.emergency_available && <span className="mk-badge urgent">24/7</span>}
        </div>
        <Link href={`/marketplace/${c.kind}/${c.id}`} className="mk-name">{c.name}</Link>
        <div className="mk-vendor">
          {c.vendor_id ? <Link href={`/marketplace/vendor/${c.vendor_id}`} className="mk-vlink">{c.vendor_name}</Link> : c.vendor_name}
          {c.vendor_city ? ` · ${c.vendor_city}` : ''}
          {typeof c.vendor_rating === 'number' && (c.vendor_review_count || 0) > 0 && (
            <span className="mk-rating">★ {c.vendor_rating.toFixed(1)} <small>({c.vendor_review_count})</small></span>
          )}
        </div>
        {c.best_for.length > 0 && <div className="mk-tags">{c.best_for.slice(0, 3).map((t) => <span key={t}>{t}</span>)}</div>}
        <div className="mk-meta">
          {c.kind === 'product' && c.lead_time && <span>Lead time: {c.lead_time}</span>}
          {c.kind === 'service' && c.response_time && <span>Response: {c.response_time}</span>}
          {(c.pricing?.range || c.pricing?.model || c.pricing_model) && <span>{c.pricing?.range || c.pricing?.model || c.pricing_model}</span>}
        </div>
        <div className="mk-actions">
          <button className={'mk-mini' + (saved ? ' on' : '')} onClick={onSave}>{saved ? 'Saved' : 'Save'}</button>
          <button className={'mk-mini' + (inCompare ? ' on' : '')} onClick={onCompare}>{inCompare ? 'In compare' : 'Compare'}</button>
          <Link className="mk-quote" href={`/marketplace/${c.kind}/${c.id}#quote`}>Request quote</Link>
        </div>
      </div>
    </div>
  );
}

function FacetSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  if (options.length === 0) return null;
  return (
    <div className="mk-facet">
      <label className="mk-facetlabel">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function FacetCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mk-facetcheck">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

function SolutionsPanel({ onPick, starters }: { onPick: (p: string) => void; starters: string[] }) {
  return (
    <div className="mk-solutions">
      <h2>Describe the outcome you need</h2>
      <p>Solutions bundle the right products and services for a goal. Tell NXT//LINK the problem and we build a comparable shortlist — or start from a common goal below.</p>
      <div className="mk-starters">
        {starters.map((s) => <button key={s} onClick={() => onPick(s)}>{s}</button>)}
      </div>
      <Link className="mk-asknxt" href="/intake">Describe your project → get an NXT//LINK shortlist</Link>
    </div>
  );
}

function EmptyMarketplace() {
  return (
    <div className="mk-empty big">
      <b>No published listings yet</b>
      <p>Vendors are still building their storefronts. Check back soon, or tell NXT//LINK what you need and we&apos;ll source it.</p>
      <div className="mk-emptyactions">
        <Link className="mk-quote" href="/intake">Ask NXT//LINK to find it</Link>
        <Link className="mk-mini" href="/vendor-login">Are you a vendor? List here</Link>
      </div>
    </div>
  );
}

function NoResults({ q, savedOnly, suggestions, onPick, onReset }: { q: string; savedOnly: boolean; suggestions: string[]; onPick: (v: string) => void; onReset: () => void }) {
  return (
    <div className="mk-empty big">
      <b>No matches{q ? ` for “${q}”` : ''}</b>
      <p>{savedOnly ? 'Nothing saved matches these filters.' : 'Try fewer filters, or explore these:'}</p>
      {suggestions.length > 0 && (
        <div className="mk-starters">
          {suggestions.map((s) => <button key={s} onClick={() => { onReset(); onPick(s); }}>{s}</button>)}
        </div>
      )}
      <div className="mk-emptyactions">
        <button className="mk-mini" onClick={onReset}>Clear filters</button>
        <Link className="mk-quote" href="/intake">Ask NXT//LINK to find it</Link>
      </div>
    </div>
  );
}

function CompareModal({ cards, onClose }: { cards: Card[]; onClose: () => void }) {
  const rows: Array<[string, (c: Card) => string]> = [
    ['Vendor', (c) => c.vendor_name],
    ['Type', (c) => c.kind],
    ['Category', (c) => c.category || '—'],
    ['Best for', (c) => c.best_for.join(', ') || '—'],
    ['Industries', (c) => c.industries.join(', ') || '—'],
    ['Pilot / demo', (c) => (c.pilot?.available ? 'Available' : '—')],
    ['Lead / response', (c) => c.lead_time || c.response_time || '—'],
    ['Pricing', (c) => c.pricing?.range || c.pricing?.model || c.pricing_model || 'Request quote'],
    ['Warranty', (c) => c.warranty_support?.warranty || '—'],
    ['Service area', (c) => (c.service_areas || []).join(', ') || '—'],
    ['Case studies', (c) => (c.has_case_studies ? 'Yes' : '—')],
    ['Documents', (c) => (c.has_documents ? 'Yes' : '—')],
    ['Verified', (c) => (c.vendor_verified ? 'Yes' : '—')],
  ];
  return (
    <div className="mk-modal" onClick={onClose}>
      <div className="mk-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="mk-modal-head"><b>Compare {cards.length} listings</b><button onClick={onClose}>Close</button></div>
        <div className="mk-ctable-wrap">
          <table className="mk-ctable">
            <thead><tr><th></th>{cards.map((c) => <th key={c.id}><Link href={`/marketplace/${c.kind}/${c.id}`}>{c.name}</Link></th>)}</tr></thead>
            <tbody>
              {rows.map(([label, get]) => (
                <tr key={label}><td>{label}</td>{cards.map((c) => <td key={c.id}>{get(c)}</td>)}</tr>
              ))}
              <tr><td></td>{cards.map((c) => <td key={c.id}><Link className="mk-quote" href={`/marketplace/${c.kind}/${c.id}#quote`}>Request quote</Link></td>)}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return <svg className="mk-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
}
function FilterIcon() {
  return <svg className="mk-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.mk{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.mk *{box-sizing:border-box;}
.mk-icon{flex-shrink:0;}
.mk-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);z-index:30;}
.mk-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.mk-brand b{font-size:17px;}.mk-brand i{color:#A78BFA;font-style:normal;}
.mk-brand span{color:#8080A0;font-size:13px;}
.mk-navr{display:flex;gap:8px;flex-wrap:wrap;}
.mk-pill{font-family:inherit;font-size:13px;font-weight:500;color:#C0C0D0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:8px 14px;cursor:pointer;text-decoration:none;white-space:nowrap;}
.mk-pill.on{background:rgba(124,92,252,.15);border-color:#7C5CFC;color:#C4B5FD;}
.mk-searchbar{padding:22px 20px 6px;max-width:1200px;margin:0 auto;}
.mk-searchwrap{display:flex;align-items:center;gap:10px;background:#14141F;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:0 16px;color:#8080A0;transition:border-color .15s;}
.mk-searchwrap:focus-within{border-color:#7C5CFC;box-shadow:0 0 0 3px rgba(124,92,252,.15);}
.mk-search{flex:1;padding:15px 4px;font-family:inherit;font-size:15px;border:none;background:none;color:#F0F0F5;outline:none;}
.mk-clearq{background:none;border:none;color:#8080A0;font-size:22px;line-height:1;cursor:pointer;padding:0 4px;}
.mk-tabsrow{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;max-width:1200px;margin:0 auto;padding:12px 20px;}
.mk-tabs{display:flex;background:#14141F;border:1px solid rgba(255,255,255,.1);border-radius:11px;overflow:hidden;}
.mk-tab{font-family:inherit;font-size:13.5px;font-weight:600;padding:10px 18px;background:none;border:none;color:#8080A0;cursor:pointer;white-space:nowrap;}
.mk-tab.on{background:#7C5CFC;color:#fff;}
.mk-tabsr{display:flex;align-items:center;gap:10px;}
.mk-filterbtn{display:none;align-items:center;gap:6px;font-family:inherit;font-size:13px;font-weight:600;color:#C0C0D0;background:#14141F;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 13px;cursor:pointer;}
.mk-sort{display:flex;align-items:center;gap:7px;font-size:13px;color:#8080A0;}
.mk-sort select{font-family:inherit;font-size:13px;padding:9px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#14141F;color:#C0C0D0;outline:none;cursor:pointer;}
.mk-layout{display:grid;grid-template-columns:250px 1fr;gap:24px;max-width:1200px;margin:0 auto;padding:8px 20px 120px;align-items:start;}
.mk-rail{position:sticky;top:78px;display:flex;flex-direction:column;gap:16px;background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px;}
.mk-railhead{display:flex;justify-content:space-between;align-items:center;}
.mk-railhead b{font-size:15px;}
.mk-railhead>div{display:flex;gap:8px;align-items:center;}
.mk-clear{background:none;border:none;color:#A78BFA;font:inherit;font-size:12.5px;cursor:pointer;}
.mk-railclose{display:none;background:#7C5CFC;border:none;color:#fff;font:inherit;font-size:13px;font-weight:600;border-radius:9px;padding:7px 14px;cursor:pointer;}
.mk-facet{display:flex;flex-direction:column;gap:7px;}
.mk-facetlabel{font-size:12px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:#8080A0;}
.mk-facet select{font-family:inherit;font-size:13.5px;padding:10px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#D5D4E0;outline:none;}
.mk-facet select:focus{border-color:#7C5CFC;}
.mk-facetcheck{display:flex;align-items:center;gap:9px;font-size:13.5px;color:#C0C0D0;cursor:pointer;padding:3px 0;}
.mk-facetcheck input{accent-color:#7C5CFC;width:15px;height:15px;}
.mk-railnote{font-size:11.5px;color:#5A5A70;line-height:1.5;margin:2px 0 0;}
.mk-results{min-width:0;}
.mk-count{font-size:13.5px;color:#8080A0;margin:4px 2px 16px;}
.mk-count b{color:#C4B5FD;}
.mk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.mk-card{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .15s,transform .15s;}
.mk-card:hover{border-color:rgba(124,92,252,.5);transform:translateY(-2px);}
.mk-card-img{display:block;height:150px;background:#0E0E16;}
.mk-card-img img{width:100%;height:100%;object-fit:cover;}
.mk-noimg{height:100%;display:grid;place-items:center;color:#505068;font-size:13px;letter-spacing:.15em;text-transform:uppercase;}
.mk-card-body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:7px;flex:1;}
.mk-kindrow{display:flex;flex-wrap:wrap;gap:6px;}
.mk-kind{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:99px;}
.mk-kind.product{background:rgba(124,92,252,.15);color:#C4B5FD;}
.mk-kind.service{background:rgba(52,211,153,.12);color:#34D399;}
.mk-badge{font-size:10px;font-weight:600;padding:3px 8px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;}
.mk-badge.urgent{background:rgba(251,191,36,.12);color:#FBBF24;}
.mk-badge.trust{background:rgba(52,211,153,.12);color:#34D399;}
.mk-name{font-size:15.5px;font-weight:700;color:#F0F0F5;text-decoration:none;line-height:1.3;}
.mk-name:hover{color:#C4B5FD;}
.mk-vendor{font-size:12.5px;color:#8080A0;}
.mk-vlink{color:#A0A0B8;text-decoration:none;font-weight:600;}
.mk-vlink:hover{color:#C4B5FD;text-decoration:underline;}
.mk-rating{margin-left:8px;color:#FBBF24;font-weight:600;white-space:nowrap;}
.mk-rating small{color:#8080A0;font-weight:400;}
.mk-tags{display:flex;flex-wrap:wrap;gap:5px;}
.mk-tags span{font-size:11px;color:#A78BFA;background:rgba(124,92,252,.08);padding:3px 8px;border-radius:6px;}
.mk-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:#8080A0;margin-top:auto;padding-top:4px;}
.mk-actions{display:flex;gap:8px;margin-top:10px;align-items:center;}
.mk-mini{font-family:inherit;font-size:12px;font-weight:600;padding:8px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:none;color:#C0C0D0;cursor:pointer;text-decoration:none;}
.mk-mini.on{border-color:#7C5CFC;color:#C4B5FD;background:rgba(124,92,252,.1);}
.mk-mini:disabled{opacity:.5;}
.mk-quote{margin-left:auto;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:9px;background:#7C5CFC;color:#fff;text-decoration:none;white-space:nowrap;}
.mk-quote:hover{background:#6344DF;}
.mk-skeletons{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.mk-skel{height:290px;border-radius:16px;background:linear-gradient(100deg,#12121B 30%,#1A1A28 50%,#12121B 70%);background-size:200% 100%;animation:mkpulse 1.3s ease-in-out infinite;}
@keyframes mkpulse{0%{background-position:100% 0;}100%{background-position:-100% 0;}}
.mk-empty{text-align:center;color:#8080A0;padding:50px 0;}
.mk-empty.big{background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:48px 24px;}
.mk-empty b{display:block;font-size:18px;color:#F0F0F5;margin-bottom:8px;}
.mk-empty p{font-size:14px;line-height:1.6;max-width:420px;margin:0 auto 18px;}
.mk-emptyactions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
.mk-starters{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:18px;}
.mk-starters button{font-family:inherit;font-size:13px;color:#C4B5FD;background:rgba(124,92,252,.1);border:1px solid rgba(124,92,252,.3);border-radius:99px;padding:8px 14px;cursor:pointer;}
.mk-starters button:hover{background:rgba(124,92,252,.2);}
.mk-solutions{max-width:720px;margin:10px auto;padding:44px 24px 120px;text-align:center;}
.mk-solutions h2{font-size:24px;font-weight:800;letter-spacing:-.02em;}
.mk-solutions p{color:#8080A0;font-size:15px;line-height:1.6;margin:12px auto 24px;max-width:560px;}
.mk-asknxt{display:inline-block;margin-top:8px;font-size:14.5px;font-weight:700;padding:13px 22px;border-radius:12px;background:#7C5CFC;color:#fff;text-decoration:none;}
.mk-asknxt:hover{background:#6344DF;}
.mk-scrim{display:none;}
.mk-cbar{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;background:#1A1A28;border:1px solid rgba(124,92,252,.4);border-radius:14px;padding:12px 18px;font-size:13.5px;z-index:35;box-shadow:0 10px 40px rgba(0,0,0,.5);}
.mk-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;z-index:40;padding:20px;}
.mk-modal-in{background:#14141F;border:1px solid rgba(255,255,255,.1);border-radius:18px;max-width:960px;width:100%;max-height:82vh;overflow:auto;padding:22px;}
.mk-modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
.mk-modal-head button{font-family:inherit;background:none;border:1px solid rgba(255,255,255,.12);color:#C0C0D0;border-radius:9px;padding:7px 12px;cursor:pointer;}
.mk-ctable-wrap{overflow-x:auto;}
.mk-ctable{width:100%;border-collapse:collapse;font-size:13.5px;}
.mk-ctable th,.mk-ctable td{text-align:left;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.07);vertical-align:top;}
.mk-ctable th a{color:#C4B5FD;text-decoration:none;}
.mk-ctable td:first-child{color:#8080A0;white-space:nowrap;}
@media(max-width:860px){
  .mk-layout{grid-template-columns:1fr;}
  .mk-filterbtn{display:inline-flex;}
  .mk-rail{position:fixed;top:0;left:0;bottom:0;width:300px;max-width:88vw;z-index:50;border-radius:0;transform:translateX(-105%);transition:transform .22s ease;overflow-y:auto;}
  .mk-rail.open{transform:translateX(0);}
  .mk-railclose{display:inline-block;}
  .mk-scrim{display:block;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:45;}
}
`;
