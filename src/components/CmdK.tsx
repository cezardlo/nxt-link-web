'use client';

import { useEffect, useRef, useState } from 'react';

import type { ContractPoint, MapPoint, SamBusinessPoint } from '@/components/MapCanvas';
import type { CrimeFeedItem } from '@/components/CrimeNewsOverlay';
import { CONFERENCES } from '@/lib/data/conferences/index';
import type { ConferenceRecord } from '@/lib/data/conferences/types';
import { TECHNOLOGY_CATALOG } from '@/lib/data/technology-catalog';
import type { Technology } from '@/lib/data/technology-catalog';

// WorldMonitor-style layer presets for El Paso intelligence contexts
type LayerPreset = {
  id: string;
  label: string;
  description: string;
  color: string;
  layers: string[];
};

const LAYER_PRESETS: LayerPreset[] = [
  { id: 'defense',  label: 'DEFENSE',       description: 'Fort Bliss · C4ISR · Defense IT',    color: '#f97316', layers: ['vendors', 'momentum', 'ikerScores'] },
  { id: 'logistics',label: 'LOGISTICS',     description: 'Airport · Fulfillment · Maquiladora', color: '#00d4ff', layers: ['vendors', 'products', 'ikerScores'] },
  { id: 'border',   label: 'BORDER TECH',   description: 'POE · Customs · Trade Compliance',    color: '#ffb800', layers: ['vendors', 'funding', 'momentum'] },
  { id: 'energy',   label: 'ENERGY',        description: 'Solar · Grid · Water Tech',           color: '#ffd700', layers: ['vendors', 'momentum', 'products'] },
  { id: 'funding',  label: 'FUNDING INTEL', description: 'Startups · VC · Grant Activity',     color: '#00ff88', layers: ['vendors', 'funding', 'ikerScores', 'momentum'] },
];

const PAGE_ITEMS = [
  { label: 'INDUSTRIES', href: '/industry', description: 'Explore 8 industry sectors', color: '#00d4ff' },
  { label: 'VENDORS',    href: '/vendors',    description: '98+ El Paso technology vendors', color: '#ffb800' },
  { label: 'MAP',        href: '/map',        description: 'Intelligence map platform', color: '#00d4ff' },
  { label: 'OPS',        href: '/ops',        description: 'Operations center — procurement & alerts', color: '#f97316' },
  { label: 'COMMAND',    href: '/command',    description: 'Command console — mission control', color: '#ff3b30' },
];

const INDUSTRY_ITEMS = [
  { label: 'AI / ML',        href: '/industry/ai-ml',          description: 'Artificial intelligence and machine learning', color: '#00d4ff' },
  { label: 'CYBERSECURITY',  href: '/industry/cybersecurity',   description: 'Cyber defense and threat detection',           color: '#00d4ff' },
  { label: 'DEFENSE',        href: '/industry/defense',         description: 'Defense technology and military systems',      color: '#f97316' },
  { label: 'BORDER TECH',    href: '/industry/border-tech',     description: 'Border security and trade technology',         color: '#f97316' },
  { label: 'MANUFACTURING',  href: '/industry/manufacturing',   description: 'Advanced manufacturing and robotics',          color: '#00d4ff' },
  { label: 'ENERGY',         href: '/industry/energy',          description: 'Energy technology and sustainability',         color: '#ffb800' },
  { label: 'HEALTHCARE',     href: '/industry/healthcare',      description: 'Health IT and medical technology',             color: '#00ff88' },
  { label: 'LOGISTICS',      href: '/industry/logistics',       description: 'Supply chain and logistics technology',        color: '#ffb800' },
];

const RECENT_KEY = 'nxtlink_cmdk_recent';
const RECENT_MAX = 5;

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]; }
  catch { return []; }
}
function saveRecent(label: string) {
  try {
    const prev = getRecent().filter((q) => q !== label);
    localStorage.setItem(RECENT_KEY, JSON.stringify([label, ...prev].slice(0, RECENT_MAX)));
  } catch { /* ignore */ }
}

export type Props = {
  open: boolean;
  onClose: () => void;
  context?: 'map' | 'global';
  timeRange?: number;
  onVendorSelect?: (point: MapPoint) => void;
  onLayerPreset?: (layers: string[]) => void;
  onFlyTo?: (target: { longitude: number; latitude: number; zoom: number }) => void;
  onNavigate?: (point: MapPoint) => void;
  contracts?: ContractPoint[];
  samBusinesses?: SamBusinessPoint[];
  crimeArticles?: CrimeFeedItem[];
};

import type { LayerApiResponse } from '@/types/map';
type ResultItem =
  | { kind: 'vendor'; point: MapPoint }
  | { kind: 'preset'; preset: LayerPreset }
  | { kind: 'contract'; contract: ContractPoint }
  | { kind: 'business'; business: SamBusinessPoint }
  | { kind: 'article'; article: CrimeFeedItem }
  | { kind: 'page'; label: string; href: string; description: string; color: string }
  | { kind: 'industry'; label: string; href: string; description: string; color: string }
  | { kind: 'conference'; conference: ConferenceRecord }
  | { kind: 'technology'; technology: Technology }
  | { kind: 'explore'; label: string; slug: string };

const GROUP_LABELS: Record<string, string> = {
  page:         'PAGES',
  industry:     'INDUSTRIES',
  preset:       'LAYER PRESETS',
  vendor:       'VENDORS',
  contract:     'CONTRACTS',
  business:     'SAM BUSINESSES',
  article:      'FEED ARTICLES',
  conference:   'CONFERENCES',
  technology:   'TECHNOLOGIES',
  explore:      'EXPLORE INDUSTRY',
};

export function CmdK({
  open,
  onClose,
  context = 'global',
  timeRange = 30,
  onVendorSelect,
  onLayerPreset,
  onFlyTo,
  onNavigate,
  contracts = [],
  samBusinesses = [],
  crimeArticles = [],
}: Props) {
  const [query, setQuery] = useState('');
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMap = context === 'map';

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/intel/api/map/layers?timeRange=${timeRange}&layers=vendors`)
      .then((r) => r.json())
      .then((data: LayerApiResponse | LayerApiResponse[]) => {
        if (cancelled) return;
        const all: MapPoint[] = [];
        const responses = Array.isArray(data) ? data : [data];
        for (const res of responses) {
          if (res.offline || res.ok === false) break;
          if (Array.isArray(res.points)) all.push(...res.points);
        }
        setPoints(all);
      })
      .catch((err) => console.warn('[CmdK] intel-signals fetch failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, timeRange]);

  const results: ResultItem[] = (() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      const pages: ResultItem[] = PAGE_ITEMS.map((p) => ({ kind: 'page' as const, ...p }));

      if (!isMap) {
        const industries: ResultItem[] = INDUSTRY_ITEMS.map((p) => ({ kind: 'industry' as const, ...p }));
        return [...pages, ...industries];
      }

      const presets: ResultItem[] = LAYER_PRESETS.map((preset) => ({ kind: 'preset' as const, preset }));
      const recentVendors: ResultItem[] = recent
        .map((label) => points.find((p) => p.label === label))
        .filter((p): p is MapPoint => Boolean(p))
        .map((point) => ({ kind: 'vendor' as const, point }));
      return [...pages, ...presets, ...recentVendors];
    }

    const pageMatches: ResultItem[] = PAGE_ITEMS.filter(
      (p) => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    ).map((p) => ({ kind: 'page' as const, ...p }));

    const conferenceMatches: ResultItem[] = (CONFERENCES as readonly ConferenceRecord[])
      .filter((c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
      .slice(0, 5)
      .map((conference) => ({ kind: 'conference' as const, conference }));
    const technologyMatches: ResultItem[] = TECHNOLOGY_CATALOG
      .filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      .slice(0, 5)
      .map((technology) => ({ kind: 'technology' as const, technology }));

    // Always offer "explore as industry" for any typed query
    const exploreSlug = q.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const exploreItem: ResultItem = { kind: 'explore' as const, label: query.trim(), slug: exploreSlug };

    if (!isMap) {
      const industryMatches: ResultItem[] = INDUSTRY_ITEMS.filter(
        (p) => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
      ).map((p) => ({ kind: 'industry' as const, ...p }));
      const vendorMatches: ResultItem[] = points
        .filter((p) => p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
        .slice(0, 8)
        .map((point) => ({ kind: 'vendor' as const, point }));
      return [...pageMatches, ...industryMatches, ...vendorMatches, ...conferenceMatches, ...technologyMatches, exploreItem];
    }

    const presetMatches: ResultItem[] = LAYER_PRESETS.filter(
      (p) => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.id.includes(q),
    ).map((preset) => ({ kind: 'preset' as const, preset }));
    const vendorMatches: ResultItem[] = points
      .filter((p) => p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .slice(0, 8)
      .map((point) => ({ kind: 'vendor' as const, point }));
    const contractMatches: ResultItem[] = contracts
      .filter((c) => c.vendor.toLowerCase().includes(q) || c.agency.toLowerCase().includes(q) || c.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map((contract) => ({ kind: 'contract' as const, contract }));
    const businessMatches: ResultItem[] = samBusinesses
      .filter((b) => b.name.toLowerCase().includes(q) || b.cageCode.toLowerCase().includes(q) || b.naicsDescription.toLowerCase().includes(q))
      .slice(0, 5)
      .map((business) => ({ kind: 'business' as const, business }));
    const articleMatches: ResultItem[] = crimeArticles
      .filter((a) => a.title.toLowerCase().includes(q) || a.source.toLowerCase().includes(q))
      .slice(0, 5)
      .map((article) => ({ kind: 'article' as const, article }));
    return [...pageMatches, ...presetMatches, ...vendorMatches, ...contractMatches, ...businessMatches, ...articleMatches, ...conferenceMatches, ...technologyMatches, exploreItem];
  })();

  const handleSelect = (item: ResultItem) => {
    if (item.kind === 'industry') {
      window.location.href = item.href;
      onClose();
    } else if (item.kind === 'page') {
      window.location.href = item.href;
      onClose();
    } else if (item.kind === 'preset') {
      onLayerPreset?.(item.preset.layers);
      onClose();
    } else if (item.kind === 'vendor') {
      saveRecent(item.point.label);
      if (onNavigate) {
        onNavigate(item.point);
      } else if (onVendorSelect) {
        onVendorSelect(item.point);
      } else {
        window.location.href = '/vendor/' + item.point.id;
        onClose();
      }
    } else if (item.kind === 'contract') {
      onFlyTo?.({ longitude: item.contract.lon, latitude: item.contract.lat, zoom: 14 });
      onClose();
    } else if (item.kind === 'business') {
      onFlyTo?.({ longitude: item.business.lon, latitude: item.business.lat, zoom: 14 });
      onClose();
    } else if (item.kind === 'article') {
      window.open(item.article.link, '_blank', 'noopener,noreferrer');
      onClose();
    } else if (item.kind === 'conference') {
      window.open(item.conference.website, '_blank', 'noopener,noreferrer');
      onClose();
    } else if (item.kind === 'technology') {
      window.location.href = `/technology/${item.technology.id}`;
      onClose();
    } else if (item.kind === 'explore') {
      window.location.href = `/industry/${item.slug}`;
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[activeIndex]) { handleSelect(results[activeIndex]); }
    else if (e.key === 'Escape') { onClose(); }
  };

  if (!open) return null;

  let lastKind: string | null = null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md mx-4 bg-black border border-white/10 rounded-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
          <span className="font-mono text-[9px] tracking-[0.2em] text-white/25">⌘K COMMAND PALETTE</span>
          <button onClick={onClose} className="font-mono text-[9px] text-white/20 hover:text-white/50 transition-colors">ESC</button>
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
          <span className="font-mono text-xs text-white/20 shrink-0">›</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder={isMap ? 'search vendors, contracts, businesses, articles, conferences...' : 'search pages, industries, vendors, conferences, technologies...'}
            className="flex-1 bg-transparent font-mono text-xs text-white/70 placeholder-white/15 outline-none"
            aria-label="Search commands"
          />
          {loading && <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: '#00ff88' }} />}
        </div>

        <div className="max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-3 py-4 font-mono text-[10px] text-white/20 text-center">
              {loading ? 'Loading...' : 'No results'}
            </div>
          ) : (
            results.map((item, i) => {
              const isActive = i === activeIndex;
              const showGroupLabel = item.kind !== lastKind;
              lastKind = item.kind;

              return (
                <div key={
                  item.kind === 'page'         ? `pg-${item.href}` :
                  item.kind === 'industry'     ? `ind-${item.href}` :
                  item.kind === 'preset'       ? `p-${item.preset.id}` :
                  item.kind === 'vendor'       ? `v-${item.point.id}` :
                  item.kind === 'contract'     ? `c-${item.contract.id}` :
                  item.kind === 'business'     ? `b-${item.business.id}` :
                  item.kind === 'conference'   ? `cf-${item.conference.id}` :
                  item.kind === 'technology'   ? `tech-${item.technology.id}` :
                  item.kind === 'explore'      ? `exp-${item.slug}` :
                  `a-${item.article.link}`
                }>
                  {showGroupLabel && (
                    <div className="px-3 pt-2 pb-0.5">
                      <span className="font-mono text-[8px] tracking-[0.2em] text-white/15">
                        {item.kind === 'vendor' && !query ? 'RECENT' : GROUP_LABELS[item.kind] ?? item.kind.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full flex items-center justify-between px-3 py-2 transition-colors text-left ${isActive ? 'bg-white/5' : 'hover:bg-white/3'}`}
                  >
                    {(item.kind === 'page' || item.kind === 'industry') && (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: item.color, opacity: 0.8 }} />
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px] text-white/70">{item.label}</span>
                            <span className="font-mono text-[9px] text-white/25">{item.description}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[8px] text-white/20 shrink-0">GO →</span>
                      </>
                    )}
                    {item.kind === 'preset' && (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: item.preset.color, opacity: 0.8 }} />
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px] text-white/70">{item.preset.label}</span>
                            <span className="font-mono text-[9px] text-white/25">{item.preset.description}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[8px] text-white/20 shrink-0">ACTIVATE ↵</span>
                      </>
                    )}
                    {item.kind === 'vendor' && (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1 h-1 rounded-full shrink-0 bg-[#00d4ff]" style={{ opacity: 0.5 + (item.point.weight ?? 0.5) * 0.5 }} />
                          <span className="font-mono text-xs text-white/70 truncate">{item.point.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="font-mono text-[9px] text-white/25">{item.point.category}</span>
                          <span className="font-mono text-[9px] text-[#00d4ff]/40">↗</span>
                        </div>
                      </>
                    )}
                    {item.kind === 'contract' && (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-sm shrink-0 bg-[#00ff88]" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-[10px] text-white/70 truncate">{item.contract.vendor}</span>
                            <span className="font-mono text-[8px] text-white/25 truncate">
                              {item.contract.amount ? `$${(item.contract.amount / 1e6).toFixed(1)}M` : 'TBD'} · {item.contract.agency}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[8px] text-[#00ff88]/50 shrink-0">CONTRACT</span>
                      </>
                    )}
                    {item.kind === 'business' && (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-sm shrink-0 bg-[#00d4ff]" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-[10px] text-white/70 truncate">{item.business.name}</span>
                            <span className="font-mono text-[8px] text-white/25 truncate">
                              CAGE {item.business.cageCode} · {item.business.naicsDescription}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[8px] text-[#00d4ff]/50 shrink-0">SAM.GOV</span>
                      </>
                    )}
                    {item.kind === 'article' && (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-sm shrink-0 bg-[#f97316]" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-[10px] text-white/70 truncate">{item.article.title}</span>
                            <span className="font-mono text-[8px] text-white/25">{item.article.source}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[8px] text-[#f97316]/50 shrink-0">ARTICLE ↗</span>
                      </>
                    )}
                    {item.kind === 'conference' && (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-sm shrink-0 bg-[#a855f7]" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-[10px] text-white/70 truncate">{item.conference.name}</span>
                            <span className="font-mono text-[8px] text-white/25 truncate">
                              {item.conference.location} · {item.conference.month} · {item.conference.category}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[8px] text-[#a855f7]/50 shrink-0">EVENT ↗</span>
                      </>
                    )}
                    {item.kind === 'technology' && (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-sm shrink-0 bg-[#00d4ff]" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-[10px] text-white/70 truncate">{item.technology.name}</span>
                            <span className="font-mono text-[8px] text-white/25 truncate">
                              {item.technology.category} · {item.technology.maturityLevel} · {item.technology.relatedVendorCount} vendors
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[8px] text-[#00d4ff]/50 shrink-0">TECH →</span>
                      </>
                    )}
                    {item.kind === 'explore' && (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#00ff88] animate-pulse" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-[10px] text-white/70">Explore &ldquo;{item.label}&rdquo; as industry</span>
                            <span className="font-mono text-[8px] text-white/25">Scan intelligence sources for this industry</span>
                          </div>
                        </div>
                        <span className="font-mono text-[8px] text-[#00ff88]/50 shrink-0">DISCOVER →</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-white/5 flex gap-3">
          <span className="font-mono text-[9px] text-white/15">↑↓ navigate</span>
          <span className="font-mono text-[9px] text-white/15">↵ select</span>
          <span className="font-mono text-[9px] text-white/15">esc close</span>
          {!query && recent.length > 0 && (
            <span className="ml-auto font-mono text-[9px] text-white/10">{recent.length} recent</span>
          )}
        </div>
      </div>
    </div>
  );
}
