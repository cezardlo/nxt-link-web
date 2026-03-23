'use client';

import { Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { COLORS } from '@/lib/tokens';
import { PRODUCT_CATALOG, CATEGORY_COLORS, type Product } from '@/lib/data/product-catalog';
import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'products' | 'vendors' | 'technologies' | 'contracts';

type VendorRow = {
  id: number;
  company_name: string | null;
  company_url: string | null;
  description: string | null;
  primary_category: string | null;
  extraction_confidence: number | null;
  status: string | null;
  created_at: string | null;
};

type SortMode = 'TOP_RATED' | 'MOMENTUM' | 'PRICE_ASC' | 'PRICE_DESC';

type MaturityFilter = 'all' | 'emerging' | 'growing' | 'mature';

// ── Tab Config ───────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'products', label: 'Products' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'technologies', label: 'Technologies' },
  { key: 'contracts', label: 'Contracts' },
];

// ── Shared Helpers ───────────────────────────────────────────────────────────

const CATEGORY_LIST = [
  'All',
  'Cybersecurity',
  'AI/ML',
  'Manufacturing',
  'Defense',
  'Energy',
  'Healthcare',
] as const;

type CategoryFilter = (typeof CATEGORY_LIST)[number];

function getCategoryColor(cat: string): string {
  const normalized = cat.toLowerCase().replace(/\/.*$/, '').trim();
  const map: Record<string, string> = {
    cybersecurity: CATEGORY_COLORS.cybersecurity,
    ai: CATEGORY_COLORS.AI,
    'ai/ml': CATEGORY_COLORS.AI,
    manufacturing: CATEGORY_COLORS.manufacturing,
    defense: CATEGORY_COLORS.defense,
    energy: CATEGORY_COLORS.energy,
    healthcare: CATEGORY_COLORS.healthcare,
    drones: '#00d4ff',
    robots: '#a855f7',
    'ai hardware': '#00ff88',
    sensors: '#60a5fa',
    logistics: '#fb923c',
  };
  return map[normalized] ?? map[cat.toLowerCase()] ?? '#00d4ff';
}

function getPriceTier(estimate: Product['priceEstimate']): string {
  const map: Record<Product['priceEstimate'], string> = {
    low: '$',
    medium: '$$',
    high: '$$$',
    enterprise: '$$$$',
  };
  return map[estimate];
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#00d4ff';
  if (score >= 40) return '#ffd700';
  return '#ff8c00';
}

function getMomentumLabel(m: Product['momentum']): string {
  if (m === 'rising') return '▲ rising';
  if (m === 'stable') return '→ stable';
  return '▼ declining';
}

function getMomentumColor(m: Product['momentum']): string {
  if (m === 'rising') return '#00ff88';
  if (m === 'stable') return '#ffb800';
  return '#ff3b30';
}

function categoryMatches(productCat: string, filter: CategoryFilter): boolean {
  if (filter === 'All') return true;
  const lc = productCat.toLowerCase();
  if (filter === 'AI/ML') return lc === 'ai/ml' || lc === 'ai' || lc === 'ml';
  return lc === filter.toLowerCase();
}

const PRICE_ORDER: Record<Product['priceEstimate'], number> = {
  low: 1,
  medium: 2,
  high: 3,
  enterprise: 4,
};

const VENDOR_CATEGORY_COLOR: Record<string, string> = {
  'Defense': COLORS.orange,
  'Defense IT': COLORS.orange,
  'AI / ML': COLORS.accent,
  'Cybersecurity': COLORS.red,
  'Logistics': COLORS.amber,
  'Border Tech': COLORS.accent,
  'Energy': COLORS.gold,
  'Health Tech': COLORS.green,
  'Manufacturing': COLORS.muted,
  'IoT': COLORS.emerald,
  'Robotics': '#ec4899',
  'Analytics': '#e879f9',
  'Enterprise IT': '#3b82f6',
};

function vendorCategoryColor(cat: string | null): string {
  if (!cat) return COLORS.muted;
  for (const [key, val] of Object.entries(VENDOR_CATEGORY_COLOR)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return COLORS.muted;
}

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ── Contract mock data ───────────────────────────────────────────────────────

const CONTRACT_CHIPS = ['Defense', 'Cybersecurity', 'AI', 'Energy', 'Healthcare', 'Manufacturing'] as const;

type Contract = {
  id: string;
  title: string;
  agency: string;
  amount: string;
  date: string;
  category: string;
};

const MOCK_CONTRACTS: Contract[] = [
  { id: 'c1', title: 'Next-Gen Border Surveillance System', agency: 'DHS / CBP', amount: '$12.4M', date: '2026-03-15', category: 'Defense' },
  { id: 'c2', title: 'AI-Powered Threat Detection Platform', agency: 'DoD / DARPA', amount: '$8.7M', date: '2026-03-10', category: 'AI' },
  { id: 'c3', title: 'Zero Trust Network Architecture Modernization', agency: 'CISA', amount: '$5.2M', date: '2026-03-08', category: 'Cybersecurity' },
  { id: 'c4', title: 'Smart Grid Resilience & Monitoring', agency: 'DOE', amount: '$15.1M', date: '2026-02-28', category: 'Energy' },
  { id: 'c5', title: 'Military Healthcare Data Integration', agency: 'VA / MHS', amount: '$6.8M', date: '2026-02-25', category: 'Healthcare' },
  { id: 'c6', title: 'Autonomous Logistics Vehicle Fleet', agency: 'Army Futures Command', amount: '$22.0M', date: '2026-02-20', category: 'Defense' },
  { id: 'c7', title: 'Advanced Manufacturing Digital Twin', agency: 'NIST MEP', amount: '$3.9M', date: '2026-02-18', category: 'Manufacturing' },
  { id: 'c8', title: 'Cybersecurity Operations Center Upgrade', agency: 'NSA', amount: '$18.5M', date: '2026-02-15', category: 'Cybersecurity' },
  { id: 'c9', title: 'Renewable Energy Storage Research', agency: 'DOE / ARPA-E', amount: '$9.3M', date: '2026-02-10', category: 'Energy' },
  { id: 'c10', title: 'Machine Learning for Predictive Maintenance', agency: 'Air Force', amount: '$7.1M', date: '2026-02-05', category: 'AI' },
];

// ── Shared UI Components ─────────────────────────────────────────────────────

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-[160px] max-w-sm rounded-sm px-3 py-1.5 font-mono text-[11px] text-white/80 placeholder-white/20 outline-none transition-colors"
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = `${COLORS.accent}80`; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
    />
  );
}

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div
      className="rounded-sm p-12 text-center"
      style={{ border: `1px solid ${COLORS.border}`, background: COLORS.surface }}
    >
      <div className="font-mono text-[10px] tracking-[0.2em] text-white/20 mb-2 uppercase">
        {message}
      </div>
      {sub && (
        <div className="font-mono text-[9px] text-white/15">{sub}</div>
      )}
    </div>
  );
}

function IkerBadge({ conf }: { conf: number | null }) {
  if (conf === null || conf === undefined) return null;
  const pct = Math.round(conf * 100);
  const color = pct >= 80 ? COLORS.green : pct >= 60 ? COLORS.accent : pct >= 40 ? COLORS.amber : COLORS.red;
  return (
    <span
      className="font-mono text-[9px] font-medium tabular-nums px-1.5 py-0.5 rounded-full"
      style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}
    >
      IKER {pct}
    </span>
  );
}

function CompanyLogo({ url, name }: { url: string | null; name: string | null }) {
  const domain = extractDomain(url);
  const initials = (name ?? '?').slice(0, 2).toUpperCase();

  if (!domain) {
    return (
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
      >
        <span className="font-grotesk text-[10px] font-medium" style={{ color: COLORS.muted }}>{initials}</span>
      </div>
    );
  }

  return (
    <div
      className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 overflow-hidden"
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
    >
      <img
        src={`https://www.google.com/s2/favicons?sz=32&domain=${domain}`}
        alt=""
        width={18}
        height={18}
        className="w-[18px] h-[18px] object-contain"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `<span class="font-grotesk text-[10px] font-medium" style="color:${COLORS.muted}">${initials}</span>`;
          }
        }}
      />
    </div>
  );
}

// ── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const color = getCategoryColor(product.category);
  const scoreColor = getScoreColor(product.recommendationScore);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden transition-all duration-300 hover:translate-y-[-2px]"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '20px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}30`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
    >
      <div className="flex flex-col flex-1 p-5 gap-0">
        {/* Name + category */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-grotesk text-[14px] font-semibold leading-snug mb-1" style={{ color: `${COLORS.text}e0` }}>
              {product.name}
            </div>
            <div className="font-mono text-[9px] tracking-[0.08em]" style={{ color: `${COLORS.text}35` }}>{product.company}</div>
          </div>
          <span
            className="shrink-0 text-[7px] tracking-[0.15em] px-2 py-0.5 rounded-full font-mono uppercase ml-2"
            style={{ background: `${color}10`, color: `${color}cc`, border: `1px solid ${color}25` }}
          >
            {product.category}
          </span>
        </div>

        <div className="h-px mb-3" style={{ background: `${COLORS.text}08` }} />

        {/* Property rows */}
        <div className="space-y-0 flex-1">
          {/* SCORE */}
          <div className="flex items-center py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="font-mono text-[9px] tracking-[0.15em] text-white/30 uppercase w-20 shrink-0">SCORE</span>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${product.recommendationScore}%`, background: scoreColor }} />
              </div>
              <span className="font-mono text-[10px] font-bold shrink-0 tabular-nums" style={{ color: scoreColor }}>
                {product.recommendationScore}
              </span>
            </div>
          </div>

          {/* PRICE */}
          <div className="flex items-center py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="font-mono text-[9px] tracking-[0.15em] text-white/30 uppercase w-20 shrink-0">PRICE</span>
            <span className="font-mono text-[11px] text-[#ffd700] font-bold tracking-wider">
              {getPriceTier(product.priceEstimate)}
            </span>
          </div>

          {/* MOMENTUM */}
          <div className="flex items-center py-1.5">
            <span className="font-mono text-[9px] tracking-[0.15em] text-white/30 uppercase w-20 shrink-0">MOMENTUM</span>
            <span className="font-mono text-[10px]" style={{ color: getMomentumColor(product.momentum) }}>
              {getMomentumLabel(product.momentum)}
            </span>
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between pt-2.5 mt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span
            className="font-mono text-[9px] tracking-[0.15em] px-2 py-1 rounded-sm transition-colors duration-150 group-hover:bg-[#00d4ff]/20 group-hover:border-[#00d4ff]/40"
            style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}
          >
            VIEW →
          </span>
          <Link
            href={`/products/compare?a=${product.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[9px] tracking-[0.15em] px-2 py-1 rounded-sm transition-colors duration-150 hover:bg-white/8 hover:text-white/60"
            style={{ color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            + COMPARE
          </Link>
        </div>
      </div>
    </Link>
  );
}

// ── Vendor Card ──────────────────────────────────────────────────────────────

function VendorCard({ vendor }: { vendor: VendorRow }) {
  const color = vendorCategoryColor(vendor.primary_category);
  return (
    <Link
      href={`/vendor/${vendor.id}`}
      className="group block p-4 transition-all duration-200 hover:translate-y-[-2px]"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}
    >
      <div className="flex items-start gap-2.5 mb-3">
        <CompanyLogo url={vendor.company_url} name={vendor.company_name} />
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-grotesk text-[14px] font-semibold truncate group-hover:opacity-90 transition-opacity" style={{ color: COLORS.text }}>
            {vendor.company_name ?? 'Unnamed'}
          </p>
        </div>
      </div>

      {vendor.primary_category && (
        <span
          className="inline-block font-grotesk text-[10px] font-medium px-2.5 py-0.5 mb-2"
          style={{ borderRadius: '9999px', color, background: `${color}15`, border: `1px solid ${color}25` }}
        >
          {vendor.primary_category}
        </span>
      )}

      {vendor.description && (
        <p className="font-grotesk text-[12px] font-light leading-[1.5] line-clamp-2 mt-1" style={{ color: COLORS.muted }}>
          {vendor.description}
        </p>
      )}

      {vendor.company_url && (
        <div className="mt-2">
          <span className="font-mono text-[9px] tracking-[0.1em]" style={{ color: COLORS.dim }}>
            {extractDomain(vendor.company_url)}
          </span>
        </div>
      )}

      {vendor.extraction_confidence !== null && vendor.extraction_confidence !== undefined && (
        <div className="mt-3">
          <IkerBadge conf={vendor.extraction_confidence} />
        </div>
      )}
    </Link>
  );
}

// ── Technology Card ──────────────────────────────────────────────────────────

function TechCard({ product }: { product: Product }) {
  const color = getCategoryColor(product.category);
  const maturityColor = product.maturity === 'emerging' ? COLORS.accent : product.maturity === 'growing' ? COLORS.green : COLORS.gold;
  const momentumColor = getMomentumColor(product.momentum);

  return (
    <div
      className="p-4 transition-all duration-200 hover:translate-y-[-1px]"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-grotesk text-[13px] font-semibold leading-snug" style={{ color: COLORS.text }}>
            {product.name}
          </div>
          <div className="font-mono text-[9px] tracking-[0.08em] mt-0.5" style={{ color: COLORS.dim }}>
            {product.company}
          </div>
        </div>
        <span
          className="shrink-0 text-[7px] tracking-[0.15em] px-2 py-0.5 rounded-full font-mono uppercase ml-2"
          style={{ background: `${color}10`, color: `${color}cc`, border: `1px solid ${color}25` }}
        >
          {product.category}
        </span>
      </div>

      <div className="h-px my-2.5" style={{ background: `${COLORS.text}08` }} />

      <div className="flex items-center gap-3 flex-wrap">
        {/* Maturity badge */}
        <span
          className="font-mono text-[9px] tracking-[0.12em] px-2 py-0.5 rounded-full uppercase"
          style={{ color: maturityColor, background: `${maturityColor}12`, border: `1px solid ${maturityColor}25` }}
        >
          {product.maturity}
        </span>

        {/* Direction */}
        <span className="font-mono text-[10px]" style={{ color: momentumColor }}>
          {getMomentumLabel(product.momentum)}
        </span>

        {/* Score */}
        <span className="font-mono text-[9px] tabular-nums ml-auto" style={{ color: getScoreColor(product.recommendationScore) }}>
          {product.recommendationScore}pts
        </span>
      </div>

      <p className="font-grotesk text-[11px] font-light leading-[1.5] line-clamp-2 mt-2.5" style={{ color: COLORS.muted }}>
        {product.description}
      </p>
    </div>
  );
}

// ── Contract Row ─────────────────────────────────────────────────────────────

function ContractRow({ contract }: { contract: Contract }) {
  const chipColor = contract.category === 'Defense' ? COLORS.orange
    : contract.category === 'Cybersecurity' ? COLORS.red
    : contract.category === 'AI' ? '#a855f7'
    : contract.category === 'Energy' ? COLORS.green
    : contract.category === 'Healthcare' ? COLORS.accent
    : COLORS.muted;

  return (
    <div
      className="flex items-start gap-4 p-4 transition-all duration-200 hover:translate-y-[-1px]"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px' }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-grotesk text-[13px] font-semibold leading-snug mb-1" style={{ color: COLORS.text }}>
          {contract.title}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[9px] tracking-[0.1em]" style={{ color: COLORS.muted }}>
            {contract.agency}
          </span>
          <span
            className="font-mono text-[8px] tracking-[0.12em] px-1.5 py-0.5 rounded-full uppercase"
            style={{ color: chipColor, background: `${chipColor}12`, border: `1px solid ${chipColor}25` }}
          >
            {contract.category}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-[12px] font-bold tabular-nums" style={{ color: COLORS.green }}>
          {contract.amount}
        </div>
        <div className="font-mono text-[9px] mt-0.5" style={{ color: COLORS.dim }}>
          {contract.date}
        </div>
      </div>
    </div>
  );
}

// ── Main Store Content ───────────────────────────────────────────────────────

function StoreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = (searchParams.get('tab') ?? 'products') as TabKey;
  const activeTab = TABS.some((t) => t.key === tabParam) ? tabParam : 'products';

  // Shared filter state
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [sortMode, setSortMode] = useState<SortMode>('TOP_RATED');
  const [maturityFilter, setMaturityFilter] = useState<MaturityFilter>('all');
  const [contractChip, setContractChip] = useState<string | null>(null);

  // Vendor state
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [vendorsFetched, setVendorsFetched] = useState(false);

  // Reset filters on tab change
  const setTab = useCallback((key: TabKey) => {
    setQuery('');
    setActiveCategory('All');
    setContractChip(null);
    setMaturityFilter('all');
    router.push(`/store?tab=${key}`, { scroll: false });
  }, [router]);

  // Load vendors when switching to vendors tab
  useEffect(() => {
    if (activeTab !== 'vendors' || vendorsFetched) return;
    let cancelled = false;

    async function load() {
      setVendorLoading(true);
      setVendorError(null);

      if (!supabase) {
        setVendorError('Supabase not configured');
        setVendorLoading(false);
        setVendorsFetched(true);
        return;
      }

      const { data, error: qErr } = await supabase
        .from('vendors')
        .select('id, company_name, company_url, description, primary_category, extraction_confidence, status, created_at')
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (qErr) {
        setVendorError(qErr.message);
      } else {
        const rows = (data as VendorRow[]) ?? [];
        const validStatuses = new Set(['active', 'approved']);
        setVendors(rows.filter((r) => validStatuses.has(r.status?.trim().toLowerCase() ?? '')));
      }
      setVendorLoading(false);
      setVendorsFetched(true);
    }

    void load();
    return () => { cancelled = true; };
  }, [activeTab, vendorsFetched]);

  // ── Filtered Products ──────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    let list = PRODUCT_CATALOG.filter((p) => {
      const matchCat = categoryMatches(p.category, activeCategory);
      const q = query.toLowerCase();
      const matchQ =
        !query ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchQ;
    });

    if (sortMode === 'TOP_RATED') list = [...list].sort((a, b) => b.recommendationScore - a.recommendationScore);
    else if (sortMode === 'MOMENTUM') {
      const order: Record<Product['momentum'], number> = { rising: 0, stable: 1, declining: 2 };
      list = [...list].sort((a, b) => order[a.momentum] - order[b.momentum]);
    } else if (sortMode === 'PRICE_ASC') list = [...list].sort((a, b) => PRICE_ORDER[a.priceEstimate] - PRICE_ORDER[b.priceEstimate]);
    else if (sortMode === 'PRICE_DESC') list = [...list].sort((a, b) => PRICE_ORDER[b.priceEstimate] - PRICE_ORDER[a.priceEstimate]);

    return list;
  }, [query, activeCategory, sortMode]);

  // ── Filtered Vendors ───────────────────────────────────────────────────────

  const filteredVendors = useMemo(() => {
    let list = vendors;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((v) =>
        (v.company_name ?? '').toLowerCase().includes(q) ||
        (v.primary_category ?? '').toLowerCase().includes(q) ||
        (v.description ?? '').toLowerCase().includes(q),
      );
    }
    if (activeCategory !== 'All') {
      const f = activeCategory.toLowerCase();
      list = list.filter((v) => (v.primary_category ?? '').toLowerCase().includes(f));
    }
    return list;
  }, [vendors, query, activeCategory]);

  // ── Filtered Technologies ──────────────────────────────────────────────────

  const filteredTechnologies = useMemo(() => {
    const list = PRODUCT_CATALOG.filter((p) => {
      const matchCat = categoryMatches(p.category, activeCategory);
      const matchMaturity = maturityFilter === 'all' || p.maturity === maturityFilter;
      const q = query.toLowerCase();
      const matchQ =
        !query ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q);
      return matchCat && matchQ && matchMaturity;
    });
    return [...list].sort((a, b) => {
      const matOrd: Record<string, number> = { emerging: 0, growing: 1, mature: 2 };
      return (matOrd[a.maturity] ?? 1) - (matOrd[b.maturity] ?? 1);
    });
  }, [query, activeCategory, maturityFilter]);

  // ── Filtered Contracts ─────────────────────────────────────────────────────

  const filteredContracts = useMemo(() => {
    let list = MOCK_CONTRACTS;
    if (contractChip) list = list.filter((c) => c.category === contractChip);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.agency.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [query, contractChip]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="min-h-screen font-mono text-white pb-24" style={{ background: COLORS.bg }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 pt-6 pb-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <div className="max-w-screen-2xl mx-auto">
            <h1
              className="font-bold tracking-[0.08em] mb-1"
              style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', color: COLORS.text }}
            >
              NXT//LINK STORE
            </h1>
            <p className="font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: COLORS.dim }}>
              Technology marketplace
            </p>
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <div className="max-w-screen-2xl mx-auto flex gap-2 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTab(tab.key)}
                  aria-pressed={isActive}
                  className="shrink-0 font-mono text-[10px] tracking-[0.12em] px-4 py-2 rounded-full transition-all duration-150 uppercase whitespace-nowrap"
                  style={
                    isActive
                      ? { background: `${COLORS.accent}18`, color: COLORS.accent, border: `1px solid ${COLORS.accent}45` }
                      : { background: 'transparent', color: COLORS.muted, border: `1px solid ${COLORS.border}` }
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Filter Bar ────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <div className="max-w-screen-2xl mx-auto flex flex-wrap gap-3 items-center">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={
                activeTab === 'products' ? 'Search products, companies, tags...'
                : activeTab === 'vendors' ? 'Search vendors...'
                : activeTab === 'technologies' ? 'Search technologies...'
                : 'Search contracts, agencies...'
              }
            />

            {/* Category dropdown (Products, Vendors, Technologies) */}
            {activeTab !== 'contracts' && (
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value as CategoryFilter)}
                className="rounded-sm px-3 py-1.5 font-mono text-[9px] tracking-[0.15em] text-white/50 outline-none cursor-pointer"
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
              >
                {CATEGORY_LIST.map((cat) => (
                  <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                ))}
              </select>
            )}

            {/* Sort (Products only) */}
            {activeTab === 'products' && (
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="rounded-sm px-3 py-1.5 font-mono text-[9px] tracking-[0.15em] text-white/50 outline-none cursor-pointer"
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
              >
                <option value="TOP_RATED">TOP RATED</option>
                <option value="MOMENTUM">MOMENTUM</option>
                <option value="PRICE_ASC">PRICE ↑</option>
                <option value="PRICE_DESC">PRICE ↓</option>
              </select>
            )}

            {/* Maturity filter (Technologies) */}
            {activeTab === 'technologies' && (
              <select
                value={maturityFilter}
                onChange={(e) => setMaturityFilter(e.target.value as MaturityFilter)}
                className="rounded-sm px-3 py-1.5 font-mono text-[9px] tracking-[0.15em] text-white/50 outline-none cursor-pointer"
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
              >
                <option value="all">ALL MATURITY</option>
                <option value="emerging">EMERGING</option>
                <option value="growing">GROWING</option>
                <option value="mature">MATURE</option>
              </select>
            )}

            {/* Contract chips */}
            {activeTab === 'contracts' && (
              <div className="flex gap-1.5 flex-wrap">
                {CONTRACT_CHIPS.map((chip) => {
                  const isActive = contractChip === chip;
                  return (
                    <button
                      key={chip}
                      onClick={() => setContractChip(isActive ? null : chip)}
                      className="font-mono text-[9px] tracking-[0.12em] px-2.5 py-1 rounded-full transition-all duration-150 uppercase"
                      style={
                        isActive
                          ? { background: `${COLORS.accent}18`, color: COLORS.accent, border: `1px solid ${COLORS.accent}45` }
                          : { background: COLORS.surface, color: COLORS.muted, border: `1px solid ${COLORS.border}` }
                      }
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Content Area ──────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-5 max-w-screen-2xl mx-auto">

          {/* ─── PRODUCTS TAB ─────────────────────────────────────────────── */}
          {activeTab === 'products' && (
            <>
              <div className="mb-3">
                <span className="font-mono text-[9px] tracking-[0.15em] text-white/20 uppercase">
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                  {query && ` for "${query}"`}
                  {activeCategory !== 'All' && ` · ${activeCategory}`}
                </span>
              </div>
              {filteredProducts.length === 0 ? (
                <EmptyState message="No products found" sub="Try a different search term or category" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProducts.map((product, i) => (
                    <div key={product.id} className="animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.06}s` }}>
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── VENDORS TAB ──────────────────────────────────────────────── */}
          {activeTab === 'vendors' && (
            <>
              {vendorLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="p-4 animate-pulse"
                      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-[10px]" style={{ background: COLORS.surface }} />
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="h-3 w-28 rounded" style={{ background: COLORS.surface }} />
                          <div className="h-2 w-full rounded" style={{ background: COLORS.surface }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!vendorLoading && vendorError && (
                <div className="p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS.red, boxShadow: `0 0 6px ${COLORS.red}` }} />
                    <span className="font-grotesk text-[13px] font-medium" style={{ color: COLORS.red }}>Registry Error</span>
                  </div>
                  <p className="font-grotesk text-[12px] font-light" style={{ color: COLORS.muted }}>{vendorError}</p>
                  <p className="font-grotesk text-[11px] font-light mt-2" style={{ color: COLORS.dim }}>
                    Configure NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to load live data.
                  </p>
                </div>
              )}

              {!vendorLoading && !vendorError && (
                <>
                  <div className="mb-3">
                    <span className="font-mono text-[9px] tracking-[0.15em] text-white/20 uppercase">
                      {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''}
                      {query && ` for "${query}"`}
                    </span>
                  </div>
                  {filteredVendors.length === 0 ? (
                    <EmptyState message="No vendors found" sub="Try a different search or category" />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredVendors.map((vendor, i) => (
                        <div key={vendor.id} className="animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.06}s` }}>
                          <VendorCard vendor={vendor} />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ─── TECHNOLOGIES TAB ─────────────────────────────────────────── */}
          {activeTab === 'technologies' && (
            <>
              <div className="mb-3">
                <span className="font-mono text-[9px] tracking-[0.15em] text-white/20 uppercase">
                  {filteredTechnologies.length} technolog{filteredTechnologies.length !== 1 ? 'ies' : 'y'}
                  {maturityFilter !== 'all' && ` · ${maturityFilter}`}
                  {query && ` for "${query}"`}
                </span>
              </div>
              {filteredTechnologies.length === 0 ? (
                <EmptyState message="No technologies found" sub="Adjust your filters" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredTechnologies.map((product, i) => (
                    <div key={product.id} className="animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.06}s` }}>
                      <TechCard product={product} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── CONTRACTS TAB ────────────────────────────────────────────── */}
          {activeTab === 'contracts' && (
            <>
              <div className="mb-3">
                <span className="font-mono text-[9px] tracking-[0.15em] text-white/20 uppercase">
                  {filteredContracts.length} contract{filteredContracts.length !== 1 ? 's' : ''}
                  {contractChip && ` · ${contractChip}`}
                  {query && ` for "${query}"`}
                </span>
              </div>
              {filteredContracts.length === 0 ? (
                <EmptyState message="No contracts found" sub="Try different filters or search terms" />
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredContracts.map((contract, i) => (
                    <div key={contract.id} className="animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.06}s` }}>
                      <ContractRow contract={contract} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function StorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: COLORS.bg }} />}>
      <StoreContent />
    </Suspense>
  );
}
