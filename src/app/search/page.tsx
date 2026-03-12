'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { KgTechnologyRow } from '@/db/queries/kg-technologies';
import type { KgCompanyRow } from '@/db/queries/kg-companies';
import type { KgIndustryRow } from '@/db/queries/kg-industries';

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchResults = {
  technologies: KgTechnologyRow[];
  companies: KgCompanyRow[];
  industries: KgIndustryRow[];
};

// ─── Quadrant colors ──────────────────────────────────────────────────────────

const QUADRANT_COLORS: Record<string, string> = {
  adopt: '#00ff88',
  trial: '#00d4ff',
  assess: '#ffd700',
  explore: '#64748b',
};

const MATURITY_LABELS: Record<string, string> = {
  research: 'Research',
  emerging: 'Emerging',
  early_adoption: 'Early Adoption',
  growth: 'Growth',
  mainstream: 'Mainstream',
};

// ─── IKER color ───────────────────────────────────────────────────────────────

function ikerColor(score: number | null): string {
  if (!score) return '#64748b';
  if (score >= 80) return '#00ff88';
  if (score >= 50) return '#ffd700';
  return '#64748b';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [allTechs, setAllTechs] = useState<KgTechnologyRow[]>([]);
  const [allIndustries, setAllIndustries] = useState<KgIndustryRow[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load all data on mount for browse mode
  useEffect(() => {
    async function loadAll() {
      try {
        const [/* techRes */, /* indRes */] = await Promise.all([
          fetch('/api/search?q=*').then(r => r.json()),
          fetch('/api/search?q=*').then(r => r.json()),
        ]);
        // Also do a direct fetch to get all technologies and industries
        const allTechRes = await fetch('/api/kg-browse?type=technologies');
        const allIndRes = await fetch('/api/kg-browse?type=industries');
        if (allTechRes.ok) setAllTechs(await allTechRes.json());
        if (allIndRes.ok) setAllIndustries(await allIndRes.json());
      } catch {
        // Fallback: will just show search
      }
    }
    loadAll();
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        setResults(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 250);
  };

  const hasResults = results && (
    results.technologies.length > 0 ||
    results.companies.length > 0 ||
    results.industries.length > 0
  );

  const showBrowse = !query && (allTechs.length > 0 || allIndustries.length > 0);

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-mono text-sm tracking-widest" style={{ color: '#00d4ff' }}>
            NXT//LINK
          </Link>
          <nav className="flex gap-6 font-mono text-xs tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Link href="/map" className="hover:text-white transition-colors">MAP</Link>
            <Link href="/search" className="text-white">SEARCH</Link>
          </nav>
        </div>
      </header>

      {/* Search Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-8">
        <h1
          className="text-center text-3xl font-semibold tracking-tight mb-2"
          style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', color: '#ffffff' }}
        >
          Global Technology Intelligence
        </h1>
        <p className="text-center font-mono text-xs tracking-wide mb-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Search any industry, technology, or vendor across the global knowledge graph
        </p>

        {/* Search bar */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center px-5 py-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="Search any industry, technology, or vendor..."
              autoFocus
              className="flex-1 bg-transparent ml-4 text-white text-base outline-none placeholder:text-white/25"
              style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace' }}
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#00d4ff', borderTopColor: 'transparent' }} />
            )}
          </div>
        </div>
      </div>

      {/* Search Results */}
      {hasResults && (
        <div className="max-w-7xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Technologies Column */}
            {results.technologies.length > 0 && (
              <div>
                <h2 className="font-mono text-[10px] tracking-widest uppercase mb-4" style={{ color: '#00d4ff' }}>
                  Technologies ({results.technologies.length})
                </h2>
                <div className="space-y-3">
                  {results.technologies.map(tech => (
                    <TechnologyCard key={tech.id} tech={tech} />
                  ))}
                </div>
              </div>
            )}

            {/* Companies Column */}
            {results.companies.length > 0 && (
              <div>
                <h2 className="font-mono text-[10px] tracking-widest uppercase mb-4" style={{ color: '#00d4ff' }}>
                  Companies ({results.companies.length})
                </h2>
                <div className="space-y-3">
                  {results.companies.map(company => (
                    <CompanyCard key={company.id} company={company} />
                  ))}
                </div>
              </div>
            )}

            {/* Industries Column */}
            {results.industries.length > 0 && (
              <div>
                <h2 className="font-mono text-[10px] tracking-widest uppercase mb-4" style={{ color: '#00d4ff' }}>
                  Industries ({results.industries.length})
                </h2>
                <div className="space-y-3">
                  {results.industries.map(industry => (
                    <IndustryCard key={industry.id} industry={industry} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No results */}
      {query.length >= 2 && !loading && results && !hasResults && (
        <div className="text-center py-12">
          <p className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No results for &ldquo;{query}&rdquo;
          </p>
        </div>
      )}

      {/* Browse mode — show all when no query */}
      {showBrowse && (
        <div className="max-w-7xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Technologies */}
            {allTechs.length > 0 && (
              <div>
                <h2 className="font-mono text-[10px] tracking-widest uppercase mb-4" style={{ color: '#00d4ff' }}>
                  All Technologies ({allTechs.length})
                </h2>
                <div className="space-y-3">
                  {allTechs.map(tech => (
                    <TechnologyCard key={tech.id} tech={tech} />
                  ))}
                </div>
              </div>
            )}

            {/* Industries */}
            {allIndustries.length > 0 && (
              <div>
                <h2 className="font-mono text-[10px] tracking-widest uppercase mb-4" style={{ color: '#00d4ff' }}>
                  All Industries ({allIndustries.length})
                </h2>
                <div className="space-y-3">
                  {allIndustries.map(industry => (
                    <IndustryCard key={industry.id} industry={industry} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Technology Card ──────────────────────────────────────────────────────────

function TechnologyCard({ tech }: { tech: KgTechnologyRow }) {
  const quadrantColor = QUADRANT_COLORS[tech.radar_quadrant ?? ''] ?? '#64748b';
  const maturityLabel = MATURITY_LABELS[tech.maturity_stage ?? ''] ?? tech.maturity_stage ?? '—';

  return (
    <Link
      href={`/search?q=${encodeURIComponent(tech.name)}`}
      className="block rounded-lg p-4 transition-all hover:scale-[1.01]"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-white">{tech.name}</h3>
        {tech.radar_quadrant && (
          <span
            className="font-mono text-[9px] tracking-widest uppercase px-2 py-0.5 rounded"
            style={{
              color: quadrantColor,
              border: `1px solid ${quadrantColor}44`,
              background: `${quadrantColor}11`,
            }}
          >
            {tech.radar_quadrant}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
        <span>{maturityLabel}</span>
        {tech.iker_score != null && (
          <span style={{ color: ikerColor(tech.iker_score) }}>
            IKER {tech.iker_score}
          </span>
        )}
        {tech.signal_velocity != null && tech.signal_velocity > 0 && (
          <span style={{ color: '#f97316' }}>
            +{tech.signal_velocity} signals
          </span>
        )}
      </div>
      {tech.description && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {tech.description.slice(0, 120)}
        </p>
      )}
    </Link>
  );
}

// ─── Company Card ─────────────────────────────────────────────────────────────

function CompanyCard({ company }: { company: KgCompanyRow }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(company.name)}`}
      className="block rounded-lg p-4 transition-all hover:scale-[1.01]"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-white">{company.name}</h3>
        {company.company_type && (
          <span
            className="font-mono text-[9px] tracking-widest uppercase px-2 py-0.5 rounded"
            style={{
              color: '#00d4ff',
              border: '1px solid rgba(0,212,255,0.2)',
              background: 'rgba(0,212,255,0.06)',
            }}
          >
            {company.company_type}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {company.iker_score != null && (
          <span style={{ color: ikerColor(company.iker_score) }}>
            IKER {company.iker_score}
          </span>
        )}
        {company.website && (
          <span className="truncate max-w-[150px]">{company.website.replace(/^https?:\/\//, '')}</span>
        )}
      </div>
      {company.description && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {company.description.slice(0, 120)}
        </p>
      )}
    </Link>
  );
}

// ─── Industry Card ────────────────────────────────────────────────────────────

function IndustryCard({ industry }: { industry: KgIndustryRow }) {
  return (
    <Link
      href={`/industry/${industry.slug}`}
      className="block rounded-lg p-4 transition-all hover:scale-[1.01]"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <h3 className="text-sm font-medium text-white mb-1">{industry.name}</h3>
      <div className="flex items-center gap-3 font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {industry.iker_score != null && (
          <span style={{ color: ikerColor(industry.iker_score) }}>
            IKER {industry.iker_score}
          </span>
        )}
        <span style={{ color: '#00d4ff' }}>View industry &rarr;</span>
      </div>
      {industry.description && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {industry.description.slice(0, 120)}
        </p>
      )}
    </Link>
  );
}
