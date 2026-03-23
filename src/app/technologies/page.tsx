'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TECHNOLOGY_CATALOG, type Technology, type TechCategory } from '@/lib/data/technology-catalog';
import { PageTopBar } from '@/components/PageTopBar';
import { EmptyState } from '@/components/ui';

const CATEGORIES: TechCategory[] = [
  'AI/ML', 'Cybersecurity', 'Defense', 'Border Tech',
  'Manufacturing', 'Energy', 'Healthcare', 'Logistics',
];

const MATURITY_OPTIONS = ['emerging', 'growing', 'mature'] as const;

const MATURITY_STYLE: Record<string, { color: string; label: string }> = {
  emerging: { color: '#00d4ff', label: 'EMERGING' },
  growing:  { color: '#00ff88', label: 'GROWING' },
  mature:   { color: '#ffd700', label: 'MATURE' },
};

const DIRECTION_INFO: Record<string, { arrow: string; label: string; color: string }> = {
  emerging: { arrow: '↑', label: 'ACCELERATING', color: '#00ff88' },
  growing:  { arrow: '↑', label: 'ACCELERATING', color: '#00ff88' },
  mature:   { arrow: '→', label: 'STEADY',       color: '#ffb800' },
};

const DEFAULT_VISIBLE = 9;

export default function TechnologiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | TechCategory>('ALL');
  const [activeMaturity, setActiveMaturity] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [customSearch, setCustomSearch] = useState('');

  const dedupedCatalog = useMemo(() => {
    const seen = new Set<string>();
    const result: Technology[] = [];
    for (const tech of TECHNOLOGY_CATALOG) {
      if (!seen.has(tech.id)) {
        seen.add(tech.id);
        result.push(tech);
      }
    }
    return result;
  }, []);

  const filtered = useMemo(() => {
    let items = dedupedCatalog;
    if (activeCategory !== 'ALL') {
      items = items.filter((t) => t.category === activeCategory);
    }
    if (activeMaturity) {
      items = items.filter((t) => t.maturityLevel === activeMaturity);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }
    return items;
  }, [dedupedCatalog, activeCategory, activeMaturity, search]);

  const displayed = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  const hasMore = filtered.length > DEFAULT_VISIBLE;

  function handleCustomSearch() {
    const slug = customSearch.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (slug) router.push(`/industry/${slug}`);
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <PageTopBar
        backHref="/"
        backLabel="HOME"
        breadcrumbs={[{ label: 'TECHNOLOGIES' }]}
        rightSlot={
          <span className="font-mono text-[8px] tracking-[0.2em] text-white/30">
            {dedupedCatalog.length} TECHNOLOGIES
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Hero */}
          <div className="pt-10 pb-6">
            <h1
              className="text-[28px] md:text-[34px] tracking-[0.04em] text-white/90 font-light uppercase"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Technology Radar
            </h1>
            <p className="font-mono text-[11px] text-white/35 mt-2 tracking-wide max-w-xl">
              Tracking emerging and mature technologies across all sectors
            </p>
          </div>

          {/* Search */}
          <div className="pb-3">
            <div className="relative max-w-2xl">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowAll(false); }}
                placeholder="Search technologies by name, category, or application..."
                className="w-full bg-white/[0.03] font-mono text-[12px] text-white/70 placeholder-white/20
                           pl-10 pr-10 py-3 outline-none border border-white/[0.08] rounded-sm
                           focus:border-[#00d4ff]/30 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-widest text-white/25
                             hover:text-white/50 transition-colors"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>

          {/* Category chips */}
          <div className="pb-2">
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', ...CATEGORIES] as const).map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat as 'ALL' | TechCategory); setShowAll(false); }}
                    className="font-mono text-[10px] tracking-[0.1em] px-3 py-1 border uppercase transition-all duration-150 rounded-sm"
                    style={{
                      borderColor: isActive ? '#00d4ff44' : 'rgba(255,255,255,0.07)',
                      color: isActive ? '#00d4ff' : 'rgba(255,255,255,0.30)',
                      backgroundColor: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Maturity pills */}
          <div className="pb-3 border-b border-white/[0.06]">
            <div className="flex flex-wrap gap-1.5">
              {MATURITY_OPTIONS.map((mat) => {
                const style = MATURITY_STYLE[mat];
                const isActive = activeMaturity === mat;
                return (
                  <button
                    key={mat}
                    onClick={() => { setActiveMaturity(isActive ? null : mat); setShowAll(false); }}
                    className="font-mono text-[9px] tracking-[0.15em] px-2.5 py-0.5 border uppercase transition-all duration-150 rounded-sm"
                    style={{
                      borderColor: isActive ? `${style.color}55` : 'rgba(255,255,255,0.05)',
                      color: isActive ? style.color : 'rgba(255,255,255,0.22)',
                      backgroundColor: isActive ? `${style.color}14` : 'transparent',
                    }}
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Count */}
          <div className="flex items-center justify-between py-3">
            <span className="font-mono text-[11px] tracking-[0.15em] text-white/40">
              <span className="text-[#00d4ff]">{displayed.length}</span>
              {' '}of <span className="text-white/60">{filtered.length}</span> technologies
            </span>
            {(search.trim() || activeCategory !== 'ALL' || activeMaturity) && (
              <button
                onClick={() => { setSearch(''); setActiveCategory('ALL'); setActiveMaturity(null); setShowAll(false); }}
                className="font-mono text-[10px] tracking-widest text-white/25 hover:text-[#00d4ff]/70 transition-colors uppercase"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <EmptyState
              title="No technologies found"
              message="No technologies match your current filters. Try adjusting your search or clearing filters."
            />
          )}

          {/* Card grid */}
          {filtered.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {displayed.map((tech) => {
                  const matStyle = MATURITY_STYLE[tech.maturityLevel];
                  return (
                    <Link
                      key={tech.id}
                      href={`/technology/${tech.id}`}
                      className="group bg-black border border-white/[0.08] rounded-sm p-4
                                 hover:border-white/[0.20] transition-all duration-200
                                 flex flex-col gap-2.5 cursor-pointer"
                    >
                      {/* Category + Maturity + Direction */}
                      <div className="flex items-center justify-between">
                        <span
                          className="font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 border rounded-sm"
                          style={{ color: '#00d4ff99', borderColor: '#00d4ff33', backgroundColor: '#00d4ff0d' }}
                        >
                          {tech.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[8px] tracking-widest font-medium px-2 py-0.5 rounded-sm border"
                            style={{
                              color: matStyle.color,
                              borderColor: `${matStyle.color}44`,
                              backgroundColor: `${matStyle.color}14`,
                              textShadow: tech.maturityLevel === 'emerging' ? `0 0 8px ${matStyle.color}66` : undefined,
                            }}
                          >
                            {matStyle.label}
                          </span>
                          {(() => {
                            const dir = DIRECTION_INFO[tech.maturityLevel];
                            return dir ? (
                              <span
                                className="font-mono text-[7px] tracking-[0.1em] px-1.5 py-0.5 rounded-sm border"
                                style={{
                                  color: `${dir.color}aa`,
                                  borderColor: `${dir.color}30`,
                                  backgroundColor: `${dir.color}0a`,
                                }}
                              >
                                {dir.arrow} {dir.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      {/* Name */}
                      <span
                        className="text-[15px] text-white/80 font-medium leading-tight group-hover:text-white transition-colors"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {tech.name}
                      </span>

                      {/* Description */}
                      <p className="font-mono text-[11px] text-white/35 line-clamp-2 leading-relaxed group-hover:text-white/45 transition-colors">
                        {tech.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-3 mt-auto pt-2 border-t border-white/[0.04]">
                        <span className="font-mono text-[10px]" style={{ color: '#00ff88' }}>
                          {tech.relatedVendorCount} companies
                        </span>
                        {tech.governmentBudgetFY25M !== undefined && (
                          <span className="font-mono text-[10px]" style={{ color: '#ffd700' }}>
                            ~${tech.governmentBudgetFY25M}M gov
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* View More */}
              {hasMore && (
                <div className="flex justify-center py-6">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="font-mono text-[11px] tracking-widest uppercase px-8 py-2.5
                               border border-white/[0.08] hover:border-[#00d4ff]/30 rounded-sm
                               text-white/40 hover:text-[#00d4ff] transition-all duration-200"
                  >
                    {showAll ? 'View Less' : `View All ${filtered.length} Technologies`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Custom search */}
          <div className="py-8 mt-4 border-t border-white/[0.06]">
            <p className="font-mono text-[12px] text-white/40 mb-3 tracking-wide">
              Don&apos;t see your technology? Search any keyword
            </p>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={customSearch}
                onChange={(e) => setCustomSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSearch(); }}
                placeholder="e.g. quantum computing, biotech..."
                className="flex-1 bg-white/[0.03] font-mono text-[12px] text-white/70 placeholder-white/20
                           px-3 py-2.5 outline-none border border-white/[0.08] rounded-sm
                           focus:border-[#00d4ff]/30 transition-colors"
              />
              <button
                onClick={handleCustomSearch}
                className="font-mono text-[10px] tracking-widest uppercase px-5 py-2.5
                           border border-[#00d4ff]/30 text-[#00d4ff] rounded-sm
                           hover:bg-[#00d4ff]/10 transition-all duration-200"
              >
                Explore
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="py-3 border-t border-white/[0.05] mb-4">
            <span className="font-mono text-[9px] text-white/15">
              {dedupedCatalog.length} technologies — NXT//LINK Registry
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
