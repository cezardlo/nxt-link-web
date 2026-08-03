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
import { BadgeCheck, Zap, MapPin, PlayCircle, Timer, type LucideIcon } from 'lucide-react';
import { levelAtLeast } from '@/components/marketplace/TrustBadges';
import AddToCartButton from '@/components/cart/AddToCartButton';
import { useLang, type Lang } from '@/components/LanguageToggle';
import { parsePriceUSD } from '@/lib/marketplace/price';
import PublicHeader from '@/components/PublicHeader';
// CompareModal-only addition (polish pass 2026-07-30): the shared motion
// vocabulary for its open-transition (nxm-backdrop/nxm-panel) — reused, not
// forked, same as every other page in this sweep. Nothing else in this file
// changed.
import { MOTION_CSS } from '@/components/motion/Motion';

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

interface Department { fg: string; label_en: string; label_es: string; is_service: boolean }

// Price ranges make buyers anchor on the TOP number ("$13–17" reads as "$17").
// Show the floor with a "From" instead; the quote settles the real number.
function fromPrice(raw?: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^\s*(\$?\s?\d[\d,.]*\s*k?)\s*(?:-|–|—|to)\s*\$?\s?\d[\d,.]*\s*k?(.*)$/i);
  if (!m) return raw;
  const tail = (m[2] || '').trim();
  return `From ${m[1].trim()}${tail ? ` ${tail}` : ''} · final in quote`;
}

type Tab = 'all' | 'product' | 'service' | 'technology' | 'solution';
type Sort = 'best' | 'recent' | 'lead' | 'pilot' | 'verified';

const SORTS: Array<[Sort, string]> = [
  ['best', 'Best match'],
  ['recent', 'Recently added'],
  ['lead', 'Fastest response'],
  ['pilot', 'Pilot available first'],
  ['verified', 'Verified vendors first'],
];
// Bilingual label lookups for this page's own fixed UI chrome (page copy
// stays in inline `lang === 'es' ? … : …` / label-lookup form — the SAME
// pattern this file already uses for PRICE_LABEL_EN/ES, AVAIL_LABEL_EN/ES,
// and the filter-rail labels below — rather than introducing a second i18n
// mechanism into one file).
const SORT_LABEL_ES: Record<Sort, string> = {
  best: 'Mejor coincidencia', recent: 'Agregado recientemente', lead: 'Respuesta más rápida',
  pilot: 'Piloto disponible primero', verified: 'Proveedores verificados primero',
};
const TAB_LABEL_EN: Record<Tab, string> = { all: 'Everything', product: 'Products', service: 'Services', technology: 'Technology', solution: 'Solutions' };
// New ES string flagged for Cesar's wording sign-off per project rules.
const TAB_LABEL_ES: Record<Tab, string> = { all: 'Todo', product: 'Productos', service: 'Servicios', technology: 'Tecnología', solution: 'Soluciones' };
// Matches the exact ES wording already used for these same concepts on
// /marketplace/[kind]/[id] (kindProduct/kindService/pilotAvailable/warranty/
// leadTime/response/emergency) — kept lowercase like the EN source ("product"/
// "service"); the badge/kind-pill CSS applies text-transform:uppercase.
const KIND_LABEL_ES: Record<'product' | 'service', string> = { product: 'producto', service: 'servicio' };
const SUGGEST_TYPE_LABEL_ES: Record<string, string> = { product: 'Producto', service: 'Servicio', category: 'Categoría' };

// A few starting points for the Solutions tab (problem-first discovery). These
// set the search box; results still come only from real vendor data.
const PROBLEM_STARTERS = ['reduce labor', 'prevent cargo theft', 'improve safety', 'speed up picking', 'reduce downtime', 'warehouse automation'];

function useLocalSet(key: string, max?: number): [Set<string>, (id: string) => void, (ids: string[]) => void] {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      let loaded = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(loaded)) loaded = [];
      if (max != null && loaded.length > max) loaded = loaded.slice(0, max);
      setSet(new Set(loaded));
    } catch { /* ignore */ }
  }, [key, max]);
  const toggle = (id: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (max == null || next.size < max) {
        next.add(id);
      }
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };
  const addAll = (ids: string[]) => {
    if (!ids.length) return;
    setSet((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => { if (max == null || next.size < max) next.add(i); });
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

// ---- Price range facet (2026-07-23 filter rework) ----
// Buyers shop by price, not by an internal "pricing model" label, so the
// sidebar buckets each listing into a coarse $ bracket instead of showing the
// vendor's raw pricing model. This is a BEST-EFFORT text parse of the free-
// text `pricing.range` field ("$28,000–$34,000", "From $1,200/mo") — it is
// only ever used for client-side filtering, never stored or shown as copy.
// The real fix is a structured price_low/price_high column on the listing;
// that is deferred to Phase 2 — see
// workplace/research/structured-search-blueprint-2026-07-22.md.
type PriceBucket = 'under10k' | '10to50k' | '50to100k' | '100kplus' | 'quote';
const PRICE_BUCKET_KEYS: PriceBucket[] = ['under10k', '10to50k', '50to100k', '100kplus', 'quote'];
const PRICE_LABEL_EN: Record<PriceBucket, string> = {
  under10k: 'Under $10k', '10to50k': '$10k – $50k', '50to100k': '$50k – $100k', '100kplus': '$100k+', quote: 'Quote / subscription',
};
const PRICE_LABEL_ES: Record<PriceBucket, string> = {
  under10k: 'Menos de $10k', '10to50k': '$10k – $50k', '50to100k': '$50k – $100k', '100kplus': '$100k+', quote: 'Cotización / suscripción',
};
// Language that means "there's no single $ figure to bucket" — subscriptions,
// per-unit/pallet pricing, and explicit quote-only wording all land in the
// "Quote / subscription" bucket instead of being forced into a $ bracket.
const QUOTE_SIGNAL_RE = /\/\s*mo\b|\bper\s*(unit|pallet|item|month|year|hour|day)\b|\bsubscription\b|\bquote\b|\bcall\s+for\b|\bcontact\b/i;
// Buckets a listing by its best-effort-parsed price. Returns null only when
// the listing has no pricing info at all — those don't belong in this facet.
function priceBucket(c: Card): PriceBucket | null {
  const raw = c.pricing?.range || null;
  const model = c.pricing?.model || c.pricing_model || null;
  if (!raw && !model) return null;
  if (!raw) return 'quote'; // has a pricing model (e.g. "subscription") but no $ text to parse
  if (QUOTE_SIGNAL_RE.test(raw)) return 'quote';
  const n = parsePriceUSD(raw);
  if (n == null) return 'quote';
  if (n < 10_000) return 'under10k';
  if (n < 50_000) return '10to50k';
  if (n < 100_000) return '50to100k';
  return '100kplus';
}

// ---- "How you can get it" facet — buy/rent/lease/quote (products only; most
// services simply won't have this array, and the facet auto-hides then) ----
type AvailKey = 'buy' | 'rent' | 'lease' | 'quote';
const AVAIL_KEYS: AvailKey[] = ['buy', 'rent', 'lease', 'quote'];
const AVAIL_LABEL_EN: Record<AvailKey, string> = { buy: 'Buy', rent: 'Rent', lease: 'Lease', quote: 'Quote only' };
const AVAIL_LABEL_ES: Record<AvailKey, string> = { buy: 'Comprar', rent: 'Rentar', lease: 'Arrendar', quote: 'Solo cotización' };

// ---- Location facet — vendor_city is the primary source; service_areas
// values fold in too (a listing can match on either). "Ciudad Juárez" /
// "Juárez" / "Juarez" (no accent) all collapse to ONE canonical "Juárez"
// option; every other city passes through exactly as the vendor entered it
// (trimmed only — no invented data, matching this file's data-driven rule).
function canonicalCity(raw: string): string {
  const stripped = raw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^ciudad\s+|^cd\.?\s+/, '').trim();
  if (stripped === 'juarez') return 'Juárez';
  return raw.trim();
}
function cityCandidates(c: Card): string[] {
  const set = new Set<string>();
  if (c.vendor_city) set.add(canonicalCity(c.vendor_city));
  c.service_areas?.forEach((a) => { if (a) set.add(canonicalCity(a)); });
  return Array.from(set);
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
  // Session expired (or never signed in) vs a genuinely empty catalog — the
  // listings API returns 401 + code:'auth_required' when the session cookie
  // is gone (audit: marketplace grid Critical #1). Distinguished by response
  // shape, never by array length, so a real empty catalog still shows the
  // normal empty state below.
  const [authError, setAuthError] = useState(false);
  const [authNext, setAuthNext] = useState('/marketplace');

  // Departments (functional groups) for the "Browse by department" row.
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fDept, setFDept] = useState('');

  // selected facet filters (data-driven). Filter set reworked 2026-07-23 —
  // Service area/Pricing model dropped (Location + Price range replace them);
  // Category, Industry, Price range, How you can get it, and Location are all
  // multi-select checkbox facets (Amazon-style, OR logic within a facet: a
  // listing matches if it has ANY checked value) — same shared plumbing.
  const [fCategory, setFCategory] = useState<string[]>([]);
  const [fIndustry, setFIndustry] = useState<string[]>([]);
  const [fPrice, setFPrice] = useState<string[]>([]);
  const [fAvail, setFAvail] = useState<string[]>([]);
  const [fLocation, setFLocation] = useState<string[]>([]);
  const [fPilot, setFPilot] = useState(false);
  const [fEmergency, setFEmergency] = useState(false);
  const [fVerified, setFVerified] = useState(false);
  const [fLocal, setFLocal] = useState(false);
  const [fFast, setFFast] = useState(false);
  const toggleCategory = (v: string) => setFCategory((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const toggleIndustry = (v: string) => setFIndustry((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const togglePrice = (v: string) => setFPrice((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const toggleAvail = (v: string) => setFAvail((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const toggleLocation = (v: string) => setFLocation((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const [saved, toggleSaved, addAllSaved] = useLocalSet('nxt_saved');
  const [compare, toggleCompare] = useLocalSet('nxt_compare', 5);
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

  // Shareable URLs (2026-07-23): every active facet lives in the query string,
  // not just ?q=/?tab=. Read + restore on load, then keep the URL in sync
  // after — same replaceState pattern as before, just more params. Values
  // read from the URL drive only client-side array/equality filtering (no
  // DB/.or() surface here), but we still cap length/count so a hand-edited
  // URL can't inject an unbounded string into React state.
  const capStr = (s: string, max = 80) => s.slice(0, max);
  const parseListParam = (sp: URLSearchParams, key: string, max = 15): string[] => {
    const raw = sp.get(key);
    if (!raw) return [];
    const seen = new Set<string>();
    for (const part of raw.split(',')) {
      const v = capStr(part.trim(), 80);
      if (v) seen.add(v);
      if (seen.size >= max) break;
    }
    return Array.from(seen);
  };
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q0 = sp.get('q'); const t0 = sp.get('tab'); const d0 = sp.get('department');
    if (q0) setQ(capStr(q0, 200));
    if (t0 === 'product' || t0 === 'service' || t0 === 'technology' || t0 === 'solution') setTab(t0);
    // Category tiles (landing page + "Shop by department") link here with
    // ?department=<functional_group> — pick it up so the tile isn't a dead link.
    if (d0) setFDept(capStr(d0));
    const cat0 = parseListParam(sp, 'category'); if (cat0.length) setFCategory(cat0);
    const ind0 = parseListParam(sp, 'industry'); if (ind0.length) setFIndustry(ind0);
    const price0 = parseListParam(sp, 'price'); if (price0.length) setFPrice(price0);
    const avail0 = parseListParam(sp, 'avail'); if (avail0.length) setFAvail(avail0);
    const loc0 = parseListParam(sp, 'location'); if (loc0.length) setFLocation(loc0);
    const sort0 = sp.get('sort');
    if (sort0 && SORTS.some(([v]) => v === sort0)) setSort(sort0 as Sort);
    // The homepage's Alibaba-style attribute chips (2026-07-22) link here with
    // one of these =1 so the facet is already ticked on arrival instead of
    // dumping the visitor on an unfiltered page — additive only, seeds the
    // SAME facet state the checkboxes below already set; absent params leave
    // behavior byte-identical to today.
    if (sp.get('verified') === '1') setFVerified(true);
    if (sp.get('local') === '1') setFLocal(true);
    if (sp.get('fast') === '1') setFFast(true);
    if (sp.get('emergency') === '1') setFEmergency(true);
    if (sp.get('pilot') === '1') setFPilot(true);
    // Autofocus search on desktop only (avoid popping the mobile keyboard).
    if (window.innerWidth > 860) searchRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (tab !== 'all') sp.set('tab', tab);
    if (fDept) sp.set('department', fDept);
    if (fCategory.length) sp.set('category', fCategory.join(','));
    if (fIndustry.length) sp.set('industry', fIndustry.join(','));
    if (fPrice.length) sp.set('price', fPrice.join(','));
    if (fAvail.length) sp.set('avail', fAvail.join(','));
    if (fLocation.length) sp.set('location', fLocation.join(','));
    if (fPilot) sp.set('pilot', '1');
    if (fEmergency) sp.set('emergency', '1');
    if (fVerified) sp.set('verified', '1');
    if (fLocal) sp.set('local', '1');
    if (fFast) sp.set('fast', '1');
    if (sort !== 'best') sp.set('sort', sort);
    const qs = sp.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    document.title = q.trim() ? `${q.trim()} — NXT//LINK Marketplace` : 'Marketplace — NXT//LINK';
  }, [q, tab, fDept, fCategory, fIndustry, fPrice, fAvail, fLocation, fPilot, fEmergency, fVerified, fLocal, fFast, sort]);
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
        const data = await lRes.json().catch(() => null);
        if (lRes.status === 401 && data?.code === 'auth_required') {
          // Walled — session gone. Not "zero vendors": show a re-login state,
          // never the empty-catalog message. Preserve path+query so sign-in
          // returns the buyer to exactly this search/filter state.
          setAuthError(true);
          setAuthNext(window.location.pathname + window.location.search);
          setCards([]);
        } else {
          setAuthError(false);
          // One malformed listing (jsonb {} where a list belongs) must degrade to
          // empty, not white-screen the whole marketplace — coerce at ingestion.
          const asList = (v: unknown): string[] => (Array.isArray(v) ? v : []);
          setCards(((data && data.listings) || []).map((c: Card) => ({
            ...c,
            best_for: asList(c.best_for), industries: asList(c.industries),
            availability: asList(c.availability), service_areas: asList(c.service_areas),
          })));
        }
        try {
          const cat = await cRes.json();
          setDepartments((cat.departments || []).map((d: { fg: string; label_en: string; label_es: string; is_service: boolean }) => ({ fg: d.fg, label_en: d.label_en, label_es: d.label_es, is_service: d.is_service })));
        } catch { /* departments optional */ }
      } catch { setCards([]); }
      setLoading(false);
    })();
  }, []);

  const resetFilters = () => {
    setFDept(''); setFCategory([]); setFIndustry([]); setFPrice([]); setFAvail([]); setFLocation([]);
    setFPilot(false); setFEmergency(false); setFVerified(false);
    setFLocal(false); setFFast(false);
  };

  // listings for the active tab (before facet/search filtering) — drives facets
  const tabCards = useMemo(() => {
    if (tab === 'product' || tab === 'service') return cards.filter((c) => c.kind === tab);
    // Technology is a *request* kind, not a listing kind: vendors list tech as
    // a service tagged with the svc_technology functional group. Surface those
    // under their own tab so buyers can discover them without already knowing
    // to browse Services → filter by category.
    if (tab === 'technology') return cards.filter((c) => c.kind === 'service' && c.functional_group === 'svc_technology');
    return cards; // 'all' and 'solution' consider everything
  }, [cards, tab]);

  // Build facet option lists AND counts from REAL data only (Amazon-style
  // "Category (5)"). Counts are tallied over tabCards — the same tab-filtered
  // universe the option lists themselves come from — not net of the OTHER
  // active facet selections; that keeps the count math simple/obviously-
  // correct for this MVP (see workplace/research/structured-search-blueprint-
  // 2026-07-22.md for the fuller cross-facet count model, deferred to Phase 2
  // along with a real price_low/price_high column — the actual fix for the
  // priceBucket() best-effort text parse used below).
  const facets = useMemo(() => {
    const cat = new Map<string, number>(); const ind = new Map<string, number>();
    const price = new Map<string, number>(); const avail = new Map<string, number>(); const loc = new Map<string, number>();
    const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) || 0) + 1);
    let pilotN = 0, emergencyN = 0, verifiedN = 0, localN = 0, fastN = 0, numericPriced = 0;
    for (const c of tabCards) {
      if (c.category) bump(cat, c.category);
      c.industries?.forEach((i) => i && bump(ind, i));
      const b = priceBucket(c);
      if (b) { bump(price, b); if (b !== 'quote') numericPriced++; }
      const seenAvail = new Set<string>();
      c.availability?.forEach((a) => { if (a && !seenAvail.has(a)) { seenAvail.add(a); bump(avail, a); } });
      cityCandidates(c).forEach((v) => bump(loc, v));
      if (c.pilot?.available) pilotN++;
      if (c.emergency_available) emergencyN++;
      if (c.vendor_verified) verifiedN++;
      if (isLocal(c)) localN++;
      if (isFast(c)) fastN++;
    }
    // Price range has a natural low→high order (Quote/subscription last), and
    // Buy/Rent/Lease keeps the order buyers expect — neither is alphabetical.
    const priceOptions: FacetOption[] = numericPriced >= 3
      ? PRICE_BUCKET_KEYS.filter((k) => (price.get(k) || 0) > 0).map((k) => [k, price.get(k) as number])
      : []; // fewer than ~3 listings have a real $ figure — the bracket facet isn't useful yet
    const availOptions: FacetOption[] = AVAIL_KEYS.filter((k) => (avail.get(k) || 0) > 0).map((k) => [k, avail.get(k) as number]);
    const sortMap = (m: Map<string, number>): Array<[string, number]> =>
      Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      categories: sortMap(cat), industries: sortMap(ind),
      price: priceOptions, availability: availOptions, locations: sortMap(loc),
      pilotN, emergencyN, verifiedN, localN, fastN,
    };
  }, [tabCards]);

  // Once real listing data is in, drop any URL-restored facet value that
  // doesn't match a real option — a garbage/typo'd query string just quietly
  // stops filtering instead of leaving a dead "ghost" chip on screen.
  useEffect(() => {
    if (!cards.length) return;
    setFCategory((prev) => {
      const next = prev.filter((v) => facets.categories.some(([o]) => o === v));
      return next.length === prev.length ? prev : next;
    });
    setFIndustry((prev) => {
      const next = prev.filter((v) => facets.industries.some(([o]) => o === v));
      return next.length === prev.length ? prev : next;
    });
    setFPrice((prev) => {
      const next = prev.filter((v) => facets.price.some(([o]) => o === v));
      return next.length === prev.length ? prev : next;
    });
    setFAvail((prev) => {
      const next = prev.filter((v) => facets.availability.some(([o]) => o === v));
      return next.length === prev.length ? prev : next;
    });
    setFLocation((prev) => {
      const next = prev.filter((v) => facets.locations.some(([o]) => o === v));
      return next.length === prev.length ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, facets]);

  const tokens = useMemo(() => q.toLowerCase().split(/\s+/).filter(Boolean), [q]);

  const results = useMemo(() => {
    let list = tabCards.filter((c) => {
      if (fDept && c.functional_group !== fDept) return false;
      if (fCategory.length && !fCategory.includes(c.category)) return false;
      if (fIndustry.length && !(c.industries || []).some((i) => fIndustry.includes(i))) return false;
      if (fPrice.length) {
        const b = priceBucket(c);
        if (!b || !fPrice.includes(b)) return false;
      }
      if (fAvail.length && !(c.availability || []).some((a) => fAvail.includes(a))) return false;
      if (fLocation.length && !cityCandidates(c).some((v) => fLocation.includes(v))) return false;
      if (fPilot && !c.pilot?.available) return false;
      if (fEmergency && !c.emergency_available) return false;
      if (fVerified && !c.vendor_verified) return false;
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
  }, [tabCards, fDept, fCategory, fIndustry, fPrice, fAvail, fLocation, fPilot, fEmergency, fVerified, fLocal, fFast, savedOnly, saved, tokens, sort]);

  // Which departments actually have listings (so we never show an empty aisle).
  const deptCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) if (c.functional_group) m.set(c.functional_group, (m.get(c.functional_group) || 0) + 1);
    return m;
  }, [cards]);
  const liveDepartments = useMemo(() => departments.filter((d) => deptCounts.has(d.fg)), [departments, deptCounts]);

  const compareCards = useMemo(() => cards.filter((c) => compare.has(c.id)).slice(0, 5), [cards, compare]);
  const compareFull = compare.size >= 5;
  const activeFilterCount = (fDept ? 1 : 0) + fCategory.length + fIndustry.length + fPrice.length + fAvail.length + fLocation.length +
    [fPilot, fEmergency, fVerified, fLocal, fFast].filter(Boolean).length;
  const marketplaceEmpty = !loading && !authError && cards.length === 0;

  // "Storefront" home state: nothing searched or filtered yet — still gates
  // the hero below. The two tile-browsing sections that used to render here
  // (category tiles, featured vendors) were removed 2026-07-24 per
  // workplace/research/marketplace-restructure-2026-07-24.md — listings now
  // lead immediately after the department bar. homeCategories/homeVendors
  // (the memos that built those tile lists) are gone with them; nothing else
  // read from them — deptCounts/facets are computed independently of these.
  const pristine = !q.trim() && tab === 'all' && activeFilterCount === 0 && !savedOnly;

  // Suggested related searches for empty states (from real category data).
  const suggestions = facets.categories.slice(0, 6).map(([c]) => c);

  return (
    <div className={`mk ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: MOTION_CSS + CSS }} />
      {/* ONE shared public header (Flow Blueprint 2026-07-22 §4, Slice 2) —
          replaces this page's old dark `mk-nav`. "Saved"/"My dashboard"/
          "For vendors" are page-specific utility links (not part of the
          shared header's spec'd content), so they move to a slim secondary
          row directly underneath instead of being dropped. */}
      <PublicHeader lang={lang} onLangChange={setLang} />
      <div className="mk-subnav">
        <button className={'mk-pill' + (savedOnly ? ' on' : '')} onClick={() => setSavedOnly((v) => !v)}>{lang === 'es' ? 'Guardado' : 'Saved'} ({saved.size})</button>
        <Link className="mk-pill" href="/buyer">{lang === 'es' ? 'Mi panel' : 'My dashboard'}</Link>
        <Link className="mk-pill" href="/vendor-login">{lang === 'es' ? 'Para proveedores' : 'For vendors'}</Link>
      </div>

      {/* Storefront hero (home state only) */}
      {pristine && !loading && !authError && (
        <div className="mk-hero">
          <h1>{lang === 'es' ? 'El marketplace de la cadena de suministro industrial' : 'The industrial supply chain marketplace'}</h1>
          <p>{lang === 'es'
            ? <>Tecnología, hardware, equipo y servicios para almacenes, fabricantes y logística — descubre, compara, solicita cotizaciones, prueba con un piloto y cierra el trato a través de NXT{'//'}LINK.</>
            : <>Technology, hardware, equipment, and services for warehouses, manufacturers, and logistics — discover, compare, request quotes, pilot, and close the deal through NXT{'//'}LINK.</>}</p>
        </div>
      )}

      {/* Search bar */}
      <div className="mk-searchbar">
        <div className="mk-searchwrap">
          <SearchIcon />
          <input
            ref={searchRef}
            className="mk-search"
            placeholder={lang === 'es'
              ? 'Busca productos, servicios o un problema — ej. “mantenimiento de montacargas El Paso”, “reducir tiempo de inactividad”'
              : 'Search products, services, or a problem — e.g. “forklift maintenance El Paso”, “reduce downtime”'}
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
          {q && <button className="mk-clearq" onClick={() => { setQ(''); setSuggests([]); }} aria-label={lang === 'es' ? 'Borrar búsqueda' : 'Clear search'}>×</button>}
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
                    <span className={`mk-sgtag t-${s.type}`}>{lang === 'es' ? (SUGGEST_TYPE_LABEL_ES[s.type] || 'Categoría') : (s.type === 'product' ? 'Product' : s.type === 'service' ? 'Service' : 'Category')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Browse by department — the primary functional aisles (Grainger/Amazon
          style). Tidied 2026-07-24: wrapped in its own hairline-bordered band
          so it reads as a distinct nav layer instead of blending into the
          search bar above (NN/g guidance: highlight subcategories separately,
          above the listings, not merged into the filter rail). Same data,
          same behavior (functional_group filter + live counts) — visual only.
          Not sticky on purpose — see research doc §"tidied department bar". */}
      {liveDepartments.length > 0 && (
        <div className="mk-deptband">
          <div className="mk-deptbar">
            <button className={`mk-dept ${!fDept ? 'on' : ''}`} onClick={() => setFDept('')}>{lang === 'es' ? 'Todos los departamentos' : 'All departments'}</button>
            {liveDepartments.map((d) => (
              <button key={d.fg} className={`mk-dept ${fDept === d.fg ? 'on' : ''} ${d.is_service ? 'svc' : ''}`}
                onClick={() => setFDept(fDept === d.fg ? '' : d.fg)}>
                {(lang === 'es' ? d.label_es : d.label_en) || d.label_en}<span className="mk-deptn">{deptCounts.get(d.fg)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* "Browse by category" tiles and "Featured vendors" storefront sections
          removed 2026-07-24 (workplace/research/marketplace-restructure-
          2026-07-24.md — Candidate A: listings should fill immediately after
          the department bar, nothing should backfill the freed space). The
          RFQ affordance that used to live in this block was NOT removed —
          it now lives as a slim inline prompt in the results header below
          (`.mk-rfqinline`) so it stays discoverable without pushing listings
          down. */}

      {/* Tabs */}
      <div className="mk-tabsrow">
        <div className="mk-tabs">
          {(['all', 'product', 'service', 'solution'] as Tab[]).map((k) => (
            <button key={k} className={'mk-tab' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); resetFilters(); }}>{(lang === 'es' ? TAB_LABEL_ES : TAB_LABEL_EN)[k]}</button>
          ))}
        </div>
        <div className="mk-tabsr">
          <button className="mk-filterbtn" onClick={() => setDrawer(true)}>
            <FilterIcon /> {lang === 'es' ? 'Filtros' : 'Filters'}{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
          <label className="mk-sort">
            {lang === 'es' ? 'Ordenar' : 'Sort'}
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{lang === 'es' ? SORT_LABEL_ES[v] : l}</option>)}
            </select>
          </label>
        </div>
      </div>

      {tab === 'solution' ? (
        <SolutionsPanel lang={lang} onPick={(p) => { setQ(p); setTab('all'); }} starters={PROBLEM_STARTERS} />
      ) : (
        <div className="mk-layout">
          {/* Left filter rail (desktop) + drawer (mobile) */}
          <aside className={'mk-rail' + (drawer ? ' open' : '')}>
            <div className="mk-railhead">
              <b>{lang === 'es' ? 'Filtros' : 'Filters'}</b>
              <div>
                {activeFilterCount > 0 && <button className="mk-clear" onClick={resetFilters}>{lang === 'es' ? 'Limpiar todo' : 'Clear all'}</button>}
                <button className="mk-railclose" onClick={() => setDrawer(false)} aria-label={lang === 'es' ? 'Cerrar filtros' : 'Close filters'}>{lang === 'es' ? 'Listo' : 'Done'}</button>
              </div>
            </div>

            <FacetCheckGroup
              label={lang === 'es' ? 'Categoría' : 'Category'}
              values={fCategory}
              onToggle={toggleCategory}
              options={facets.categories}
            />
            <FacetCheckGroup
              label={lang === 'es' ? 'Industria' : 'Industry'}
              values={fIndustry}
              onToggle={toggleIndustry}
              options={facets.industries}
            />
            <FacetCheckGroup
              label={lang === 'es' ? 'Rango de precio' : 'Price range'}
              values={fPrice}
              onToggle={togglePrice}
              options={facets.price}
              labelFor={(v) => (lang === 'es' ? PRICE_LABEL_ES : PRICE_LABEL_EN)[v as PriceBucket] || v}
            />
            <FacetCheckGroup
              label={lang === 'es' ? 'Cómo lo puedes obtener' : 'How you can get it'}
              values={fAvail}
              onToggle={toggleAvail}
              options={facets.availability}
              labelFor={(v) => (lang === 'es' ? AVAIL_LABEL_ES : AVAIL_LABEL_EN)[v as AvailKey] || v}
            />
            <FacetCheckGroup
              label={lang === 'es' ? 'Ubicación' : 'Location'}
              values={fLocation}
              onToggle={toggleLocation}
              options={facets.locations}
            />
            {facets.verifiedN > 0 && (
              <div className="mk-facet">
                <FacetCheck label={lang === 'es' ? 'Proveedor verificado' : 'Verified vendor'} checked={fVerified} onChange={setFVerified} count={facets.verifiedN} icon={BadgeCheck} />
              </div>
            )}

            {(facets.pilotN > 0 || facets.emergencyN > 0 || facets.localN > 0 || facets.fastN > 0) && (
              <div className="mk-facet">
                <div className="mk-facetlabel">{lang === 'es' ? 'Mostrar solo' : 'Show only'}</div>
                {facets.pilotN > 0 && <FacetCheck label={lang === 'es' ? 'Piloto / demo disponible' : 'Pilot / demo available'} checked={fPilot} onChange={setFPilot} count={facets.pilotN} icon={PlayCircle} />}
                {facets.localN > 0 && <FacetCheck label={lang === 'es' ? 'Soporte local' : 'Local support'} checked={fLocal} onChange={setFLocal} count={facets.localN} icon={MapPin} />}
                {facets.fastN > 0 && <FacetCheck label={lang === 'es' ? 'Respuesta rápida' : 'Fast response / lead time'} checked={fFast} onChange={setFFast} count={facets.fastN} icon={Timer} />}
                {facets.emergencyN > 0 && <FacetCheck label={lang === 'es' ? 'Emergencia 24/7' : '24/7 emergency'} checked={fEmergency} onChange={setFEmergency} count={facets.emergencyN} icon={Zap} />}
              </div>
            )}
            <p className="mk-railnote">{lang === 'es' ? 'Los filtros reflejan lo que los proveedores realmente publicaron. Las opciones sin datos se ocultan.' : 'Filters reflect what vendors actually listed. Options with no data are hidden.'}</p>
          </aside>
          {drawer && <div className="mk-scrim" onClick={() => setDrawer(false)} />}

          {/* Results */}
          <main className="mk-results">
            <div className="mk-resultshead">
              <div className="mk-count">
                {loading ? (lang === 'es' ? 'Cargando…' : 'Loading…') : lang === 'es'
                  ? `${results.length} ${tab === 'product' ? (results.length === 1 ? 'producto' : 'productos') : tab === 'service' ? (results.length === 1 ? 'servicio' : 'servicios') : tab === 'technology' ? (results.length === 1 ? 'tecnología' : 'tecnologías') : (results.length === 1 ? 'resultado' : 'resultados')}`
                  : `${results.length} ${tab === 'product' ? (results.length === 1 ? 'product' : 'products') : tab === 'service' ? (results.length === 1 ? 'service' : 'services') : tab === 'technology' ? (results.length === 1 ? 'technology' : 'technologies') : (results.length === 1 ? 'result' : 'results')}`}
                {q && !loading ? <> {lang === 'es' ? 'para' : 'for'} <b>“{q}”</b></> : null}
              </div>
              {/* Slim inline RFQ affordance — replaces the old "Can't find what
                  you need?" storefront banner (removed 2026-07-24). Same
                  destination (/intake), same message, but a single line next
                  to the result count instead of a block above the grid, so
                  listings still lead. Hidden while loading/session-expired,
                  where it isn't the relevant next action. */}
              {!loading && !authError && (
                <Link href="/intake" className="mk-rfqinline">
                  {lang === 'es' ? '¿No encuentras lo que necesitas? Publica una solicitud →' : "Can't find what you need? Post a request →"}
                </Link>
              )}
            </div>
            {activeFilterCount > 0 && (
              <div className="mk-activechips">
                {fCategory.map((v) => <button key={`cat-${v}`} onClick={() => toggleCategory(v)}>{v} ✕</button>)}
                {fIndustry.map((v) => <button key={`ind-${v}`} onClick={() => toggleIndustry(v)}>{v} ✕</button>)}
                {fPrice.map((v) => <button key={`price-${v}`} onClick={() => togglePrice(v)}>{(lang === 'es' ? PRICE_LABEL_ES : PRICE_LABEL_EN)[v as PriceBucket] || v} ✕</button>)}
                {fAvail.map((v) => <button key={`avail-${v}`} onClick={() => toggleAvail(v)}>{(lang === 'es' ? AVAIL_LABEL_ES : AVAIL_LABEL_EN)[v as AvailKey] || v} ✕</button>)}
                {fLocation.map((v) => <button key={`loc-${v}`} onClick={() => toggleLocation(v)}>{v} ✕</button>)}
                {fPilot && <button onClick={() => setFPilot(false)}>{lang === 'es' ? 'Piloto' : 'Pilot'} ✕</button>}
                {fLocal && <button onClick={() => setFLocal(false)}>{lang === 'es' ? 'Soporte local' : 'Local support'} ✕</button>}
                {fFast && <button onClick={() => setFFast(false)}>{lang === 'es' ? 'Rápido' : 'Fast'} ✕</button>}
                {fEmergency && <button onClick={() => setFEmergency(false)}>24/7 ✕</button>}
                {fVerified && <button onClick={() => setFVerified(false)}>{lang === 'es' ? 'Verificado' : 'Verified'} ✕</button>}
                <button className="all" onClick={resetFilters}>{lang === 'es' ? 'Limpiar todo' : 'Clear all'}</button>
              </div>
            )}

            {loading ? (
              <div className="mk-skeletons">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="mk-skel" />)}</div>
            ) : authError ? (
              <SessionExpired lang={lang} next={authNext} />
            ) : marketplaceEmpty ? (
              <EmptyMarketplace lang={lang} />
            ) : results.length === 0 ? (
              <NoResults lang={lang} q={q} savedOnly={savedOnly} suggestions={suggestions} onPick={setQ} onReset={() => { resetFilters(); setSavedOnly(false); }} />
            ) : (
              <div className="mk-grid">
                {results.map((c) => (
                  <ListingCard
                    key={c.id}
                    c={c}
                    lang={lang}
                    saved={saved.has(c.id)}
                    inCompare={compare.has(c.id)}
                    compareFull={compareFull}
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
            <b>{compareCards.length}</b> {lang === 'es' ? 'para comparar' : 'to compare'}: {compareCards.map((c) => c.name).join(' · ').slice(0, 70)}{compareCards.map((c) => c.name).join(' · ').length > 70 ? '…' : ''}
          </span>
          <button className="mk-mini on" onClick={() => setShowCompare(true)} disabled={compareCards.length < 2}>{lang === 'es' ? 'Comparar ahora' : 'Compare now'}</button>
          <button className="mk-mini" onClick={() => compareCards.forEach((c) => toggleCompare(c.id))}>{lang === 'es' ? 'Limpiar' : 'Clear'}</button>
        </div>
      )}

      {showCompare && compareCards.length >= 2 && (
        <CompareModal cards={compareCards} lang={lang} onClose={() => setShowCompare(false)} />
      )}
    </div>
  );
}

// ---- sub-components ----
// Badge copy matches the exact ES wording already used for these same
// concepts on /marketplace/[kind]/[id] (kindProduct/kindService/warranty/
// pilotAvailable/leadTime/response/emergency) so a listing reads consistently
// across the grid and its detail page.
function ListingCard({ c, lang, saved, inCompare, compareFull, onSave, onCompare }: { c: Card; lang: Lang; saved: boolean; inCompare: boolean; compareFull: boolean; onSave: () => void; onCompare: () => void }) {
  const es = lang === 'es';
  return (
    <div className="mk-card">
      <Link href={`/marketplace/${c.kind}/${c.id}`} className="mk-card-img">
        {/* No repeat of "Product"/"Service" here — the kind badge right below
            already says it (fix for cards without a photo showing it twice). */}
        {c.image_url ? <img src={c.image_url} alt={c.name} loading="lazy" /> : <div className="mk-noimg">NXT//LINK</div>}
        {/* Verified signal promoted to a small corner chip on the photo
            (photo-forward polish, 2026-07-30) — same condition/text/title as
            before, just repositioned off the badge row so the image carries
            the one primary trust signal at a glance. */}
        {levelAtLeast(c.vendor_verification_level, 'identity_verified')
          ? <span className="mk-verifiedchip" title={es ? 'La identidad del dueño de este proveedor fue verificada por NXT//LINK' : "This vendor's owner identity was verified by NXT//LINK"}><BadgeCheck size={12} aria-hidden="true" />{es ? 'Identidad verificada' : 'Verified identity'}</span>
          : c.vendor_verified && <span className="mk-verifiedchip" title={es ? 'El negocio de este proveedor fue revisado y aprobado por NXT//LINK' : "This vendor's business was reviewed and approved by NXT//LINK"}><BadgeCheck size={12} aria-hidden="true" />{es ? 'Verificado' : 'Verified'}</span>}
      </Link>
      <div className="mk-card-body">
        <div className="mk-kindrow">
          <span className={'mk-kind ' + c.kind}>{es ? KIND_LABEL_ES[c.kind] : c.kind}</span>
          {levelAtLeast(c.vendor_verification_level, 'insurance_reviewed') && <span className="mk-badge trust" title={es ? 'Comprobante de seguro registrado con NXT//LINK' : 'Proof of insurance on file with NXT//LINK'}>{es ? 'Asegurado' : 'Insured'}</span>}
          {levelAtLeast(c.vendor_verification_level, 'certifications_reviewed') && <span className="mk-badge cert" title={es ? 'Certificaciones de la industria revisadas por NXT//LINK' : 'Industry certifications reviewed by NXT//LINK'}>{es ? 'Certificado' : 'Certified'}</span>}
          {c.pilot?.available && <span className="mk-badge" title={es ? 'Puedes probarlo antes de comprar (piloto/demo disponible)' : 'You can test this before buying (pilot/demo available)'}>{es ? 'Piloto' : 'Pilot'}</span>}
          {c.warranty_support?.warranty && <span className="mk-badge" title={es ? 'Detalles de garantía proporcionados por el proveedor' : 'Warranty details provided by the vendor'}>{es ? 'Garantía' : 'Warranty'}</span>}
          {c.has_case_studies && <span className="mk-badge" title={es ? 'Resultados reales de clientes documentados' : 'Real customer results documented'}>{es ? 'Caso de éxito' : 'Case study'}</span>}
          {c.has_documents && <span className="mk-badge" title={es ? 'Fichas técnicas / folletos adjuntos' : 'Spec sheets / brochures attached'}>{es ? 'Documentos' : 'Docs'}</span>}
          {isLocal(c) && <span className="mk-badge" title={es ? 'Atiende localmente El Paso / Juárez' : 'Serves El Paso / Juárez locally'}>{es ? 'Soporte local' : 'Local support'}</span>}
          {isFast(c) && <span className="mk-badge" title={es ? 'Tiempo de respuesta rápido según el proveedor' : 'Fast turnaround stated by the vendor'}>{es ? `${c.kind === 'service' ? 'Respuesta' : 'Entrega'} rápida` : `Fast ${c.kind === 'service' ? 'response' : 'lead time'}`}</span>}
          {c.emergency_available && <span className="mk-badge urgent" title={es ? 'Servicio de emergencia 24/7 disponible' : '24/7 emergency service available'}>24/7</span>}
        </div>
        <Link href={`/marketplace/${c.kind}/${c.id}`} className="mk-name">{c.name}</Link>
        <div className="mk-vendor">
          {c.vendor_id ? <Link href={`/marketplace/vendor/${c.vendor_id}`} className="mk-vlink">{c.vendor_name}</Link> : c.vendor_name}
          {c.vendor_city ? ` · ${c.vendor_city}` : ''}
          {typeof c.vendor_rating === 'number' && (c.vendor_review_count || 0) > 0 && (
            <span className="mk-rating">★ {c.vendor_rating.toFixed(1)} <small>({c.vendor_review_count})</small></span>
          )}
        </div>
        {/* Price promoted to its own bold line (photo-forward polish,
            2026-07-30) — same data/fromPrice() logic as before, just given
            visual weight of its own instead of sharing the small meta row
            with lead-time/response. Mono per the design system's own rule
            ("IBM Plex Mono for anything a person will compare or quote:
            money"). */}
        {(c.pricing?.range || c.pricing?.model || c.pricing_model) && (
          <div className="mk-price">{c.pricing?.range ? fromPrice(c.pricing.range) : (c.pricing?.model || c.pricing_model)}</div>
        )}
        {c.best_for.length > 0 && <div className="mk-tags">{c.best_for.slice(0, 3).map((t) => <span key={t}>{t}</span>)}</div>}
        <div className="mk-meta">
          {c.kind === 'product' && c.lead_time && <span>{es ? 'Tiempo de entrega' : 'Lead time'}: {c.lead_time}</span>}
          {c.kind === 'service' && c.response_time && <span>{es ? 'Respuesta' : 'Response'}: {c.response_time}</span>}
        </div>
        <div className="mk-actions">
          <button className={'mk-mini' + (saved ? ' on' : '')} onClick={onSave}>{saved ? (es ? 'Guardado' : 'Saved') : (es ? 'Guardar' : 'Save')}</button>
          <button
            className={'mk-mini' + (inCompare ? ' on' : '')}
            onClick={onCompare}
            disabled={!inCompare && compareFull}
            title={!inCompare && compareFull ? (es ? 'Compara hasta 5 artículos' : 'Compare up to 5 items') : undefined}
          >
            {inCompare ? (es ? 'En comparación' : 'In compare') : (es ? 'Comparar' : 'Compare')}
          </button>
          <AddToCartButton
            listing={{ id: c.id, kind: c.kind, name: c.name, vendor_id: c.vendor_id || null, vendor_name: c.vendor_name || null }}
            className="mk-mini"
            activeClassName="on"
          />
          <Link className="mk-quote" href={`/marketplace/${c.kind}/${c.id}#quote`}>{es ? 'Solicitar cotización' : 'Request quote'}</Link>
        </div>
      </div>
    </div>
  );
}

// Amazon-style facet count: value + how many results have it, e.g. "Automation & Robotics (5)".
type FacetOption = [value: string, count: number];

function FacetCheck({ label, checked, onChange, count, icon: IconComp }: { label: string; checked: boolean; onChange: (v: boolean) => void; count?: number; icon?: LucideIcon }) {
  return (
    <label className={'mk-facetcheck' + (checked ? ' on' : '')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {IconComp && <IconComp size={14} strokeWidth={1.75} className="mk-facetcheck-icon" aria-hidden="true" />}
      <span>{label}</span>
      {typeof count === 'number' && <span className="mk-facetcount">({count})</span>}
    </label>
  );
}
// Shared "checkbox facet with counts" group — used for the multi-select
// Price range / How you can get it / Location facets (OR logic: a listing
// matches if it has ANY checked value). Reuses the same .mk-facetcheck
// styling as the single "Show only" checkboxes above so it looks native, not
// bolted on. `labelFor` is optional: Location's values ARE their display text
// (real city names), but Price range / How-you-get-it use internal keys
// ('under10k', 'buy'...) so they can pass a bilingual label lookup instead.
function FacetCheckGroup({ label, options, values, onToggle, labelFor }: { label: string; options: FacetOption[]; values: string[]; onToggle: (v: string) => void; labelFor?: (value: string) => string }) {
  if (options.length === 0) return null;
  return (
    <div className="mk-facet">
      <div className="mk-facetlabel">{label}</div>
      <div className="mk-facetgroup">
        {options.map(([o, n]) => (
          <label key={o} className={'mk-facetcheck' + (values.includes(o) ? ' on' : '')}>
            <input type="checkbox" checked={values.includes(o)} onChange={() => onToggle(o)} />
            <span>{labelFor ? labelFor(o) : o}</span>
            <span className="mk-facetcount">({n})</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SolutionsPanel({ lang, onPick, starters }: { lang: Lang; onPick: (p: string) => void; starters: string[] }) {
  const es = lang === 'es';
  return (
    <div className="mk-solutions">
      <h2>{es ? 'Describe el resultado que necesitas' : 'Describe the outcome you need'}</h2>
      <p>{es
        ? <>Las soluciones combinan los productos y servicios adecuados para un objetivo. Dile a NXT{'//'}LINK el problema y armamos una lista comparable — o empieza con un objetivo común abajo.</>
        : <>Solutions bundle the right products and services for a goal. Tell NXT{'//'}LINK the problem and we build a comparable shortlist — or start from a common goal below.</>}</p>
      {/* Starter chips stay in English on purpose: clicking one sets this
          exact text as the search query against English-only listing data
          (relevance() matches name/category/best_for/industries verbatim) —
          translating the label would also translate the query and silently
          break the match. Visual/i18n only per task scope; not a copy gap. */}
      <div className="mk-starters">
        {starters.map((s) => <button key={s} onClick={() => onPick(s)}>{s}</button>)}
      </div>
      <Link className="mk-asknxt" href="/intake">{es ? 'Describe tu proyecto → obtén una lista de NXT//LINK' : 'Describe your project → get an NXT//LINK shortlist'}</Link>
    </div>
  );
}

// Session expired mid-browse (or a stale/expired cookie survived the
// middleware's cheap presence check) — the listings API's real server-side
// getUser() check caught it. This is NOT "zero vendors": distinct copy, and
// a Sign in link that carries the buyer straight back to where they were.
function SessionExpired({ lang, next }: { lang: Lang; next: string }) {
  const es = lang === 'es';
  return (
    <div className="mk-empty big">
      <b>{es ? 'Tu sesión terminó' : 'Your session ended'}</b>
      <p>{es
        ? 'Por tu seguridad cerramos tu sesión tras un tiempo de inactividad. Inicia sesión de nuevo para seguir viendo el marketplace.'
        : "For your security you were signed out after a period of inactivity. Sign in again to keep browsing the marketplace."}</p>
      <div className="mk-emptyactions">
        <Link className="mk-quote" href={`/login?next=${encodeURIComponent(next)}`}>{es ? 'Iniciar sesión' : 'Sign in'}</Link>
      </div>
    </div>
  );
}

function EmptyMarketplace({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  return (
    <div className="mk-empty big">
      <b>{es ? 'Aún no hay publicaciones' : 'No published listings yet'}</b>
      <p>{es ? 'Los proveedores todavía están armando sus escaparates. Vuelve pronto, o dile a NXT//LINK qué necesitas y lo buscamos.' : "Vendors are still building their storefronts. Check back soon, or tell NXT//LINK what you need and we'll source it."}</p>
      <div className="mk-emptyactions">
        <Link className="mk-quote" href="/intake">{es ? 'Pide a NXT//LINK que lo encuentre' : 'Ask NXT//LINK to find it'}</Link>
        <Link className="mk-mini" href="/vendor-login">{es ? '¿Eres proveedor? Publica aquí' : 'Are you a vendor? List here'}</Link>
      </div>
    </div>
  );
}

function NoResults({ lang, q, savedOnly, suggestions, onPick, onReset }: { lang: Lang; q: string; savedOnly: boolean; suggestions: string[]; onPick: (v: string) => void; onReset: () => void }) {
  const es = lang === 'es';
  return (
    <div className="mk-empty big">
      <b>{es ? 'Sin coincidencias' : 'No matches'}{q ? ` ${es ? 'para' : 'for'} “${q}”` : ''}</b>
      <p>{savedOnly ? (es ? 'Nada guardado coincide con estos filtros.' : 'Nothing saved matches these filters.') : (es ? 'Prueba con menos filtros, o explora estos:' : 'Try fewer filters, or explore these:')}</p>
      {suggestions.length > 0 && (
        <div className="mk-starters">
          {suggestions.map((s) => <button key={s} onClick={() => { onReset(); onPick(s); }}>{s}</button>)}
        </div>
      )}
      <div className="mk-emptyactions">
        <button className="mk-mini" onClick={onReset}>{es ? 'Limpiar filtros' : 'Clear filters'}</button>
        <Link className="mk-quote" href="/intake">{es ? 'Pide a NXT//LINK que lo encuentre' : 'Ask NXT//LINK to find it'}</Link>
      </div>
    </div>
  );
}

function CompareModal({ cards, lang, onClose }: { cards: Card[]; lang: Lang; onClose: () => void }) {
  const es = lang === 'es';
  const yes = es ? 'Sí' : 'Yes';
  // Modal a11y (audit Global Quick Win #6): role="dialog" + aria-modal, focus
  // moved to the close button on open, Escape closes — same reference
  // pattern as src/app/admin/invites/page.tsx's QROverlay.
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const rows: Array<[string, (c: Card) => string]> = es ? [
    ['Proveedor', (c) => c.vendor_name],
    ['Tipo', (c) => KIND_LABEL_ES[c.kind]],
    ['Categoría', (c) => c.category || '—'],
    ['Ideal para', (c) => c.best_for.join(', ') || '—'],
    ['Industrias', (c) => c.industries.join(', ') || '—'],
    ['Piloto / demo', (c) => (c.pilot?.available ? 'Disponible' : '—')],
    ['Entrega / respuesta', (c) => c.lead_time || c.response_time || '—'],
    ['Precio', (c) => c.pricing?.range || c.pricing?.model || c.pricing_model || 'Solicitar cotización'],
    ['Garantía', (c) => c.warranty_support?.warranty || '—'],
    ['Área de servicio', (c) => (c.service_areas || []).join(', ') || '—'],
    ['Casos de éxito', (c) => (c.has_case_studies ? yes : '—')],
    ['Documentos', (c) => (c.has_documents ? yes : '—')],
    ['Verificado', (c) => (c.vendor_verified ? yes : '—')],
  ] : [
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
    ['Case studies', (c) => (c.has_case_studies ? yes : '—')],
    ['Documents', (c) => (c.has_documents ? yes : '—')],
    ['Verified', (c) => (c.vendor_verified ? yes : '—')],
  ];
  return (
    <div
      className="mk-modal nxm-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={es ? `Comparar ${cards.length} publicaciones` : `Compare ${cards.length} listings`}
    >
      <div className="mk-modal-in nxm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mk-modal-head"><b>{es ? `Comparar ${cards.length} publicaciones` : `Compare ${cards.length} listings`}</b><button ref={closeRef} onClick={onClose}>{es ? 'Cerrar' : 'Close'}</button></div>
        <div className="mk-ctable-wrap">
          <table className="mk-ctable">
            <thead><tr><th></th>{cards.map((c) => <th key={c.id}><Link href={`/marketplace/${c.kind}/${c.id}`}>{c.name}</Link></th>)}</tr></thead>
            <tbody>
              {rows.map(([label, get]) => (
                <tr key={label}><td>{label}</td>{cards.map((c) => <td key={c.id}>{get(c)}</td>)}</tr>
              ))}
              <tr><td></td>{cards.map((c) => <td key={c.id}><Link className="mk-quote" href={`/marketplace/${c.kind}/${c.id}#quote`}>{es ? 'Solicitar cotización' : 'Request quote'}</Link></td>)}</tr>
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
.mk-hero h1{font-size:clamp(24px,4vw,38px);font-weight:800;letter-spacing:-.02em;color:var(--spec-ink);text-wrap:balance;}
.mk-hero p{color:var(--spec-text-2nd);font-size:15px;margin:10px auto 0;max-width:560px;line-height:1.6;}
/* Department band — tidied 2026-07-24: a hairline-bordered white band gives
   the department strip its own visual layer, distinct from the search bar
   above and the tabs row below (was a bare flex row sitting on the page
   background). Same .mk-dept buttons/behavior inside, unchanged. */
.mk-deptband{background:#fff;border-top:1px solid var(--spec-border);border-bottom:1px solid var(--spec-border);}
.mk-deptbar{display:flex;gap:8px;overflow-x:auto;max-width:1200px;margin:0 auto;padding:12px 20px;scrollbar-width:none;}
.mk-deptbar::-webkit-scrollbar{display:none;}
.mk-dept{flex-shrink:0;display:inline-flex;align-items:center;gap:7px;font-family:inherit;font-size:13px;font-weight:600;color:var(--spec-text-2nd);background:var(--spec-warm-white);border:1px solid var(--spec-border);border-radius:99px;padding:9px 15px;cursor:pointer;white-space:nowrap;transition:border-color var(--spec-duration-fast) var(--spec-ease),background var(--spec-duration-fast) var(--spec-ease);}
.mk-dept:hover{border-color:var(--spec-violet);}
.mk-dept.on{background:rgba(108,92,224,.14);border-color:var(--spec-violet);color:var(--spec-violet-deep);}
.mk-dept.svc{color:#1F7A54;}
.mk-dept.svc.on{background:rgba(47,158,106,.12);border-color:#1F7A54;color:#1F7A54;}
.mk-deptn{font-size:11px;font-weight:700;color:var(--spec-text-2nd);background:var(--spec-surface);border-radius:99px;padding:1px 7px;}
.mk-dept.on .mk-deptn{color:inherit;background:rgba(108,92,224,.14);}
.mk-searchbar{padding:22px 20px 6px;max-width:1200px;margin:0 auto;}
.mk-searchwrap{position:relative;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--spec-border);border-radius:14px;padding:0 16px;color:var(--spec-text-2nd);transition:border-color var(--spec-duration-fast) var(--spec-ease);}
.mk-suggest{position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:40;list-style:none;margin:0;padding:6px;background:#fff;border:1px solid var(--spec-border);border-radius:13px;box-shadow:0 24px 60px -18px rgba(20,19,32,.3);max-height:340px;overflow-y:auto;}
.mk-suggest li{margin:0;}
.mk-suggest button{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:none;border:none;color:var(--spec-ink);font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;cursor:pointer;transition:background var(--spec-duration-fast) var(--spec-ease);}
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
.mk-facetlabel{font-size:12px;font-weight:600;letter-spacing:var(--spec-tracking-eyebrow);text-transform:uppercase;color:var(--spec-text-2nd);}
.mk-facet select{font-family:inherit;font-size:13.5px;padding:10px 11px;border-radius:10px;border:1px solid var(--spec-border);background:var(--spec-warm-white);color:var(--spec-ink);outline:none;}
.mk-facet select:focus{border-color:var(--spec-violet);}
.mk-facetcheck{display:flex;align-items:center;gap:9px;font-size:13.5px;color:var(--spec-ink);cursor:pointer;padding:5px 8px;margin:0 -8px;border-radius:8px;border:1px solid transparent;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease),border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.mk-facetcheck:hover{background:var(--spec-warm-white,#F8F7FB);}
.mk-facetcheck.on{background:var(--spec-violet-bg,#EDEAFB);border-color:var(--spec-violet,#6C5CE0);}
.mk-facetcheck input{accent-color:var(--spec-violet);width:15px;height:15px;flex-shrink:0;}
.mk-facetcheck-icon{color:var(--spec-text-2nd);flex-shrink:0;}
.mk-facetcheck.on .mk-facetcheck-icon{color:var(--spec-violet-deep,#4A3DB0);}
.mk-facetcheck span:first-of-type{flex:1;}
.mk-facetcheck.on span:first-of-type{color:var(--spec-violet-deep,#4A3DB0);font-weight:600;}
.mk-facetcount{color:var(--spec-text-2nd);font-size:12px;font-weight:400;flex-shrink:0;}
.mk-facetgroup{display:flex;flex-direction:column;max-height:196px;overflow-y:auto;padding-right:2px;}
.mk-railnote{font-size:11.5px;color:var(--spec-text-2nd);line-height:1.5;margin:2px 0 0;}
.mk-results{min-width:0;}
.mk-resultshead{display:flex;align-items:baseline;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:4px 2px 12px;}
.mk-count{font-size:13.5px;color:var(--spec-text-2nd);}
.mk-count b{color:var(--spec-violet-deep);}
/* Slim inline "Can't find what you need?" prompt — replaces the old
   full-width RFQ banner (removed 2026-07-24); sits on the same line as the
   result count so it adds zero extra vertical space above the grid. */
.mk-rfqinline{flex-shrink:0;font-size:12.5px;font-weight:600;color:var(--spec-violet-deep);text-decoration:none;white-space:nowrap;}
.mk-rfqinline:hover{text-decoration:underline;}
.mk-activechips{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 16px;}
.mk-activechips button{font-family:inherit;font-size:12px;font-weight:600;padding:6px 11px;border-radius:99px;border:1px solid rgba(108,92,224,.35);background:rgba(108,92,224,.1);color:var(--spec-violet-deep);cursor:pointer;transition:background var(--spec-duration-fast) var(--spec-ease);}
.mk-activechips button:hover{background:rgba(108,92,224,.2);}
.mk-activechips button.all{border-color:var(--spec-border);background:none;color:var(--spec-text-2nd);}
.mk-cnames{max-width:min(420px, calc(100vw - 220px));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:0;}
.mk-cnames b{color:var(--spec-violet-deep);}
.mk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.mk-card{background:#fff;border:1px solid var(--spec-border);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:border-color var(--spec-duration-fast) var(--spec-ease),transform var(--spec-duration-fast) var(--spec-ease),box-shadow var(--spec-duration-fast) var(--spec-ease);}
/* Hover lift per the motion vocabulary (translateY(-2px) + soft shadow —
   already this shape, kept as-is) extended with a quiet photo zoom so the
   card reads as photo-forward on interaction, not just on the border. */
.mk-card:hover{border-color:var(--spec-violet);transform:translateY(-2px);box-shadow:0 16px 32px -18px rgba(20,19,32,.22);}
.mk-card:hover .mk-card-img img{transform:scale(1.035);}
/* Photo-forward polish (2026-07-30): taller, edge-to-edge image area (was
   150px) so the photo carries the card, same object-fit:cover crop. */
.mk-card-img{position:relative;display:block;height:184px;background:var(--spec-surface);overflow:hidden;}
.mk-card-img img{width:100%;height:100%;object-fit:cover;transition:transform var(--spec-duration-fast) var(--spec-ease);}
.mk-noimg{height:100%;display:grid;place-items:center;color:var(--spec-text-2nd);font-size:13px;letter-spacing:.15em;text-transform:uppercase;}
/* Verified signal as a small corner chip on the photo (moved out of the
   badge row) — solid near-opaque surface so it stays legible over any
   photo, small enough to stay a quiet trust cue, not a banner. */
.mk-verifiedchip{position:absolute;top:10px;right:10px;display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border-radius:99px;background:rgba(255,255,255,.96);color:#1F7A54;font-size:10.5px;font-weight:700;box-shadow:0 2px 8px rgba(20,19,32,.18);}
.mk-verifiedchip svg{flex-shrink:0;}
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
.mk-name{font-size:15.5px;font-weight:700;color:var(--spec-ink);text-decoration:none;line-height:1.3;transition:color var(--spec-duration-fast) var(--spec-ease);}
.mk-name:hover{color:var(--spec-violet-deep);}
.mk-vendor{font-size:12.5px;color:var(--spec-text-2nd);}
.mk-vlink{color:var(--spec-text-2nd);text-decoration:none;font-weight:600;transition:color var(--spec-duration-fast) var(--spec-ease);}
.mk-vlink:hover{color:var(--spec-violet-deep);text-decoration:underline;}
.mk-rating{margin-left:8px;color:#8A5D14;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums;}
.mk-rating small{color:var(--spec-text-2nd);font-weight:400;}
/* Bolder, standalone price line (photo-forward polish, 2026-07-30) — mono
   per the design system's own rule for anything a person compares/quotes
   ("From $X · final in quote" text is unchanged, fromPrice() untouched). */
.mk-price{font-family:var(--font-ibm-plex-mono);font-size:16.5px;font-weight:700;color:var(--spec-ink);letter-spacing:-.01em;}
.mk-tags{display:flex;flex-wrap:wrap;gap:5px;}
.mk-tags span{font-size:11px;color:var(--spec-violet-deep);background:rgba(108,92,224,.08);padding:3px 8px;border-radius:6px;}
.mk-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--spec-text-2nd);margin-top:auto;padding-top:4px;font-variant-numeric:tabular-nums;}
.mk-actions{display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap;}
.mk-mini{font-family:inherit;font-size:12px;font-weight:600;padding:8px 10px;border-radius:9px;border:1px solid var(--spec-border);background:none;color:var(--spec-text-2nd);cursor:pointer;text-decoration:none;}
.mk-mini.on{border-color:var(--spec-violet);color:var(--spec-violet-deep);background:rgba(108,92,224,.1);}
.mk-mini:disabled{opacity:.5;}
.mk-quote{margin-left:auto;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:9px;background:var(--spec-violet);color:#fff;text-decoration:none;white-space:nowrap;transition:background var(--spec-duration-fast) var(--spec-ease);}
.mk-quote:hover{background:var(--spec-violet-deep);}
a.mk-quote:active{transform:scale(.98);transition:transform .1s ease;}
.mk-skeletons{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.mk-skel{height:320px;border-radius:16px;background:linear-gradient(100deg,#EFEDF5 30%,#E4E1EF 50%,#EFEDF5 70%);background-size:200% 100%;animation:mkpulse 1.3s ease-in-out infinite;}
@keyframes mkpulse{0%{background-position:100% 0;}100%{background-position:-100% 0;}}
@media (prefers-reduced-motion:reduce){.mk-skel{animation:none;}}
.mk-empty{text-align:center;color:var(--spec-text-2nd);padding:50px 0;}
.mk-empty.big{background:#fff;border:1px solid var(--spec-border);border-radius:18px;padding:48px 24px;}
.mk-empty b{display:block;font-size:18px;color:var(--spec-ink);margin-bottom:8px;}
.mk-empty p{font-size:14px;line-height:1.6;max-width:420px;margin:0 auto 18px;}
.mk-emptyactions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
.mk-starters{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:18px;}
.mk-starters button{font-family:inherit;font-size:13px;color:var(--spec-violet-deep);background:rgba(108,92,224,.08);border:1px solid rgba(108,92,224,.3);border-radius:99px;padding:8px 14px;cursor:pointer;transition:background var(--spec-duration-fast) var(--spec-ease);}
.mk-starters button:hover{background:rgba(108,92,224,.16);}
.mk-solutions{max-width:720px;margin:10px auto;padding:44px 24px 120px;text-align:center;}
.mk-solutions h2{font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--spec-ink);}
.mk-solutions p{color:var(--spec-text-2nd);font-size:15px;line-height:1.6;margin:12px auto 24px;max-width:560px;}
.mk-asknxt{display:inline-block;margin-top:8px;font-size:14.5px;font-weight:700;padding:13px 22px;border-radius:12px;background:var(--spec-violet);color:#fff;text-decoration:none;transition:background var(--spec-duration-fast) var(--spec-ease);}
.mk-asknxt:hover{background:var(--spec-violet-deep);}
a.mk-asknxt:active{transform:scale(.98);transition:transform .1s ease;}
.mk-scrim{display:none;}
.mk-cbar{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--spec-border);border-radius:14px;padding:12px 18px;font-size:13.5px;color:var(--spec-ink);z-index:35;box-shadow:0 10px 40px rgba(20,19,32,.2);max-width:calc(100vw - 24px);box-sizing:border-box;flex-wrap:wrap;justify-content:center;}
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
  /* Edge fade hints that more departments are scrollable off-screen — cheap,
     mobile-only per the research doc (desktop's row usually fits without
     scrolling, so a fade there would just dim fully-visible pills). */
  .mk-deptbar{-webkit-mask-image:linear-gradient(to right,transparent 0,#000 16px,#000 calc(100% - 16px),transparent 100%);mask-image:linear-gradient(to right,transparent 0,#000 16px,#000 calc(100% - 16px),transparent 100%);}
  .mk-resultshead{flex-direction:column;align-items:flex-start;gap:4px;}
  .mk-layout{grid-template-columns:1fr;}
  .mk-filterbtn{display:inline-flex;}
  .mk-rail{position:fixed;top:0;left:0;bottom:0;width:300px;max-width:88vw;z-index:50;border-radius:0;transform:translateX(-105%);transition:transform .22s var(--spec-ease);overflow-y:auto;}
  .mk-rail.open{transform:translateX(0);}
  .mk-railclose{display:inline-block;}
  .mk-scrim{display:block;position:fixed;inset:0;background:rgba(20,19,32,.4);z-index:45;}
}
`;
