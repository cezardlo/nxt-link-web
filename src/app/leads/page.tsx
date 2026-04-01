'use client';

import { useState, useEffect, useCallback } from 'react';
import { COLORS } from '@/lib/tokens';

/* --- Types --- */
interface ConferenceLead {
  id: string;
  vendor_id: string;
  canonical_name: string;
  logistics_score: number;
  lead_tier: 'hot' | 'warm' | 'watch' | 'low';
  logistics_category: string;
  products: string[];
  technologies: string[];
  official_domain: string;
  description: string;
  conference_appearances: number;
  conference_names: string[];
  employee_estimate: string;
  country: string;
  el_paso_relevant: boolean;
  last_scored_at: string;
}

interface Filters {
  tiers: Record<string, number>;
  categories: Record<string, number>;
  el_paso_count: number;
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  hot:   { label: 'HOT',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  warm:  { label: 'WARM',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  watch: { label: 'WATCH', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  low:   { label: 'LOW',   color: '#6b6b76', bg: 'rgba(107,107,118,0.10)' },
};

function tierBadge(tier: string) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.low;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function scoreColor(s: number): string {
  if (s >= 80) return COLORS.green;
  if (s >= 50) return COLORS.amber;
  if (s >= 30) return COLORS.accent;
  return COLORS.muted;
}

/* --- LeadRow --- */
function LeadRow({ lead }: { lead: ConferenceLead }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-nxt-border hover:bg-nxt-card/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score */}
        <td className="px-4 py-3 text-center">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto" style={{
            background: scoreColor(lead.logistics_score) + '15',
            border: `1px solid ${scoreColor(lead.logistics_score)}30`,
          }}>
            <span className="text-sm font-bold font-mono" style={{ color: scoreColor(lead.logistics_score) }}>
              {lead.logistics_score}
            </span>
          </div>
        </td>

        {/* Tier */}
        <td className="px-3 py-3">{tierBadge(lead.lead_tier)}</td>

        {/* Company */}
        <td className="px-3 py-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {lead.official_domain ? (
                <a
                  href={lead.official_domain.startsWith('http') ? lead.official_domain : `https://${lead.official_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-semibold text-nxt-text hover:text-nxt-accent-light transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {lead.canonical_name}
                </a>
              ) : (
                <span className="text-[13px] font-semibold text-nxt-text">{lead.canonical_name}</span>
              )}
              {lead.el_paso_relevant && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 uppercase tracking-wider">EP</span>
              )}
            </div>
            {lead.description && (
              <span className="text-[11px] text-nxt-dim line-clamp-1">{lead.description}</span>
            )}
          </div>
        </td>

        {/* Category */}
        <td className="px-3 py-3">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-nxt-card text-nxt-secondary">
            {lead.logistics_category}
          </span>
        </td>

        {/* Conferences */}
        <td className="px-3 py-3 text-center">
          <span className="text-[13px] font-mono text-nxt-text">{lead.conference_appearances}</span>
        </td>

        {/* Country */}
        <td className="px-3 py-3 text-[12px] text-nxt-muted">{lead.country || '-'}</td>

        {/* Expand arrow */}
        <td className="px-3 py-3 text-nxt-dim text-[11px]">{expanded ? '\u25B2' : '\u25BC'}</td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="border-b border-nxt-border bg-nxt-card/30">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Products */}
              <div>
                <div className="text-[10px] text-nxt-dim uppercase tracking-wider mb-1.5">Products</div>
                <div className="flex gap-1 flex-wrap">
                  {(lead.products?.length ? lead.products : ['-']).map((p, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-nxt-surface text-nxt-secondary">{p}</span>
                  ))}
                </div>
              </div>

              {/* Technologies */}
              <div>
                <div className="text-[10px] text-nxt-dim uppercase tracking-wider mb-1.5">Technologies</div>
                <div className="flex gap-1 flex-wrap">
                  {(lead.technologies?.length ? lead.technologies : ['-']).map((t, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">{t}</span>
                  ))}
                </div>
              </div>

              {/* Conferences */}
              <div>
                <div className="text-[10px] text-nxt-dim uppercase tracking-wider mb-1.5">Conferences</div>
                <div className="flex gap-1 flex-wrap">
                  {(lead.conference_names?.length ? lead.conference_names : ['-']).map((c, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-nxt-surface text-nxt-muted">{c}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-nxt-dim">
              {lead.employee_estimate && <span>Employees: {lead.employee_estimate}</span>}
              {lead.official_domain && <span>Domain: {lead.official_domain}</span>}
              {lead.last_scored_at && <span>Scored: {new Date(lead.last_scored_at).toLocaleDateString()}</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* --- CSV Export --- */
function exportCsv(leads: ConferenceLead[]) {
  const headers = ['Name', 'Score', 'Tier', 'Category', 'Domain', 'Country', 'Conferences', 'Products', 'Technologies', 'El Paso Relevant', 'Description'];
  const rows = leads.map((l) => [
    l.canonical_name,
    l.logistics_score,
    l.lead_tier,
    l.logistics_category,
    l.official_domain,
    l.country,
    l.conference_appearances,
    (l.products ?? []).join('; '),
    (l.technologies ?? []).join('; '),
    l.el_paso_relevant ? 'Yes' : 'No',
    (l.description ?? '').replace(/"/g, '""'),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conference-leads-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* --- Main Page --- */
export default function LeadsPage() {
  const [leads, setLeads] = useState<ConferenceLead[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>({ tiers: {}, categories: {}, el_paso_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [elPasoOnly, setElPasoOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 50;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTier) params.set('tier', activeTier);
      if (activeCategory) params.set('category', activeCategory);
      if (elPasoOnly) params.set('el_paso', 'true');
      if (search) params.set('search', search);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));

      const res = await fetch(`/api/leads/conference?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      if (data.filters) setFilters(data.filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [activeTier, activeCategory, elPasoOnly, search, offset]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSearch = () => { setSearch(searchInput.trim()); setOffset(0); };
  const handleTier = (t: string | null) => { setActiveTier(t); setOffset(0); };
  const handleCategory = (c: string | null) => { setActiveCategory(c); setOffset(0); };

  const sortedCategories = Object.entries(filters.categories)
    .filter(([c]) => c && c !== 'Not Logistics')
    .sort((a, b) => b[1] - a[1]);

  const hotCount = filters.tiers.hot ?? 0;
  const warmCount = filters.tiers.warm ?? 0;
  const watchCount = filters.tiers.watch ?? 0;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 py-10 pb-20">

        {/* Header */}
        <div className="mb-8 slide-up">
          <h1 className="text-xl font-semibold text-nxt-text mb-1">Conference Lead Intelligence</h1>
          <p className="text-sm text-nxt-muted">
            {total} leads scored for trucking &amp; logistics relevance from conference exhibitor data.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total Leads', value: total, color: COLORS.text },
            { label: 'Hot Leads', value: hotCount, color: TIER_CONFIG.hot.color },
            { label: 'Warm Leads', value: warmCount, color: TIER_CONFIG.warm.color },
            { label: 'Watch List', value: watchCount, color: TIER_CONFIG.watch.color },
            { label: 'El Paso Relevant', value: filters.el_paso_count, color: '#f97316' },
          ].map((s, i) => (
            <div key={i} className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-4 text-center">
              <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[11px] text-nxt-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search leads..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2.5 rounded-lg bg-nxt-surface border border-nxt-border text-nxt-text text-sm placeholder:text-nxt-dim focus:outline-none focus:border-nxt-accent/30 transition-colors"
          />
          <button onClick={handleSearch} className="px-5 py-2.5 rounded-lg bg-nxt-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
            Search
          </button>
          <button
            onClick={() => exportCsv(leads)}
            className="px-4 py-2.5 rounded-lg border border-nxt-border text-nxt-muted text-sm hover:text-nxt-text transition-colors"
            title="Export current view as CSV"
          >
            CSV
          </button>
          {(search || activeTier || activeCategory || elPasoOnly) && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setActiveTier(null); setActiveCategory(null); setElPasoOnly(false); setOffset(0); }}
              className="px-4 py-2.5 rounded-lg border border-nxt-border text-nxt-muted text-sm hover:text-nxt-text transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tier filters */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button
            onClick={() => handleTier(null)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              !activeTier ? 'bg-nxt-accent/10 text-nxt-accent-light border-nxt-accent/20' : 'text-nxt-muted border-nxt-border hover:text-nxt-secondary'
            }`}
          >
            All Tiers
          </button>
          {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => handleTier(key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                activeTier === key ? 'border-transparent text-white' : 'text-nxt-muted border-nxt-border hover:text-nxt-secondary'
              }`}
              style={activeTier === key ? { background: cfg.color } : {}}
            >
              {cfg.label} ({filters.tiers[key] ?? 0})
            </button>
          ))}
          <button
            onClick={() => { setElPasoOnly(!elPasoOnly); setOffset(0); }}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              elPasoOnly ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'text-nxt-muted border-nxt-border hover:text-nxt-secondary'
            }`}
          >
            El Paso ({filters.el_paso_count})
          </button>
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 flex-wrap mb-6">
          <button
            onClick={() => handleCategory(null)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              !activeCategory ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'text-nxt-muted border-nxt-border hover:text-nxt-secondary'
            }`}
          >
            All Categories
          </button>
          {sortedCategories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                activeCategory === cat ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'text-nxt-muted border-nxt-border hover:text-nxt-secondary'
              }`}
            >
              {cat} ({count})
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-5 text-center rounded-nxt-md bg-red-500/5 border border-red-500/20 mb-4">
            <div className="text-sm text-red-400 mb-3">{error}</div>
            <button onClick={fetchLeads} className="text-sm font-medium px-5 py-2 rounded-lg bg-red-500 text-white">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && !error && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-4 flex gap-4">
                <div className="w-10 h-10 rounded bg-nxt-card shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-nxt-card shimmer" />
                  <div className="h-3 w-full rounded bg-nxt-card shimmer" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lead table */}
        {!loading && !error && (
          <>
            <div className="bg-nxt-surface border border-nxt-border rounded-nxt-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-nxt-border bg-nxt-card/50">
                      <th className="px-4 py-3 text-[10px] text-nxt-dim uppercase tracking-wider text-center w-16">Score</th>
                      <th className="px-3 py-3 text-[10px] text-nxt-dim uppercase tracking-wider text-left w-20">Tier</th>
                      <th className="px-3 py-3 text-[10px] text-nxt-dim uppercase tracking-wider text-left">Company</th>
                      <th className="px-3 py-3 text-[10px] text-nxt-dim uppercase tracking-wider text-left w-40">Category</th>
                      <th className="px-3 py-3 text-[10px] text-nxt-dim uppercase tracking-wider text-center w-16">Conf</th>
                      <th className="px-3 py-3 text-[10px] text-nxt-dim uppercase tracking-wider text-left w-24">Country</th>
                      <th className="px-3 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => <LeadRow key={lead.id} lead={lead} />)}
                  </tbody>
                </table>
              </div>
            </div>

            {leads.length === 0 && (
              <div className="text-center py-20 text-sm text-nxt-dim">
                No leads found{search ? ` matching "${search}"` : activeTier ? ` in tier ${activeTier}` : ''}.
              </div>
            )}

            {/* Pagination */}
            {leads.length > 0 && (
              <div className="flex justify-center items-center gap-3 mt-6">
                {offset > 0 && (
                  <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="text-sm font-medium px-4 py-2 rounded-lg border border-nxt-border text-nxt-muted hover:text-nxt-text transition-colors">
                    Previous
                  </button>
                )}
                <span className="text-xs text-nxt-dim font-mono">{offset + 1}--{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
                {offset + PAGE_SIZE < total && (
                  <button onClick={() => setOffset(offset + PAGE_SIZE)} className="text-sm font-medium px-4 py-2 rounded-lg border border-nxt-border text-nxt-muted hover:text-nxt-text transition-colors">
                    Next
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
