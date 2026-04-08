'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ExternalLink, Building2, Package, Calendar, Zap, X } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';

// ── Types ────────────────────────────────────────────────────────────────────

interface Vendor {
  id: number;
  company_name: string;
  company_url: string | null;
  description: string | null;
  primary_category: string | null;
  sector: string | null;
  hq_country: string | null;
  hq_city: string | null;
  iker_score: number | null;
}

interface Product {
  id: string;
  product_name: string;
  company: string | null;
  company_url: string | null;
  industry: string | null;
  category: string | null;
  description: string | null;
  price_range: string | null;
  maturity: string | null;
  use_cases: string[] | null;
}

interface Conference {
  id: string;
  name: string;
  location: string | null;
  month: string | null;
  description: string | null;
  category: string | null;
  relevanceScore: number | null;
  estimatedExhibitors: number | null;
  website: string | null;
}

interface Discovery {
  id: string;
  title: string;
  summary: string | null;
  discovery_type: string;
  source_url: string | null;
  source_name: string | null;
  research_institution: string | null;
  iker_impact_score: number | null;
  published_at: string | null;
}

type Tab = 'companies' | 'products' | 'conferences' | 'discoveries';

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count: number }[] = [
  { key: 'companies',    label: 'Companies',    icon: Building2, count: 442 },
  { key: 'products',     label: 'Products',     icon: Package,   count: 1041 },
  { key: 'conferences',  label: 'Conferences',  icon: Calendar,  count: 1040 },
  { key: 'discoveries',  label: 'Discoveries',  icon: Zap,       count: 973 },
];

const SECTORS = ['All', 'Defense', 'AI/ML', 'Cybersecurity', 'Logistics', 'Manufacturing', 'Border Tech', 'Energy', 'Space', 'Industrial', 'Commercial', 'Renewables', 'Agriculture', 'Life Sciences', 'Climate', 'Quantum'];

const SECTOR_API_MAP: Record<string, string> = {
  'AI/ML': 'ai-ml', 'Border Tech': 'border-tech',
  'Cybersecurity': 'cybersecurity', 'Defense': 'defense',
  'Energy': 'energy', 'Healthcare': 'healthcare',
  'Logistics': 'logistics', 'Manufacturing': 'manufacturing',
  'Space': 'space', 'Industrial': 'industrial-tech',
  'Commercial': 'commercial-tech', 'Renewables': 'renewable-energy',
  'Agriculture': 'agriculture', 'Life Sciences': 'life-sciences',
  'Climate': 'climate-tech', 'Quantum': 'quantum',
};

// ── Logo Component ────────────────────────────────────────────────────────────

function CompanyLogo({ url, name, size = 44 }: { url: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const domain = url ? (() => { try { return new URL(url).hostname.replace('www.', ''); } catch { return null; } })() : null;
  const initials = name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  const s = `${size}px`;

  if (domain && !err) {
    return (
      <img src={`https://logo.clearbit.com/${domain}`} alt={name} width={size} height={size}
        className="rounded-xl object-contain shrink-0"
        style={{ width: s, height: s, background: 'rgba(255,255,255,0.05)', padding: 6 }}
        onError={() => setErr(true)} />
    );
  }
  return (
    <div className="rounded-xl shrink-0 flex items-center justify-center font-bold text-sm"
      style={{ width: s, height: s, background: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}>
      {initials}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-5 animate-pulse">
      <div className="flex gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-white/[0.06]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/[0.06] rounded w-3/4" />
          <div className="h-3 bg-white/[0.04] rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-white/[0.04] rounded" />
        <div className="h-3 bg-white/[0.04] rounded w-5/6" />
      </div>
    </div>
  );
}

// ── Score Badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score, label = 'SCORE' }: { score: number | null; label?: string }) {
  if (!score) return null;
  const color = score >= 85 ? '#10b981' : score >= 65 ? '#f59e0b' : '#6b7280';
  return (
    <div className="text-right shrink-0">
      <div className="text-xl font-mono font-bold" style={{ color }}>{score}</div>
      <div className="text-[9px] font-mono tracking-widest text-[#4A5568]">{label}</div>
    </div>
  );
}

// ── Company Card ──────────────────────────────────────────────────────────────

function CompanyCard({ v }: { v: Vendor }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-200 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <CompanyLogo url={v.company_url} name={v.company_name} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-white truncate">{v.company_name}</div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {v.sector && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9]">{v.sector}</span>}
            {(v.hq_city || v.hq_country) && <span className="text-[10px] text-[#4A5568]">{v.hq_city || v.hq_country}</span>}
          </div>
        </div>
        <ScoreBadge score={v.iker_score} />
      </div>
      {v.description && <p className="text-[12px] leading-5 text-[#6B7280] line-clamp-2">{v.description}</p>}
      <div className="flex gap-2 mt-auto pt-1">
        {v.company_url && (
          <a href={v.company_url} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium text-white transition-colors"
            style={{ background: '#0EA5E9' }}>
            Visit Website <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <Link href={`/vendor/${v.id}`}
          className="flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-medium text-[#0EA5E9] border border-[#0EA5E9]/20 hover:border-[#0EA5E9]/40 transition-colors">
          View Profile
        </Link>
      </div>
    </motion.div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ p }: { p: Product }) {
  const maturityColor = p.maturity === 'mature' ? '#10b981' : p.maturity === 'growing' ? '#0EA5E9' : '#8B5CF6';
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-all duration-200 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {p.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9]">{p.category}</span>}
            {p.maturity && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${maturityColor}15`, color: maturityColor }}>{p.maturity.toUpperCase()}</span>}
          </div>
          <div className="text-[14px] font-semibold text-white">{p.product_name}</div>
          {p.company && <div className="text-[11px] text-[#4A5568] mt-0.5">{p.company}</div>}
        </div>
        {p.price_range && <div className="text-[10px] text-[#6B7280] shrink-0">{p.price_range}</div>}
      </div>
      {p.description && <p className="text-[12px] leading-5 text-[#6B7280] line-clamp-2">{p.description}</p>}
      <div className="flex gap-2 mt-auto pt-1">
        {p.company_url && (
          <a href={p.company_url} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium text-white transition-colors"
            style={{ background: '#0EA5E9' }}>
            Get Demo <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <Link href={`/products/${p.id}`}
          className="flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-medium text-[#0EA5E9] border border-[#0EA5E9]/20 hover:border-[#0EA5E9]/40 transition-colors">
          View Details
        </Link>
      </div>
    </motion.div>
  );
}

// ── Conference Card ───────────────────────────────────────────────────────────

function ConferenceCard({ c }: { c: Conference }) {
  const score = c.relevanceScore ?? 0;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-all duration-200 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {c.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">{c.category}</span>}
            {c.month && <span className="text-[10px] text-[#4A5568]">{c.month}</span>}
          </div>
          <div className="text-[14px] font-semibold text-white line-clamp-2">{c.name}</div>
          {c.location && <div className="text-[11px] text-[#4A5568] mt-0.5">{c.location}</div>}
        </div>
        <ScoreBadge score={score} label="SCORE" />
      </div>
      {c.description && <p className="text-[12px] leading-5 text-[#6B7280] line-clamp-2">{c.description}</p>}
      {c.estimatedExhibitors && c.estimatedExhibitors > 0 && (
        <div className="text-[11px] text-[#4A5568]">{c.estimatedExhibitors.toLocaleString()} exhibitors</div>
      )}
      <div className="flex gap-2 mt-auto pt-1">
        {c.website && (
          <a href={c.website} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium text-white transition-colors"
            style={{ background: '#0EA5E9' }}>
            Register <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <Link href={`/conference/${c.id}`}
          className="flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-medium text-[#0EA5E9] border border-[#0EA5E9]/20 hover:border-[#0EA5E9]/40 transition-colors">
          See Exhibitors
        </Link>
      </div>
    </motion.div>
  );
}

// ── Discovery Card ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  breakthrough: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
  paper: { bg: 'rgba(14,165,233,0.1)', text: '#0EA5E9' },
  spinout: { bg: 'rgba(139,92,246,0.1)', text: '#8B5CF6' },
  grant: { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B' },
  clinical_trial: { bg: 'rgba(16,185,129,0.1)', text: '#10B981' },
  collaboration: { bg: 'rgba(59,130,246,0.1)', text: '#3B82F6' },
};

function DiscoveryCard({ d }: { d: Discovery }) {
  const tc = TYPE_COLORS[d.discovery_type] ?? TYPE_COLORS.paper;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-all duration-200 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: tc.bg, color: tc.text }}>{d.discovery_type.toUpperCase()}</span>
            {d.research_institution && <span className="text-[10px] text-[#4A5568]">{d.research_institution}</span>}
          </div>
          <div className="text-[13px] font-semibold text-white leading-5 line-clamp-3">{d.title}</div>
        </div>
        <ScoreBadge score={d.iker_impact_score} label="IMPACT" />
      </div>
      {d.summary && <p className="text-[12px] leading-5 text-[#6B7280] line-clamp-2">{d.summary}</p>}
      {d.source_name && <div className="text-[11px] text-[#4A5568]">{d.source_name}</div>}
      <div className="mt-auto pt-1">
        {d.source_url ? (
          <a href={d.source_url} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium text-white transition-colors"
            style={{ background: '#0EA5E9' }}>
            Read Source <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <Link href="/discoveries"
            className="w-full flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-medium text-[#0EA5E9] border border-[#0EA5E9]/20">
            View All Discoveries
          </Link>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const [tab, setTab] = useState<Tab>('companies');
  const [sector, setSector] = useState('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 24;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const sectorParam = SECTOR_API_MAP[sector] ?? (sector === 'All' ? '' : sector.toLowerCase());

  const fetchData = useCallback(async (reset: boolean) => {
    setLoading(true);
    const pg = reset ? 0 : page;
    const offset = pg * PAGE_SIZE;

    try {
      if (tab === 'companies') {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
        if (sectorParam) params.set('sector', sectorParam);
        if (search) params.set('search', search);
        const res = await fetch(`/api/vendors?${params}`);
        const data = await res.json();
        const items: Vendor[] = data.vendors ?? data ?? [];
        if (reset) setVendors(items); else setVendors(p => [...p, ...items]);
        setTotal(data.total ?? items.length);
        setHasMore(items.length === PAGE_SIZE);

      } else if (tab === 'products') {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
        if (sectorParam) params.set('industry', sectorParam);
        if (search) params.set('q', search);
        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();
        const items: Product[] = data.products ?? data ?? [];
        if (reset) setProducts(items); else setProducts(p => [...p, ...items]);
        setTotal(data.total ?? items.length);
        setHasMore(items.length === PAGE_SIZE);

      } else if (tab === 'conferences') {
        const res = await fetch('/api/conferences?limit=48');
        const data = await res.json();
        const items: Conference[] = data.conferences ?? data ?? [];
        const filtered = search ? items.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : items;
        if (reset) setConferences(filtered); else setConferences(p => [...p, ...filtered]);
        setTotal(filtered.length);
        setHasMore(false);

      } else if (tab === 'discoveries') {
        const params = new URLSearchParams({ page: String(pg), page_size: String(PAGE_SIZE) });
        if (search) params.set('q', search);
        const res = await fetch(`/api/discoveries?${params}`);
        const data = await res.json();
        const items: Discovery[] = data.discoveries ?? [];
        if (reset) setDiscoveries(items); else setDiscoveries(p => [...p, ...items]);
        setTotal(data.total ?? items.length);
        setHasMore((pg + 1) * PAGE_SIZE < (data.total ?? 0));
      }
    } catch (err) {
      console.error('[discover] fetch error:', err);
    } finally {
      setLoading(false);
      if (reset) setPage(0);
    }
  }, [tab, sectorParam, search, page]);

  useEffect(() => { fetchData(true); }, [tab, sector, search]);

  const handleSearch = () => { setSearch(searchInput.trim()); };
  const clearSearch = () => { setSearch(''); setSearchInput(''); };
  const loadMore = () => { setPage(p => p + 1); fetchData(false); };

  const currentItems = tab === 'companies' ? vendors : tab === 'products' ? products : tab === 'conferences' ? conferences : discoveries;

  return (
    <PageTransition>
      <div className="min-h-screen pb-20" style={{ background: '#07090A', color: '#D4D8DC' }}>
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 pt-10">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-grotesk, sans-serif)' }}>Discover</h1>
            <p className="text-[#6B7280] text-sm">Every tech company, product, conference, and breakthrough. Browse. Contact. Buy.</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setSector('All'); setSearch(''); setSearchInput(''); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                style={{
                  background: tab === t.key ? '#0EA5E9' : 'rgba(255,255,255,0.04)',
                  color: tab === t.key ? 'white' : '#6B7280',
                  border: tab === t.key ? 'none' : '1px solid rgba(255,255,255,0.06)',
                }}>
                <t.icon className="w-4 h-4" />
                {t.label}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: tab === t.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)' }}>
                  {t.count.toLocaleString()}
                </span>
              </button>
            ))}
          </div>

          {/* Sector chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {SECTORS.map(s => (
              <button key={s} onClick={() => setSector(s)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: sector === s ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.04)',
                  color: sector === s ? '#0EA5E9' : '#6B7280',
                  border: sector === s ? '1px solid rgba(14,165,233,0.3)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                {s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex gap-2 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5568]" />
              <input
                type="text" value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={`Search ${tab}...`}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#D4D8DC' }} />
            </div>
            <button onClick={handleSearch} className="px-4 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: '#0EA5E9' }}>Search</button>
            {search && <button onClick={clearSearch} className="px-3 py-2.5 rounded-xl text-[#6B7280]"><X className="w-4 h-4" /></button>}
          </div>

          {/* Results count */}
          {!loading && (
            <div className="text-[11px] text-[#4A5568] mb-4 font-mono">
              {total.toLocaleString()} {tab} found
              {sector !== 'All' && ` in ${sector}`}
              {search && ` matching "${search}"`}
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            {!loading && tab === 'companies' && vendors.map(v => <CompanyCard key={v.id} v={v} />)}
            {!loading && tab === 'products' && products.map(p => <ProductCard key={p.id} p={p} />)}
            {!loading && tab === 'conferences' && conferences.map(c => <ConferenceCard key={c.id} c={c} />)}
            {!loading && tab === 'discoveries' && discoveries.map(d => <DiscoveryCard key={d.id} d={d} />)}
          </div>

          {/* Empty state */}
          {!loading && currentItems.length === 0 && (
            <div className="text-center py-20">
              <div className="text-[#4A5568] mb-4">Nothing found</div>
              <button onClick={() => { setSector('All'); clearSearch(); }}
                className="px-4 py-2 rounded-xl text-sm text-[#0EA5E9] border border-[#0EA5E9]/20 hover:border-[#0EA5E9]/40">
                Reset filters
              </button>
            </div>
          )}

          {/* Load more */}
          {!loading && hasMore && (
            <div className="flex justify-center mt-10">
              <button onClick={loadMore}
                className="px-6 py-3 rounded-xl text-sm font-medium text-[#0EA5E9] border border-[#0EA5E9]/20 hover:border-[#0EA5E9]/40 transition-colors">
                Load more {tab}
              </button>
            </div>
          )}

        </div>
      </div>
    </PageTransition>
  );
}
