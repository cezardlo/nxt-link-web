'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import type { VendorRecord } from '@/lib/data/el-paso-vendors';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_VENDORS = 4;

const CATEGORY_COLORS: Record<string, string> = {
  'Defense':     '#00d4ff',
  'Defense IT':  '#00d4ff',
  'Consulting':  '#ffd700',
  'Healthcare':  '#00ff88',
  'Logistics':   '#f97316',
  'Energy':      '#ffb800',
  'Technology':  '#a855f7',
  'Cybersecurity': '#ff3b30',
  'Manufacturing': '#f97316',
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? '#94a3b8';
}

function ikerColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#ffd700';
  return '#f97316';
}

function layerColor(layer: string): string {
  if (layer === 'vendors')  return '#00d4ff';
  if (layer === 'momentum') return '#ffd700';
  if (layer === 'funding')  return '#00ff88';
  return '#94a3b8';
}

// ─── Vendor Selector Card ─────────────────────────────────────────────────────

function VendorCard({
  vendor,
  selected,
  onToggle,
  disabled,
}: {
  vendor: VendorRecord;
  selected: boolean;
  onToggle: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={() => onToggle(vendor.id)}
      disabled={selected ? false : disabled}
      className={[
        'w-full text-left p-3 rounded-sm border transition-all duration-150',
        'bg-black/92 backdrop-blur-md',
        selected
          ? 'border-[#00d4ff]/40 bg-[#00d4ff]/[0.06]'
          : disabled
          ? 'border-white/[0.06] opacity-40 cursor-not-allowed'
          : 'border-white/[0.06] hover:border-white/20 hover:bg-white/[0.03] cursor-pointer',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: categoryColor(vendor.category), boxShadow: `0 0 4px ${categoryColor(vendor.category)}99` }}
            />
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: categoryColor(vendor.category) }}>
              {vendor.category}
            </span>
          </div>
          <div className="font-mono text-[11px] text-white/90 truncate">{vendor.name}</div>
          <div className="font-mono text-[9px] text-white/40 mt-0.5 line-clamp-2 leading-relaxed">{vendor.description}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-mono text-sm font-bold" style={{ color: ikerColor(vendor.ikerScore) }}>
            {vendor.ikerScore}
          </span>
          {selected && (
            <span className="font-mono text-[8px] tracking-widest text-[#00d4ff]">✓ ADDED</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Comparison Column ────────────────────────────────────────────────────────

function ComparisonColumn({
  vendor,
  isHighestIker,
  isMostEvidence,
  isHighestConfidence,
  onRemove,
}: {
  vendor: VendorRecord;
  isHighestIker: boolean;
  isMostEvidence: boolean;
  isHighestConfidence: boolean;
  onRemove: (id: string) => void;
}) {
  const score = vendor.ikerScore;
  const color = ikerColor(score);

  return (
    <div className="flex-1 min-w-0 flex flex-col border border-white/[0.06] rounded-sm bg-black/92 backdrop-blur-md overflow-hidden">

      {/* Vendor header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: categoryColor(vendor.category), boxShadow: `0 0 5px ${categoryColor(vendor.category)}aa` }}
              />
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: categoryColor(vendor.category) }}>
                {vendor.category}
              </span>
            </div>
            <div
              className="font-sans text-base font-semibold text-white leading-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {vendor.name}
            </div>
          </div>
          <button
            onClick={() => onRemove(vendor.id)}
            className="font-mono text-[9px] text-white/30 hover:text-[#ff3b30] transition-colors shrink-0 mt-1"
            title="Remove vendor"
          >
            ✕
          </button>
        </div>

        {/* Winner badges */}
        <div className="flex flex-wrap gap-1 mt-2">
          {isHighestIker && (
            <span className="font-mono text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm border border-[#00ff88]/30 bg-[#00ff88]/10 text-[#00ff88]">
              ★ HIGHEST IKER
            </span>
          )}
          {isMostEvidence && (
            <span className="font-mono text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm border border-[#ffd700]/30 bg-[#ffd700]/10 text-[#ffd700]">
              ★ MOST EVIDENCE
            </span>
          )}
          {isHighestConfidence && (
            <span className="font-mono text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff]">
              ★ HIGHEST CONFIDENCE
            </span>
          )}
        </div>
      </div>

      {/* IKER score */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="font-mono text-[8px] tracking-[0.2em] text-white/40 uppercase mb-2">IKER Score</div>
        <div className="flex items-end gap-2 mb-2">
          <span
            className="font-mono text-4xl font-bold leading-none"
            style={{ color, textShadow: `0 0 12px ${color}88` }}
          >
            {score}
          </span>
          <span className="font-mono text-[9px] text-white/40 mb-1">/100</span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${score}%`, background: color, boxShadow: `0 0 6px ${color}88` }}
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="p-4 border-b border-white/[0.06] grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="font-mono text-[8px] tracking-widest text-white/40 uppercase mb-1">CONF</div>
          <div className="font-mono text-[11px] text-[#00d4ff]">{(vendor.confidence * 100).toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[8px] tracking-widest text-white/40 uppercase mb-1">WEIGHT</div>
          <div className="font-mono text-[11px] text-white/80">{(vendor.weight * 100).toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[8px] tracking-widest text-white/40 uppercase mb-1">LAYER</div>
          <div className="font-mono text-[9px] uppercase tracking-wider" style={{ color: layerColor(vendor.layer) }}>
            {vendor.layer}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="font-mono text-[8px] tracking-[0.2em] text-white/40 uppercase mb-2">Description</div>
        <p className="font-mono text-[9px] text-white/50 leading-relaxed line-clamp-4">{vendor.description}</p>
        <a
          href={vendor.website}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors mt-1.5 inline-block tracking-wide"
        >
          {vendor.website.replace('https://', '')} ↗
        </a>
      </div>

      {/* Evidence */}
      <div className="p-4 border-b border-white/[0.06] flex-1">
        <div className="font-mono text-[8px] tracking-[0.2em] text-white/40 uppercase mb-2">
          Evidence <span className="text-[#ffd700]">({vendor.evidence.length})</span>
        </div>
        <ul className="space-y-1.5">
          {vendor.evidence.map((ev, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-[#ffd700] text-[9px] mt-0.5 shrink-0">◆</span>
              <span className="font-mono text-[9px] text-white/60 leading-relaxed">{ev}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tags */}
      <div className="p-4">
        <div className="font-mono text-[8px] tracking-[0.2em] text-white/40 uppercase mb-2">Capabilities</div>
        <div className="flex flex-wrap gap-1">
          {vendor.tags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[8px] tracking-wide px-1.5 py-0.5 rounded-sm border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white/70 hover:border-white/20 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Score Chart ──────────────────────────────────────────────────────────────

function ScoreChart({ vendors }: { vendors: VendorRecord[] }) {
  if (vendors.length < 2) return null;
  const maxScore = Math.max(...vendors.map(v => v.ikerScore));

  return (
    <div className="border border-white/[0.06] rounded-sm bg-black/92 backdrop-blur-md p-5">
      <div className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase mb-4">
        IKER Score Comparison
      </div>
      <div className="space-y-3">
        {[...vendors]
          .sort((a, b) => b.ikerScore - a.ikerScore)
          .map((v) => {
            const color = ikerColor(v.ikerScore);
            const pct = (v.ikerScore / maxScore) * 100;
            return (
              <div key={v.id} className="flex items-center gap-3">
                <div
                  className="font-mono text-[9px] text-white/60 shrink-0"
                  style={{ width: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {v.name}
                </div>
                <div className="flex-1 h-5 bg-white/[0.04] rounded-sm overflow-hidden relative">
                  <div
                    className="h-full rounded-sm transition-all duration-700"
                    style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}55`, opacity: 0.9 }}
                  />
                  <span
                    className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] font-bold"
                    style={{ color }}
                  >
                    {v.ikerScore}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const allVendors = useMemo(() => Object.values(EL_PASO_VENDORS), []);
  const allCategories = useMemo(() => {
    const cats = new Set(allVendors.map(v => v.category));
    return ['All', ...Array.from(cats).sort()];
  }, [allVendors]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showSelector, setShowSelector] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Read URL params on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('v');
      if (v) {
        const ids = v.split(',').filter(id => id in EL_PASO_VENDORS).slice(0, MAX_VENDORS);
        setSelectedIds(ids);
      }
    }
  }, []);

  // Sync URL when selection changes (after mount)
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === 'undefined') return;
    const url = selectedIds.length > 0
      ? `/compare?v=${selectedIds.join(',')}`
      : '/compare';
    window.history.replaceState({}, '', url);
  }, [selectedIds, mounted]);

  const toggleVendor = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_VENDORS) return prev;
      return [...prev, id];
    });
  }, []);

  const removeVendor = useCallback((id: string) => {
    setSelectedIds(prev => prev.filter(x => x !== id));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Filtered vendor list for selector
  const filteredVendors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allVendors
      .filter(v => {
        const catOk = categoryFilter === 'All' || v.category === categoryFilter;
        if (!catOk) return false;
        if (!q) return true;
        return (
          v.name.toLowerCase().includes(q) ||
          v.tags.join(' ').toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [allVendors, searchQuery, categoryFilter]);

  // Selected vendor objects
  const selectedVendors = useMemo(
    () => selectedIds.map(id => EL_PASO_VENDORS[id]).filter(Boolean) as VendorRecord[],
    [selectedIds]
  );

  // Winner detection
  const winnerIker = useMemo(() => {
    if (selectedVendors.length < 2) return '';
    const max = Math.max(...selectedVendors.map(v => v.ikerScore));
    const winners = selectedVendors.filter(v => v.ikerScore === max);
    return winners.length === 1 ? winners[0].id : '';
  }, [selectedVendors]);

  const winnerEvidence = useMemo(() => {
    if (selectedVendors.length < 2) return '';
    const max = Math.max(...selectedVendors.map(v => v.evidence.length));
    const winners = selectedVendors.filter(v => v.evidence.length === max);
    return winners.length === 1 ? winners[0].id : '';
  }, [selectedVendors]);

  const winnerConfidence = useMemo(() => {
    if (selectedVendors.length < 2) return '';
    const max = Math.max(...selectedVendors.map(v => v.confidence));
    const winners = selectedVendors.filter(v => v.confidence === max);
    return winners.length === 1 ? winners[0].id : '';
  }, [selectedVendors]);

  const showComparison = selectedVendors.length >= 2;
  const canAdd = selectedIds.length < MAX_VENDORS;

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-black/95 border-b border-white/[0.06] backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <Link
            href="/map"
            className="font-mono text-[9px] tracking-[0.2em] text-white/40 hover:text-[#00d4ff] transition-colors uppercase"
          >
            ← INTELLIGENCE PLATFORM
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase">
              {selectedIds.length}/{MAX_VENDORS} selected
            </span>
            {selectedIds.length > 0 && (
              <button
                onClick={clearAll}
                className="font-mono text-[9px] tracking-widest text-white/30 hover:text-[#ff3b30] transition-colors uppercase px-2 py-1 rounded-sm border border-white/[0.06] hover:border-[#ff3b30]/30"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setShowSelector(s => !s)}
              disabled={!canAdd && !showSelector}
              className={[
                'font-mono text-[9px] tracking-widest uppercase px-3 py-1 rounded-sm border transition-all duration-150',
                showSelector
                  ? 'border-[#00d4ff]/40 bg-[#00d4ff]/10 text-[#00d4ff]'
                  : canAdd
                  ? 'border-white/[0.06] text-white/60 hover:border-[#00d4ff]/30 hover:text-[#00d4ff]'
                  : 'border-white/[0.04] text-white/20 opacity-40 cursor-not-allowed',
              ].join(' ')}
            >
              {showSelector ? '▲ Close' : '+ Add Vendor'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-5 py-6 space-y-6">

        {/* Page header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1 h-4 bg-[#00d4ff]" style={{ boxShadow: '0 0 8px #00d4ff88' }} />
            <h1
              className="text-lg font-semibold tracking-tight text-white"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              VENDOR INTELLIGENCE — HEAD TO HEAD
            </h1>
          </div>
          <p className="font-mono text-[9px] text-white/40 tracking-[0.15em] ml-3">
            Compare up to 4 vendors across IKER score, capabilities, and intelligence signals
          </p>
        </div>

        {/* Vendor Selector */}
        {showSelector && (
          <div className="border border-white/[0.06] rounded-sm bg-black/92 backdrop-blur-md p-5 space-y-4">
            <div className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase">
              Select Vendors — {selectedIds.length}/{MAX_VENDORS} chosen
            </div>

            {/* Search + filter row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search El Paso vendors..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2 font-mono text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[#00d4ff]/40 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-white/[0.03] border border-white/[0.08] rounded-sm px-2 py-2 font-mono text-[10px] text-white/70 focus:outline-none focus:border-[#00d4ff]/40 transition-colors"
                style={{ fontFamily: 'IBM Plex Mono, monospace' }}
              >
                {allCategories.map(c => (
                  <option key={c} value={c} className="bg-black">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor grid */}
            {filteredVendors.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {filteredVendors.map(v => (
                  <VendorCard
                    key={v.id}
                    vendor={v}
                    selected={selectedIds.includes(v.id)}
                    onToggle={toggleVendor}
                    disabled={!canAdd}
                  />
                ))}
              </div>
            ) : (
              <div className="font-mono text-[10px] text-white/30 text-center py-8">
                No vendors match your search
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!showComparison && !showSelector && (
          <div className="border border-white/[0.06] rounded-sm bg-black/92 backdrop-blur-md p-12 text-center">
            <div
              className="text-3xl mb-4"
              style={{ color: '#00d4ff', textShadow: '0 0 16px #00d4ff66', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              SELECT VENDORS TO COMPARE
            </div>
            <p className="font-mono text-[10px] text-white/40 tracking-[0.15em] mb-6">
              Choose 2–4 vendors to begin the head-to-head intelligence analysis
            </p>
            <button
              onClick={() => setShowSelector(true)}
              className="font-mono text-[10px] tracking-widest uppercase px-6 py-2.5 rounded-sm border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] hover:bg-[#00d4ff]/20 hover:border-[#00d4ff]/50 transition-all duration-150"
            >
              + Open Vendor Search
            </button>
            <div className="mt-4 font-mono text-[9px] text-white/25">
              or pass ?v=id1,id2 in the URL to pre-load vendors
            </div>
          </div>
        )}

        {/* Need one more */}
        {selectedVendors.length === 1 && !showSelector && (
          <div className="border border-[#ffd700]/20 rounded-sm bg-[#ffd700]/[0.03] p-4 flex items-center gap-3">
            <span className="text-[#ffd700] font-mono text-sm">◉</span>
            <span className="font-mono text-[10px] text-[#ffd700]/70 tracking-wide">
              Add at least one more vendor to start the comparison
            </span>
            <button
              onClick={() => setShowSelector(true)}
              className="ml-auto font-mono text-[9px] tracking-widest uppercase px-3 py-1 rounded-sm border border-[#ffd700]/30 text-[#ffd700]/70 hover:text-[#ffd700] hover:border-[#ffd700]/50 transition-colors"
            >
              + Add
            </button>
          </div>
        )}

        {/* Score chart */}
        {showComparison && <ScoreChart vendors={selectedVendors} />}

        {/* Side-by-side comparison */}
        {showComparison && (
          <div className="flex gap-3 items-stretch overflow-x-auto pb-2">
            {selectedVendors.map(v => (
              <ComparisonColumn
                key={v.id}
                vendor={v}
                isHighestIker={winnerIker === v.id}
                isMostEvidence={winnerEvidence === v.id}
                isHighestConfidence={winnerConfidence === v.id}
                onRemove={removeVendor}
              />
            ))}
          </div>
        )}

        {/* Quick actions footer */}
        {showComparison && (
          <div className="border border-white/[0.06] rounded-sm bg-black/92 backdrop-blur-md p-4 flex items-center justify-between gap-4">
            <div className="font-mono text-[9px] text-white/30 tracking-wide">
              {selectedVendors.length} vendor{selectedVendors.length !== 1 ? 's' : ''} in comparison
              {winnerIker && (
                <> — IKER winner: <span className="text-[#00ff88]">{EL_PASO_VENDORS[winnerIker]?.name}</span></>
              )}
            </div>
            <div className="flex gap-2">
              {canAdd && (
                <button
                  onClick={() => setShowSelector(true)}
                  className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 rounded-sm border border-white/[0.06] text-white/40 hover:border-[#00d4ff]/30 hover:text-[#00d4ff] transition-colors"
                >
                  + Add Another
                </button>
              )}
              <button
                onClick={clearAll}
                className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 rounded-sm border border-white/[0.06] text-white/30 hover:border-[#ff3b30]/30 hover:text-[#ff3b30] transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
