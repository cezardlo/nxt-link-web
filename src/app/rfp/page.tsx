'use client';

import { useState, useCallback } from 'react';
import { EL_PASO_VENDORS, type VendorRecord } from '@/lib/data/el-paso-vendors';
import type { FederalContract, GrantResult } from '@/lib/engines/live-search-engine';
import type { AskResponse } from '@/lib/engines/ask-engine';
import { EmptyState } from '@/components/ui';

// ─── Types ───────────────────────────────────────────────────────────────────

type ContractItem = {
  title?: string;
  description?: string;
  agency?: string;
  value?: string;
  date?: string;
  source?: string;
  url?: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const QUICK_FILTERS = [
  'Defense',
  'Cybersecurity',
  'AI/ML',
  'Healthcare',
  'Energy',
  'Infrastructure',
  'Logistics',
  'Robotics',
];

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
];

const RELATED_TERMS: Record<string, string[]> = {
  cybersecurity: ['Zero Trust', 'CMMC Compliance', 'Network Defense', 'SOC Services'],
  defense: ['C4ISR Systems', 'ISR Platforms', 'Electronic Warfare', 'Logistics IT'],
  'ai/ml': ['Autonomous Systems', 'Predictive Analytics', 'Computer Vision', 'NLP Solutions'],
  healthcare: ['Telehealth', 'Medical Devices', 'EHR Systems', 'Health IT'],
  energy: ['Grid Modernization', 'Renewable Energy', 'Energy Storage', 'Smart Grid'],
  infrastructure: ['Smart Cities', 'Transportation IT', 'Water Systems', 'Public Safety'],
  logistics: ['Supply Chain AI', 'Fleet Management', 'Warehouse Automation', 'Last Mile'],
  robotics: ['Autonomous Vehicles', 'Drone Systems', 'Industrial Automation', 'UAS'],
};

function getRelatedTerms(query: string): string[] {
  const lower = query.toLowerCase();
  for (const [key, terms] of Object.entries(RELATED_TERMS)) {
    if (lower.includes(key)) return terms;
  }
  return ['Federal Grants', 'SBIR Contracts', 'DoD Procurement', 'GSA Schedule'];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatValue(val: string | undefined): string {
  if (!val) return 'N/A';
  const num = parseFloat(val.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return val.length > 12 ? 'N/A' : val;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}m`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}k`;
  return `$${num.toFixed(0)}`;
}

function trunc(str: string | undefined, max: number): string {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function matchesQuery(vendor: VendorRecord, query: string): boolean {
  const lower = query.toLowerCase();
  const keywords = lower.split(/\s+/);
  const haystack = [
    vendor.name,
    vendor.category,
    ...vendor.tags,
    vendor.description,
  ]
    .join(' ')
    .toLowerCase();
  return keywords.some((kw) => kw.length > 2 && haystack.includes(kw));
}

function exportCSV(contracts: ContractItem[]): void {
  const header = ['Agency', 'Description', 'Value', 'Date', 'Source', 'URL'];
  const rows = contracts.map((c) => [
    c.agency ?? '',
    (c.description ?? c.title ?? '').replace(/,/g, ';'),
    c.value ?? 'N/A',
    c.date ?? '',
    c.source ?? 'SAM.gov',
    c.url ?? '',
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  const a = document.createElement('a');
  a.href = uri;
  a.download = 'rfp-contracts.csv';
  a.click();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SourceBadge({ label }: { label: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 border border-[#00d4ff]/30 text-[#00d4ff] text-[8px] font-mono tracking-widest rounded-sm bg-[#00d4ff]/5">
      {label}
    </span>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] font-mono tracking-[0.2em] text-white/50 uppercase">
        {title}
      </span>
      {count !== undefined && (
        <span className="text-[9px] font-mono text-[#00d4ff]/70 bg-[#00d4ff]/10 border border-[#00d4ff]/20 px-1.5 py-0.5 rounded-sm">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  );
}

function ContractRow({ item, index }: { item: ContractItem; index: number }) {
  return (
    <tr
      className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <td className="py-2 pr-4 text-[10px] font-mono text-white/70 whitespace-nowrap">
        {trunc(item.agency, 30)}
      </td>
      <td className="py-2 pr-4 text-[10px] font-mono text-white/50">
        {trunc(item.description ?? item.title, 60)}
      </td>
      <td className="py-2 pr-4 text-[10px] font-mono text-[#ffd700] whitespace-nowrap">
        {formatValue(item.value)}
      </td>
      <td className="py-2 pr-4 text-[10px] font-mono text-white/40 whitespace-nowrap">
        {item.date ? item.date.slice(0, 10) : '—'}
      </td>
      <td className="py-2 pr-2">
        <SourceBadge label={item.source ?? 'SAM.gov'} />
      </td>
      <td className="py-2 text-right">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-mono text-[#00d4ff]/50 group-hover:text-[#00d4ff] transition-colors whitespace-nowrap"
          >
            → View
          </a>
        ) : (
          <span className="text-[9px] font-mono text-white/20">—</span>
        )}
      </td>
    </tr>
  );
}

function GrantRow({ item, index }: { item: GrantResult; index: number }) {
  return (
    <tr
      className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <td className="py-2 pr-4 text-[10px] font-mono text-white/70">
        {trunc(item.agency, 30)}
      </td>
      <td className="py-2 pr-4 text-[10px] font-mono text-white/50">
        {trunc(item.title, 60)}
      </td>
      <td className="py-2 pr-4 text-[10px] font-mono text-[#00ff88] whitespace-nowrap">
        {item.amount ?? 'N/A'}
      </td>
      <td className="py-2 pr-4 text-[10px] font-mono text-white/40 whitespace-nowrap">
        {item.deadline ? item.deadline.slice(0, 10) : '—'}
      </td>
      <td className="py-2 pr-2">
        <SourceBadge label="Grants.gov" />
      </td>
      <td className="py-2 text-right">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-mono text-[#00d4ff]/50 group-hover:text-[#00d4ff] transition-colors whitespace-nowrap"
          >
            → View
          </a>
        ) : (
          <span className="text-[9px] font-mono text-white/20">—</span>
        )}
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RFPPage() {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState(30);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [grants, setGrants] = useState<GrantResult[]>([]);
  const [relatedTerms, setRelatedTerms] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const vendorMatches: VendorRecord[] = searched
    ? Object.values(EL_PASO_VENDORS)
        .filter((v) => matchesQuery(v, query))
        .sort((a, b) => b.ikerScore - a.ikerScore)
        .slice(0, 5)
    : [];

  const toggleFilter = useCallback((filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter],
    );
  }, []);

  const buildSearchQuery = useCallback(() => {
    const parts = [query.trim()];
    if (activeFilters.length) parts.push(activeFilters.join(' '));
    return parts.filter(Boolean).join(' ') || activeFilters.join(' ');
  }, [query, activeFilters]);

  const handleSearch = useCallback(async () => {
    const effectiveQuery = buildSearchQuery();
    if (!effectiveQuery) return;

    setLoading(true);
    setError(null);
    setSearched(false);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: effectiveQuery }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: AskResponse = await res.json();

      const rawContracts: ContractItem[] = (
        data.sections?.contracts?.items ?? []
      ).map((c: FederalContract) => ({
        title: c.title,
        description: c.title,
        agency: c.agency,
        value: c.amount,
        date: c.date,
        source: 'SAM.gov',
        url: c.url,
      }));

      const rawGrants: GrantResult[] = data.sections?.grants?.items ?? [];

      setContracts(rawContracts);
      setGrants(rawGrants);
      setRelatedTerms(getRelatedTerms(effectiveQuery));
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [buildSearchQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch],
  );

  return (
    <div className="min-h-screen bg-black text-white font-mono animate-fade-up">
      {/* ── Top navigation bar ─────────────────────────────────────── */}
      <div className="h-10 border-b border-white/[0.06] flex items-center px-6 gap-4">
        <a
          href="/map"
          className="text-[9px] font-mono tracking-widest text-white/30 hover:text-[#00d4ff]/70 transition-colors"
        >
          ← MAP
        </a>
        <div className="h-3 w-px bg-white/[0.08]" />
        <span className="text-[9px] font-mono tracking-widest text-white/30">
          NXT//LINK
        </span>
        <div className="flex-1" />
        <span className="text-[9px] font-mono tracking-widest text-[#00d4ff]/40">
          PROCUREMENT INTELLIGENCE
        </span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1
            className="text-2xl font-bold tracking-tight text-white mb-1"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            RFP &amp; PROCUREMENT INTELLIGENCE
          </h1>
          <p className="text-[11px] font-mono text-white/40 mb-4">
            Government contracts, grants, and procurement opportunities — live from SAM.gov &amp; Grants.gov
          </p>
          <div className="flex items-center gap-2">
            <SourceBadge label="SAM.gov" />
            <SourceBadge label="Grants.gov" />
            <SourceBadge label="USASpending.gov" />
          </div>
        </div>

        {/* ── Search section ─────────────────────────────────────────── */}
        <div className="border border-white/[0.06] rounded-sm bg-black p-5 mb-6">
          {/* Input */}
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search contracts, agencies, or technologies..."
              className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2.5 text-[11px] font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/40 transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={loading || (!query.trim() && activeFilters.length === 0)}
              className="px-5 py-2.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-[10px] font-mono tracking-widest rounded-sm hover:bg-[#00d4ff]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? 'SCANNING...' : 'SEARCH PROCUREMENT →'}
            </button>
          </div>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => toggleFilter(f)}
                className={`px-2.5 py-1 text-[9px] font-mono tracking-widest rounded-sm border transition-all ${
                  activeFilters.includes(f)
                    ? 'border-[#00d4ff]/30 bg-[#00d4ff]/15 text-[#00d4ff]'
                    : 'border-white/[0.08] bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/60'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-white/30 tracking-widest mr-1">
              DATE RANGE
            </span>
            {DATE_RANGES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDateRange(d.value)}
                className={`px-2.5 py-1 text-[9px] font-mono tracking-wide rounded-sm border transition-all ${
                  dateRange === d.value
                    ? 'border-[#ffd700]/30 bg-[#ffd700]/10 text-[#ffd700]'
                    : 'border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/[0.12]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading state ──────────────────────────────────────────── */}
        {loading && (
          <div className="border border-white/[0.06] rounded-sm bg-black/60 p-8 mb-6 flex items-center gap-4">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]"
                  style={{
                    animation: 'pulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] font-mono text-white/50">
              Scanning government procurement databases...
            </span>
          </div>
        )}

        {/* ── Error state ─────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="border border-[#ff3b30]/20 rounded-sm bg-[#ff3b30]/5 p-4 mb-6">
            <span className="text-[10px] font-mono text-[#ff3b30]">{error}</span>
          </div>
        )}

        {/* ── Results ────────────────────────────────────────────────── */}
        {searched && !loading && (
          <div className="space-y-6">
            {/* Export button */}
            <div className="flex justify-end">
              <button
                onClick={() => exportCSV(contracts)}
                disabled={contracts.length === 0}
                className="px-3 py-1.5 text-[9px] font-mono tracking-widest border border-white/[0.08] text-white/40 rounded-sm hover:border-white/20 hover:text-white/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                EXPORT CSV ↓
              </button>
            </div>

            {/* ── Section A: Contract Awards ─────────────────────────── */}
            <div className="border border-white/[0.06] rounded-sm bg-black p-5">
              <SectionHeader title="Contract Awards" count={contracts.length} />
              {contracts.length === 0 ? (
                <EmptyState
                  title="No contracts found"
                  message="Try a broader query or adjust your filters to find matching procurement data."
                />
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['Agency', 'Description', 'Value', 'Date', 'Source', ''].map(
                          (h) => (
                            <th
                              key={h}
                              className="pb-2 pr-4 text-left text-[9px] font-mono tracking-widest text-white/25 uppercase"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((c, i) => (
                        <ContractRow key={i} item={c} index={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Section B: Grant Opportunities ────────────────────── */}
            <div className="border border-white/[0.06] rounded-sm bg-black p-5">
              <SectionHeader title="Grant Opportunities" count={grants.length} />
              {grants.length === 0 ? (
                <EmptyState
                  title="No grants found"
                  message="No grant opportunities matched this query. Try different keywords."
                />
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['Agency', 'Title', 'Amount', 'Deadline', 'Source', ''].map(
                          (h) => (
                            <th
                              key={h}
                              className="pb-2 pr-4 text-left text-[9px] font-mono tracking-widest text-white/25 uppercase"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {grants.map((g, i) => (
                        <GrantRow key={i} item={g} index={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Section C: Vendor Match ────────────────────────────── */}
            <div className="border border-white/[0.06] rounded-sm bg-black p-5">
              <SectionHeader
                title="Vendors Qualified for This Contract"
                count={vendorMatches.length}
              />
              {vendorMatches.length === 0 ? (
                <EmptyState
                  title="No vendors matched"
                  message="No local vendors matched this query. Try broadening your search terms."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {vendorMatches.map((v) => (
                    <a
                      key={v.id}
                      href={`/vendor/${v.id}`}
                      className="block border border-white/[0.06] rounded-sm p-3 hover:border-[#00d4ff]/20 hover:bg-[#00d4ff]/5 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-[10px] font-mono text-white/80 group-hover:text-white transition-colors leading-tight">
                          {v.name}
                        </span>
                        <span className="text-[9px] font-mono text-[#ffd700] ml-2 whitespace-nowrap">
                          {v.ikerScore}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-white/30 tracking-wide">
                        {v.category}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section D: Similar Opportunities ─────────────────── */}
            <div className="border border-white/[0.06] rounded-sm bg-black p-5">
              <SectionHeader title="Related Searches" />
              <div className="flex flex-wrap gap-2">
                {relatedTerms.map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setQuery(term);
                      setActiveFilters([]);
                    }}
                    className="px-3 py-1.5 text-[9px] font-mono tracking-wide border border-white/[0.08] text-white/40 rounded-sm hover:border-[#00d4ff]/30 hover:text-[#00d4ff]/70 transition-all"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Section E: Summary Stats ───────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: 'Total Contracts Found',
                  value: contracts.length,
                  color: '#00d4ff',
                },
                {
                  label: 'Total Grants Found',
                  value: grants.length,
                  color: '#00ff88',
                },
                {
                  label: 'Local Vendors Eligible',
                  value: vendorMatches.length,
                  color: '#ffd700',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="border border-white/[0.06] rounded-sm bg-black p-4"
                >
                  <div
                    className="text-2xl font-bold mb-1"
                    style={{ color: stat.color, fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[9px] font-mono tracking-widest text-white/30 uppercase">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state before first search ───────────────────────── */}
        {!searched && !loading && !error && (
          <div className="border border-white/[0.04] rounded-sm p-12 text-center">
            <div className="text-[10px] font-mono text-white/20 tracking-[0.2em] uppercase mb-2">
              Awaiting Query
            </div>
            <div className="text-[9px] font-mono text-white/10">
              Search contracts and grants from federal procurement databases
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
