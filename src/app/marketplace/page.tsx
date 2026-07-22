'use client';

// Public marketplace — Amazon/Carvana-style industrial discovery.
// Left-rail smart filters, Products/Services/Solutions tabs, sort, clean cards
// with data-driven badges, save + compare (localStorage), and Request-Quote
// through NXT//LINK. FILTERS ARE DATA-DRIVEN: every facet value and badge is
// derived from real vendor-entered listing data — nothing is invented. If a
// field is empty, its badge/filter option does not appear.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { IBM_Plex_Sans } from 'next/font/google';
import { levelAtLeast } from '@/components/marketplace/TrustBadges';
import AddToCartButton from '@/components/cart/AddToCartButton';
import { useLang } from '@/components/LanguageToggle';
import PublicHeader from '@/components/PublicHeader';

// Design System v1.0 body font (Space Grotesk for headings is already
// loaded app-wide in layout.tsx) — scoped to this page only, matching the
// pattern already used on / and /intake.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-marketplace',
  display: 'swap',
});

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
  vendor_verified?: boolean; vendor_verification_level?: string | null;
  has_documents?: boolean; has_case_studies?: boolean;
  vendor_rating?: number | null; vendor_review_count?: number;
  functional_group?: string | null;
}

interface Department { fg: string; label_en: string; is_service: boolean }

// Price ranges make buyers anchor on the TOP number ("$13–17" reads as "$17").
// Show the floor with a "From" instead; the quote settles the real number.
function fromPrice(raw?: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^\s*(\$?\s?\d[\d,.]*\s*k?)\s*(?:-|–|—|to)\s*\$?\s?\d[\d,.]*\s*k?(.*)$/i);
  if (!m) return raw;
  const tail = (m[2] || '').trim();
  return `From ${m[1].trim()}${tail ? ` ${tail}` : ''} · final in quote`;
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

function useLocalSet(key: string): [Set<string>, (id: string) => void, (ids: string[]) => void] {
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
  const addAll = (ids: string[]) => {
    if (!ids.length) return;
    setSet((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => next.add(i));
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };
  return [set, toggle, addAll];
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
  const [lang, setLang] = useLang(); // feeds the shared PublicHeader's language toggle
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('best');
  const [suggests, setSuggests] = useState<Array<{ label: string; type: string }>>([]);
  const [showSug, setShowSug] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false); // mobile filter drawer

  // Departments (functional groups) for the "Browse by department" row.
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fDept, setFDept] = useState('');

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

  const [saved, toggleSaved, addAllSaved] = useLocalSet('nxt_saved');
  const [compare, toggleCompare] = useLocalSet('nxt_compare');
  const [savedSynced, setSavedSynced] = useState(false);

  // Signed-in buyers: saves follow the account across devices. Merge server
  // saves in on load; sync every save/unsave back to the account.
  useEffect(() => {
    (async () => {
      try {
        const d = await fetch('/api/buyer/saved').then((r) => r.json());
        if (d?.signed_in) {
          setSavedSynced(true);
          addAllSaved((d.items || []).map((i: { listing_id: string }) => i.listing_id));
        }
      } catch { /* anonymous — localStorage only */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function handleSaveToggle(c: Card) {
    const nowSaved = !saved.has(c.id);
    toggleSaved(c.id);
    if (savedSynced) {
      fetch('/api/buyer/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listing_id: c.id, kind: c.kind, saved: nowSaved }) }).catch(() => {});
    }
  }
  const [showCompare, setShowCompare] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Shareable URLs: read ?q= and ?tab= on load, keep them in sync after.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q0 = sp.get('q'); const t0 = sp.get('tab'); const d0 = sp.get('department');
    if (q0) setQ(q0);
    if (t0 === 'product' || t0 === 'service' || t0 === 'solution') setTab(t0);
    // Category tiles (landing page + "Shop by department") link here with
    // ?department=<functional_group> — pick it up so the tile isn't a dead link.
    if (d0) setFDept(d0);
    // The homepage's Alibaba-style attribute chips (2026-07-22) link here with
    // one of these =1 so the facet is already ticked on arrival instead of
    // dumping the visitor on an unfiltered page — additive only, seeds the
    // SAME facet state the checkboxes below already set; absent params leave
    // behavior byte-identical to today.
    if (sp.get('verified') === '1') setFVerified(true);
    if (sp.get('local') === '1') setFLocal(true);
    if (sp.get('fast') === '1') setFFast(true);
    if (sp.get('emergency') === '1') setFEmergency(true);
    if (sp.get('cases') === '1') setFCases(true);
    // Autofocus search on desktop only (avoid popping the mobile keyboard).
    if (window.innerWidth > 860) searchRef.current?.focus();
  }, []);
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (tab !== 'all') sp.set('tab', tab);
    const qs = sp.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    document.title = q.trim() ? `${q.trim()} — NXT//LINK Marketplace` : 'Marketplace — NXT//LINK';
  }, [q, tab]);
  // Search autocomplete — debounced suggestions tagged product / service / category.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setSuggests([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/marketplace/suggest?q=${encodeURIComponent(term)}`);
        const j = await r.json();
        setSuggests(j.ok ? (j.suggestions || []) : []);
      } catch { setSuggests([]); }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);
  // Escape closes the mobile filter drawer.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  // Fetch the full published set once; all search/filter/sort is client-side so
  // facets always reflect real, available data.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [lRes, cRes] = await Promise.all([
          fetch('/api/marketplace/listings'),
          fetch('/api/marketplace/categories'),
        ]);
        const data = await lRes.json();
        setCards(data.listings || []);
        try {
          const cat = await cRes.json();
          setDepartments((cat.departments || []).map((d: { fg: string; label_en: string; is_service: boolean }) => ({ fg: d.fg, label_en: d.label_en, is_service: d.is_service })));
        } catch { /* departments optional */ }
      } catch { setCards([]); }
      setLoading(false);
    })();
  }, []);

  const resetFilters = () => {
    setFDept(''); setFCategory(''); setFIndustry(''); setFArea(''); setFPricing('');
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
      if (fDept && c.functional_group !== fDept) return false;
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
  }, [tabCards, fDept, fCategory, fIndustry, fArea, fPricing, fPilot, fWarranty, fEmergency, fVerified, fCases, fLocal, fFast, savedOnly, saved, tokens, sort]);

  // Which departments actually have listings (so we never show an empty aisle).
  const deptCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) if (c.functional_group) m.set(c.functional_group, (m.get(c.functional_group) || 0) + 1);
    return m;
  }, [cards]);
  const liveDepartments = useMemo(() => departments.filter((d) => deptCounts.has(d.fg)), [departments, deptCounts]);

  const compareCards = useMemo(() => cards.filter((c) => compare.has(c.id)).slice(0, 5), [cards, compare]);
  const activeFilterCount = [fDept, fCategory, fIndustry, fArea, fPricing].filter(Boolean).length +
    [fPilot, fWarranty, fEmergency, fVerified, fCases, fLocal, fFast].filter(Boolean).length;
  const marketplaceEmpty = !loading && cards.length === 0;

  // "Storefront" home state: nothing searched or filtered yet → show discovery
  // sections (category tiles, vendors, post-a-need banner) above the listings.
  const pristine = !q.trim() && tab === 'all' && activeFilterCount === 0 && !savedOnly;
  const homeCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cards) if (c.category) counts.set(c.category, (counts.get(c.category) || 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [cards]);
  const homeVendors = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; rating: number | null; count: number }>();
    for (const c of cards) {
      if (!c.vendor_id) continue;
      const v = seen.get(c.vendor_id) || { id: c.vendor_id, name: c.vendor_name, rating: c.vendor_rating ?? null, count: 0 };
      v.count++;
      seen.set(c.vendor_id, v);
    }
    return Array.from(seen.values()).slice(0, 6);
  }, [cards]);

  // Suggested related searches for empty states (from real category data).
  const suggestions = facets.categories.slice(0, 6);

  return (
    <div className={`mk ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* ONE shared public header (Flow Blueprint 2026-07-22 §4, Slice 2) —
          replaces this page's old dark `mk-nav`. "Saved"/"My dashboard"/
          "For vendors" are page-specific utility links (not part of the
          shared header's spec'd content), so they move to a slim secondary
          row directly underneath instead of being dropped. */}
      <PublicHeader lang={lang} onLangChange={setLang} />
      <div className="mk-subnav">
        <button className={'mk-pill' + (savedOnly ? ' on' : '')} onClick={() => setSavedOnly((v) => !v)}>Saved ({saved.size})</button>
        <Link className="mk-pill" href="/buyer">My dashboard</Link>
        <Link className="mk-pill" href="/vendor-login">For vendors</Link>
      </div>

      {/* Storefront hero (home state only) */}
      {pristine && !loading && (
        <div className="mk-hero">
          <h1>The industrial supply chain marketplace</h1>
          <p>Technology, hardware, equipment, and services for warehouses, manufacturers, and logistics — discover, compare, request quotes, pilot, and close the deal through NXT{'//'}LINK.</p>
        </div>
      )}

      {/* Search bar */}
      <div className="mk-searchbar">
        <div className="mk-searchwrap">
          <SearchIcon />
          <input
            ref={searchRef}
            className="mk-search"
            placeholder="Search products, services, or a problem — e.g. “forklift maintenance El Paso”, “reduce downtime”"
            value={q}
            onChange={(e) => { setQ(e.target.value); setShowSug(true); }}
            onFocus={() => setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowSug(false); }}
            role="combobox"
            aria-expanded={showSug && suggests.length > 0}
            aria-controls="mk-suggest"
            autoComplete="off"
          />
          {q && <button className="mk-clearq" onClick={() => { setQ(''); setSuggests([]); }} aria-label="Clear search">×</button>}
          {showSug && suggests.length > 0 && (
            <ul className="mk-suggest" id="mk-suggest" role="listbox">
              {suggests.map((s) => (
                <li key={`${s.type}:${s.label}`} role="option" aria-selected="false">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setQ(s.label); setShowSug(false); if (s.type === 'product' || s.type === 'service') setTab(s.type); }}
                  >
                    <SearchIcon />
                    <span className="mk-sglabel">{s.label}</span>
                    <span className={`mk-sgtag t-${s.type}`}>{s.type === 'product' ? 'Product' : s.type === 'service' ? 'Service' : 'Category'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Browse by department — the primary functional aisles (Grainger/Amazon style) */}
      {liveDepartments.length > 0 && (
        <div className="mk-deptbar">
          <button className={`mk-dept ${!fDept ? 'on' : ''}`} onClick={() => setFDept('')}>All departments</button>
          {liveDepartments.map((d) => (
            <button key={d.fg} className={`mk-dept ${fDept === d.fg ? 'on' : ''} ${d.is_service ? 'svc' : ''}`}
              onClick={() => setFDept(fDept === d.fg ? '' : d.fg)}>
              {d.label_en}<span className="mk-deptn">{deptCounts.get(d.fg)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Storefront discovery sections (home state only) */}
      {pristine && !loading && cards.length > 0 && (
        <div className="mk-home">
          {homeCategories.length > 0 && (
            <section className="mk-homesec">
              <h2>Browse by category</h2>
              <div className="mk-cattiles">
                {homeCategories.map(([cat, n]) => (
                  <button key={cat} className="mk-cattile" onClick={() => setFCategory(cat)}>
                    <span className="mk-catinit">{cat.slice(0, 1).toUpperCase()}</span>
                    <b>{cat}</b>
                    <small>{n} listing{n === 1 ? '' : 's'}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="mk-rfq">
            <div>
              <b>Can&apos;t find what you need?</b>
              <p>Describe your problem once — NXT{'//'}LINK matches vendors and they quote you through the platform.</p>
            </div>
            <Link href="/intake" className="mk-rfqbtn">Post a request</Link>
          </section>

          {homeVendors.length > 0 && (
            <section className="mk-homesec">
              <h2>Featured vendors</h2>
              <div className="mk-vstrip">
                {homeVendors.map((v) => (
                  <Link key={v.id} href={`/marketplace/vendor/${v.id}`} className="mk-vtile">
                    <span className="mk-catinit">{v.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <b>{v.name}</b>
                      <small>
                        {typeof v.rating === 'number' ? `★ ${v.rating.toFixed(1)} · ` : ''}{v.count} listing{v.count === 1 ? '' : 's'}
                      </small>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <h2 className="mk-allhead">All listings</h2>
        </div>
      )}

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
              {loading ? 'Loading…' : `${results.length} ${tab === 'product' ? (results.length === 1 ? 'product' : 'products') : tab === 'service' ? (results.length === 1 ? 'service' : 'services') : (results.length === 1 ? 'result' : 'results')}`}
              {q && !loading ? <> for <b>“{q}”</b></> : null}
            </div>
            {activeFilterCount > 0 && (
              <div className="mk-activechips">
                {fCategory && <button onClick={() => setFCategory('')}>{fCategory} ✕</button>}
                {fIndustry && <button onClick={() => setFIndustry('')}>{fIndustry} ✕</button>}
                {fArea && <button onClick={() => setFArea('')}>{fArea} ✕</button>}
                {fPricing && <button onClick={() => setFPricing('')}>{fPricing} ✕</button>}
                {fPilot && <button onClick={() => setFPilot(false)}>Pilot ✕</button>}
                {fWarranty && <button onClick={() => setFWarranty(false)}>Warranty ✕</button>}
                {fLocal && <button onClick={() => setFLocal(false)}>Local support ✕</button>}
                {fFast && <button onClick={() => setFFast(false)}>Fast ✕</button>}
                {fEmergency && <button onClick={() => setFEmergency(false)}>24/7 ✕</button>}
                {fVerified && <button onClick={() => setFVerified(false)}>Verified ✕</button>}
                {fCases && <button onClick={() => setFCases(false)}>Case studies ✕</button>}
                <button className="all" onClick={resetFilters}>Clear all</button>
              </div>
            )}

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
                    onSave={() => handleSaveToggle(c)}
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
          <span className="mk-cnames" title={compareCards.map((c) => c.name).join(' · ')}>
            <b>{compareCards.length}</b> to compare: {compareCards.map((c) => c.name).join(' · ').slice(0, 70)}{compareCards.map((c) => c.name).join(' · ').length > 70 ? '…' : ''}
          </span>
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
        {c.image_url ? <img src={c.image_url} alt={c.name} loading="lazy" /> : <div className="mk-noimg">{c.kind === 'product' ? 'Product' : 'Service'}</div>}
      </Link>
      <div className="mk-card-body">
        <div className="mk-kindrow">
          <span className={'mk-kind ' + c.kind}>{c.kind}</span>
          {levelAtLeast(c.vendor_verification_level, 'identity_verified')
            ? <span className="mk-badge trust" title="This vendor's owner identity was verified by NXT//LINK">Verified identity</span>
            : c.vendor_verified && <span className="mk-badge trust" title="This vendor's business was reviewed and approved by NXT//LINK">Verified</span>}
          {levelAtLeast(c.vendor_verification_level, 'insurance_reviewed') && <span className="mk-badge trust" title="Proof of insurance on file with NXT//LINK">Insured</span>}
          {levelAtLeast(c.vendor_verification_level, 'certifications_reviewed') && <span className="mk-badge cert" title="Industry certifications reviewed by NXT//LINK">Certified</span>}
          {c.pilot?.available && <span className="mk-badge" title="You can test this before buying (pilot/demo available)">Pilot</span>}
          {c.warranty_support?.warranty && <span className="mk-badge" title="Warranty details provided by the vendor">Warranty</span>}
          {c.has_case_studies && <span className="mk-badge" title="Real customer results documented">Case study</span>}
          {c.has_documents && <span className="mk-badge" title="Spec sheets / brochures attached">Docs</span>}
          {isLocal(c) && <span className="mk-badge" title="Serves El Paso / Juárez locally">Local support</span>}
          {isFast(c) && <span className="mk-badge" title="Fast turnaround stated by the vendor">Fast {c.kind === 'service' ? 'response' : 'lead time'}</span>}
          {c.emergency_available && <span className="mk-badge urgent" title="24/7 emergency service available">24/7</span>}
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
          {(c.pricing?.range || c.pricing?.model || c.pricing_model) && <span>{c.pricing?.range ? fromPrice(c.pricing.range) : (c.pricing?.model || c.pricing_model)}</span>}
        </div>
        <div className="mk-actions">
          <button className={'mk-mini' + (saved ? ' on' : '')} onClick={onSave}>{saved ? 'Saved' : 'Save'}</button>
          <button className={'mk-mini' + (inCompare ? ' on' : '')} onClick={onCompare}>{inCompare ? 'In compare' : 'Compare'}</button>
          <AddToCartButton
            listing={{ id: c.id, kind: c.kind, name: c.name, vendor_id: c.vendor_id || null, vendor_name: c.vendor_name || null }}
            className="mk-mini"
            activeClassName="on"
          />
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
.mk{min-height:100vh;background:var(--spec-warm-white);color:var(--spec-ink);font-family:var(--font-ibm-plex-sans-marketplace),'IBM Plex Sans',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.mk *{box-sizing:border-box;}
.mk h1,.mk h2,.mk h3{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;}
.mk-icon{flex-shrink:0;}
.mk-subnav{display:flex;gap:8px;flex-wrap:wrap;padding:12px 26px;border-bottom:1px solid var(--spec-border);background:#fff;}
.mk-pill{font-family:inherit;font-size:13px;font-weight:600;color:var(--spec-text-2nd);background:var(--spec-warm-white);border:1px solid var(--spec-border);border-radius:99px;padding:8px 14px;cursor:pointer;text-decoration:none;white-space:nowrap;}
.mk-pill.on{background:rgba(108,92,224,.12);border-color:var(--spec-violet);color:var(--spec-violet-deep);}
.mk-hero{max-width:1200px;margin:0 auto;padding:36px 20px 0;text-align:center;}
.mk-hero h1{font-size:clamp(24px,4vw,38px);font-weight:800;letter-spacing:-.02em;color:var(--spec-ink);}
.mk-hero p{color:var(--spec-text-2nd);font-size:15px;margin:10px auto 0;max-width:560px;line-height:1.6;}
.mk-home{max-width:1200px;margin:0 auto;padding:8px 20px 0;}
.mk-homesec h2,.mk-allhead{font-size:17px;font-weight:800;letter-spacing:-.01em;margin:26px 0 14px;color:var(--spec-ink);}
.mk-cattiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;}
.mk-cattile{font-family:inherit;text-align:left;display:flex;flex-direction:column;gap:6px;background:#fff;border:1px solid var(--spec-border);border-radius:14px;padding:16px;cursor:pointer;color:var(--spec-ink);transition:border-color .15s,transform .15s;}
.mk-cattile:hover{border-color:var(--spec-violet);transform:translateY(-2px);}
.mk-cattile b{font-size:14px;line-height:1.3;}
.mk-cattile small{color:var(--spec-text-2nd);font-size:12px;}
.mk-catinit{width:34px;height:34px;border-radius:10px;background:rgba(108,92,224,.14);color:var(--spec-violet-deep);display:grid;place-items:center;font-weight:800;font-size:15px;}
.mk-rfq{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;background:linear-gradient(120deg,rgba(108,92,224,.1),rgba(47,158,106,.07));border:1px solid rgba(108,92,224,.3);border-radius:16px;padding:20px 22px;margin-top:26px;}
.mk-rfq b{font-size:16.5px;color:var(--spec-ink);}
.mk-rfq p{color:var(--spec-text-2nd);font-size:13.5px;margin:5px 0 0;line-height:1.5;max-width:520px;}
.mk-rfqbtn{background:var(--spec-violet);color:#fff;font-weight:700;font-size:14px;padding:12px 22px;border-radius:11px;text-decoration:none;white-space:nowrap;}
.mk-rfqbtn:hover{background:var(--spec-violet-deep);}
.mk-vstrip{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;}
.mk-vtile{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--spec-border);border-radius:14px;padding:14px 16px;text-decoration:none;color:var(--spec-ink);transition:border-color .15s;}
.mk-vtile:hover{border-color:var(--spec-violet);}
.mk-vtile b{font-size:14px;display:block;line-height:1.3;}
.mk-vtile small{color:var(--spec-text-2nd);font-size:12px;}
.mk-deptbar{display:flex;gap:8px;overflow-x:auto;max-width:1200px;margin:0 auto;padding:14px 20px 4px;scrollbar-width:none;}
.mk-deptbar::-webkit-scrollbar{display:none;}
.mk-dept{flex-shrink:0;display:inline-flex;align-items:center;gap:7px;font-family:inherit;font-size:13px;font-weight:600;color:var(--spec-text-2nd);background:#fff;border:1px solid var(--spec-border);border-radius:99px;padding:9px 15px;cursor:pointer;white-space:nowrap;transition:border-color .15s,background .15s;}
.mk-dept:hover{border-color:var(--spec-violet);}
.mk-dept.on{background:rgba(108,92,224,.14);border-color:var(--spec-violet);color:var(--spec-violet-deep);}
.mk-dept.svc{color:#1F7A54;}
.mk-dept.svc.on{background:rgba(47,158,106,.12);border-color:#1F7A54;color:#1F7A54;}
.mk-deptn{font-size:11px;font-weight:700;color:var(--spec-text-2nd);background:var(--spec-surface);border-radius:99px;padding:1px 7px;}
.mk-dept.on .mk-deptn{color:inherit;background:rgba(108,92,224,.14);}
.mk-searchbar{padding:22px 20px 6px;max-width:1200px;margin:0 auto;}
.mk-searchwrap{position:relative;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--spec-border);border-radius:14px;padding:0 16px;color:var(--spec-text-2nd);transition:border-color .15s;}
.mk-suggest{position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:40;list-style:none;margin:0;padding:6px;background:#fff;border:1px solid var(--spec-border);border-radius:13px;box-shadow:0 24px 60px -18px rgba(20,19,32,.3);max-height:340px;overflow-y:auto;}
.mk-suggest li{margin:0;}
.mk-suggest button{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:none;border:none;color:var(--spec-ink);font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;cursor:pointer;}
.mk-suggest button:hover{background:rgba(108,92,224,.1);}
.mk-suggest button svg{flex-shrink:0;width:15px;height:15px;opacity:.6;}
.mk-sglabel{flex:1;}
.mk-sgtag{flex-shrink:0;font-size:10.5px;font-weight:700;letter-spacing:.03em;padding:2px 8px;border-radius:99px;}
.mk-sgtag.t-product{background:rgba(108,92,224,.14);color:var(--spec-violet-deep);}
.mk-sgtag.t-service{background:rgba(47,158,106,.14);color:#1F7A54;}
.mk-sgtag.t-category{background:var(--spec-surface);color:var(--spec-text-2nd);}
.mk-searchwrap:focus-within{border-color:var(--spec-violet);box-shadow:0 0 0 3px rgba(108,92,224,.15);}
.mk-search{flex:1;padding:15px 4px;font-family:inherit;font-size:15px;border:none;background:none;color:var(--spec-ink);outline:none;}
.mk-search::placeholder{color:var(--spec-text-2nd);}
.mk-clearq{background:none;border:none;color:var(--spec-text-2nd);font-size:22px;line-height:1;cursor:pointer;padding:0 4px;}
.mk-tabsrow{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;max-width:1200px;margin:0 auto;padding:12px 20px;}
.mk-tabs{display:flex;background:#fff;border:1px solid var(--spec-border);border-radius:11px;overflow:hidden;}
.mk-tab{font-family:inherit;font-size:13.5px;font-weight:600;padding:10px 18px;background:none;border:none;color:var(--spec-text-2nd);cursor:pointer;white-space:nowrap;}
.mk-tab.on{background:var(--spec-violet);color:#fff;}
.mk-tabsr{display:flex;align-items:center;gap:10px;}
.mk-filterbtn{display:none;align-items:center;gap:6px;font-family:inherit;font-size:13px;font-weight:600;color:var(--spec-text-2nd);background:#fff;border:1px solid var(--spec-border);border-radius:10px;padding:9px 13px;cursor:pointer;}
.mk-sort{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--spec-text-2nd);}
.mk-sort select{font-family:inherit;font-size:13px;padding:9px 11px;border-radius:10px;border:1px solid var(--spec-border);background:#fff;color:var(--spec-ink);outline:none;cursor:pointer;}
.mk-layout{display:grid;grid-template-columns:250px 1fr;gap:24px;max-width:1200px;margin:0 auto;padding:8px 20px 120px;align-items:start;}
.mk-rail{position:sticky;top:78px;display:flex;flex-direction:column;gap:16px;background:#fff;border:1px solid var(--spec-border);border-radius:16px;padding:18px;}
.mk-railhead{display:flex;justify-content:space-between;align-items:center;}
.mk-railhead b{font-size:15px;color:var(--spec-ink);}
.mk-railhead>div{display:flex;gap:8px;align-items:center;}
.mk-clear{background:none;border:none;color:var(--spec-violet);font:inherit;font-size:12.5px;cursor:pointer;}
.mk-railclose{display:none;background:var(--spec-violet);border:none;color:#fff;font:inherit;font-size:13px;font-weight:600;border-radius:9px;padding:7px 14px;cursor:pointer;}
.mk-facet{display:flex;flex-direction:column;gap:7px;}
.mk-facetlabel{font-size:12px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--spec-text-2nd);}
.mk-facet select{font-family:inherit;font-size:13.5px;padding:10px 11px;border-radius:10px;border:1px solid var(--spec-border);background:var(--spec-warm-white);color:var(--spec-ink);outline:none;}
.mk-facet select:focus{border-color:var(--spec-violet);}
.mk-facetcheck{display:flex;align-items:center;gap:9px;font-size:13.5px;color:var(--spec-ink);cursor:pointer;padding:3px 0;}
.mk-facetcheck input{accent-color:var(--spec-violet);width:15px;height:15px;}
.mk-railnote{font-size:11.5px;color:var(--spec-text-2nd);line-height:1.5;margin:2px 0 0;}
.mk-results{min-width:0;}
.mk-count{font-size:13.5px;color:var(--spec-text-2nd);margin:4px 2px 12px;}
.mk-count b{color:var(--spec-violet-deep);}
.mk-activechips{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 16px;}
.mk-activechips button{font-family:inherit;font-size:12px;font-weight:600;padding:6px 11px;border-radius:99px;border:1px solid rgba(108,92,224,.35);background:rgba(108,92,224,.1);color:var(--spec-violet-deep);cursor:pointer;}
.mk-activechips button:hover{background:rgba(108,92,224,.2);}
.mk-activechips button.all{border-color:var(--spec-border);background:none;color:var(--spec-text-2nd);}
.mk-cnames{max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mk-cnames b{color:var(--spec-violet-deep);}
.mk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.mk-card{background:#fff;border:1px solid var(--spec-border);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .15s,transform .15s,box-shadow .15s;}
.mk-card:hover{border-color:var(--spec-violet);transform:translateY(-2px);box-shadow:0 16px 32px -18px rgba(20,19,32,.22);}
.mk-card-img{display:block;height:150px;background:var(--spec-surface);}
.mk-card-img img{width:100%;height:100%;object-fit:cover;}
.mk-noimg{height:100%;display:grid;place-items:center;color:var(--spec-text-2nd);font-size:13px;letter-spacing:.15em;text-transform:uppercase;}
.mk-card-body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:7px;flex:1;}
.mk-kindrow{display:flex;flex-wrap:wrap;gap:6px;}
.mk-kind{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:99px;}
.mk-kind.product{background:rgba(108,92,224,.14);color:var(--spec-violet-deep);}
.mk-kind.service{background:rgba(47,158,106,.14);color:#1F7A54;}
.mk-badge{font-size:10px;font-weight:600;padding:3px 8px;border-radius:99px;background:var(--spec-surface);color:var(--spec-text-2nd);}
/* #8A5D14: a darker shade of --spec-warning, calibrated for 4.5:1 on a
   light surface (the raw token measures ~3:1 as text). */
.mk-badge.urgent{background:rgba(198,138,40,.14);color:#8A5D14;}
.mk-badge.trust{background:rgba(47,158,106,.14);color:#1F7A54;}
.mk-badge.cert{background:rgba(108,92,224,.14);color:var(--spec-violet-deep);}
.mk-name{font-size:15.5px;font-weight:700;color:var(--spec-ink);text-decoration:none;line-height:1.3;}
.mk-name:hover{color:var(--spec-violet-deep);}
.mk-vendor{font-size:12.5px;color:var(--spec-text-2nd);}
.mk-vlink{color:var(--spec-text-2nd);text-decoration:none;font-weight:600;}
.mk-vlink:hover{color:var(--spec-violet-deep);text-decoration:underline;}
.mk-rating{margin-left:8px;color:#8A5D14;font-weight:600;white-space:nowrap;}
.mk-rating small{color:var(--spec-text-2nd);font-weight:400;}
.mk-tags{display:flex;flex-wrap:wrap;gap:5px;}
.mk-tags span{font-size:11px;color:var(--spec-violet-deep);background:rgba(108,92,224,.08);padding:3px 8px;border-radius:6px;}
.mk-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--spec-text-2nd);margin-top:auto;padding-top:4px;}
.mk-actions{display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap;}
.mk-mini{font-family:inherit;font-size:12px;font-weight:600;padding:8px 10px;border-radius:9px;border:1px solid var(--spec-border);background:none;color:var(--spec-text-2nd);cursor:pointer;text-decoration:none;}
.mk-mini.on{border-color:var(--spec-violet);color:var(--spec-violet-deep);background:rgba(108,92,224,.1);}
.mk-mini:disabled{opacity:.5;}
.mk-quote{margin-left:auto;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:9px;background:var(--spec-violet);color:#fff;text-decoration:none;white-space:nowrap;}
.mk-quote:hover{background:var(--spec-violet-deep);}
.mk-skeletons{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.mk-skel{height:290px;border-radius:16px;background:linear-gradient(100deg,#EFEDF5 30%,#E4E1EF 50%,#EFEDF5 70%);background-size:200% 100%;animation:mkpulse 1.3s ease-in-out infinite;}
@keyframes mkpulse{0%{background-position:100% 0;}100%{background-position:-100% 0;}}
@media (prefers-reduced-motion:reduce){.mk-skel{animation:none;}}
.mk-empty{text-align:center;color:var(--spec-text-2nd);padding:50px 0;}
.mk-empty.big{background:#fff;border:1px solid var(--spec-border);border-radius:18px;padding:48px 24px;}
.mk-empty b{display:block;font-size:18px;color:var(--spec-ink);margin-bottom:8px;}
.mk-empty p{font-size:14px;line-height:1.6;max-width:420px;margin:0 auto 18px;}
.mk-emptyactions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
.mk-starters{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:18px;}
.mk-starters button{font-family:inherit;font-size:13px;color:var(--spec-violet-deep);background:rgba(108,92,224,.08);border:1px solid rgba(108,92,224,.3);border-radius:99px;padding:8px 14px;cursor:pointer;}
.mk-starters button:hover{background:rgba(108,92,224,.16);}
.mk-solutions{max-width:720px;margin:10px auto;padding:44px 24px 120px;text-align:center;}
.mk-solutions h2{font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--spec-ink);}
.mk-solutions p{color:var(--spec-text-2nd);font-size:15px;line-height:1.6;margin:12px auto 24px;max-width:560px;}
.mk-asknxt{display:inline-block;margin-top:8px;font-size:14.5px;font-weight:700;padding:13px 22px;border-radius:12px;background:var(--spec-violet);color:#fff;text-decoration:none;}
.mk-asknxt:hover{background:var(--spec-violet-deep);}
.mk-scrim{display:none;}
.mk-cbar{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--spec-border);border-radius:14px;padding:12px 18px;font-size:13.5px;color:var(--spec-ink);z-index:35;box-shadow:0 10px 40px rgba(20,19,32,.2);}
.mk-modal{position:fixed;inset:0;background:rgba(20,19,32,.5);display:grid;place-items:center;z-index:40;padding:20px;}
.mk-modal-in{background:#fff;border:1px solid var(--spec-border);border-radius:18px;max-width:960px;width:100%;max-height:82vh;overflow:auto;padding:22px;}
.mk-modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
.mk-modal-head b{color:var(--spec-ink);}
.mk-modal-head button{font-family:inherit;background:none;border:1px solid var(--spec-border);color:var(--spec-text-2nd);border-radius:9px;padding:7px 12px;cursor:pointer;}
.mk-ctable-wrap{overflow-x:auto;}
.mk-ctable{width:100%;border-collapse:collapse;font-size:13.5px;}
.mk-ctable th,.mk-ctable td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--spec-border);vertical-align:top;color:var(--spec-ink);}
.mk-ctable th a{color:var(--spec-violet-deep);text-decoration:none;}
.mk-ctable td:first-child{color:var(--spec-text-2nd);white-space:nowrap;}
@media(max-width:860px){
  .mk-layout{grid-template-columns:1fr;}
  .mk-filterbtn{display:inline-flex;}
  .mk-rail{position:fixed;top:0;left:0;bottom:0;width:300px;max-width:88vw;z-index:50;border-radius:0;transform:translateX(-105%);transition:transform .22s ease;overflow-y:auto;}
  .mk-rail.open{transform:translateX(0);}
  .mk-railclose{display:inline-block;}
  .mk-scrim{display:block;position:fixed;inset:0;background:rgba(20,19,32,.4);z-index:45;}
}
`;
