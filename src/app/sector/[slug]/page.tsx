'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ObserverIntelPanel } from '@/components/ObserverIntelPanel';
import { SignalCard, type SignalCardData } from '@/components/SignalCard';

// ── Sector metadata ───────────────────────────────────────────────────────────

const SECTOR_META: Record<string, {
  label: string; emoji: string; description: string; ep_relevance: string; tags: string[];
}> = {
  'ai-ml':         { label: 'AI / ML',         emoji: '🤖', description: 'Artificial intelligence, machine learning, autonomous systems, and edge computing.', ep_relevance: 'Fort Bliss AI autonomy programs · UTEP NSF research · Juárez smart manufacturing', tags: ['Autonomous Systems', 'Computer Vision', 'LLM/NLP'] },
  'defense':       { label: 'Defense',          emoji: '🛡️', description: 'Military technology, weapons systems, C4ISR, hypersonics, and defense modernization.', ep_relevance: 'Fort Bliss 1st Armored Division · THAAD battery · Active DoD procurement', tags: ['C4ISR', 'Hypersonics', 'Electronic Warfare'] },
  'cybersecurity': { label: 'Cybersecurity',    emoji: '🔐', description: 'Zero trust, OT/ICS security, quantum cryptography, threat intelligence.', ep_relevance: 'Fort Bliss DoD networks · CBP digital infrastructure · UTEP grad programs', tags: ['Zero Trust', 'OT/ICS', 'Threat Intel'] },
  'logistics':     { label: 'Logistics',        emoji: '🚚', description: 'Supply chain, autonomous freight, cross-border trade, warehouse automation.', ep_relevance: '$126B in US-Mexico trade · Busiest ports of entry · XPO, Amazon, FedEx hub', tags: ['Cross-Border', 'Autonomous Trucking', 'Warehouse Automation'] },
  'manufacturing': { label: 'Manufacturing',    emoji: '🏭', description: 'Industry 4.0, smart factories, cobots, digital twins, nearshoring.', ep_relevance: '300+ maquiladoras · Ford, Foxconn, Bosch, Lear · Nearshoring wave', tags: ['Smart Factory', 'Digital Twin', 'Nearshoring'] },
  'border-tech':   { label: 'Border Tech',      emoji: '🌉', description: 'Biometrics, cargo scanning, trade compliance, smart crossings, surveillance.', ep_relevance: 'CBP advanced scanning · USBP sector HQ · Tech lab for the US border', tags: ['Biometrics', 'Cargo Scanning', 'Smart Crossing'] },
  'energy':        { label: 'Energy',           emoji: '⚡', description: 'Fusion, solid-state batteries, green hydrogen, smart grid, microgrids.', ep_relevance: 'El Paso Electric grid modernization · Fort Bliss energy resilience · Solar growth', tags: ['Grid Modernization', 'Solar', 'Microgrids'] },
  'space':         { label: 'Space',            emoji: '🚀', description: 'Commercial launch, satellite constellations, lunar economy, space manufacturing.', ep_relevance: 'White Sands Missile Range · SpaceX Starbase ~90mi away · Army space ops', tags: ['Commercial Launch', 'Satellites', 'Lunar Economy'] },
  'robotics':      { label: 'Robotics',         emoji: '🦾', description: 'Industrial robotics, autonomous systems, human-robot interaction, cobots.', ep_relevance: 'Juárez factory automation · UTEP robotics research · Maquiladora modernization', tags: ['Industrial Robots', 'Cobots', 'Autonomous Systems'] },
  'finance':       { label: 'Finance',          emoji: '💹', description: 'Fintech, trade finance, cross-border payments, digital assets.', ep_relevance: 'US-Mexico trade financing · Cross-border payment infrastructure', tags: ['Trade Finance', 'Fintech', 'Cross-Border Payments'] },
  'healthcare':    { label: 'Healthcare',       emoji: '🏥', description: 'Digital health, medical AI, biotech, clinical informatics.', ep_relevance: 'UMC Health System · TTUHSC El Paso · Fort Bliss Wm. Beaumont Army Medical Center', tags: ['Medical AI', 'Digital Health', 'Biotech'] },
};

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  funding_round: 'FUNDING',
  contract_award: 'CONTRACT',
  patent_filing: 'PATENT',
  product_launch: 'LAUNCH',
  research_breakthrough: 'RESEARCH',
  merger_acquisition: 'M&A',
  market_shift: 'MARKET',
  technology: 'TECH',
  regulation: 'POLICY',
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SectorPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const meta = SECTOR_META[slug];

  const [signals, setSignals] = useState<SignalCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setLoading(true);
    setPage(0);
    fetch(`/api/intel-signals?industry=${slug}&limit=100`)
      .then(r => r.json())
      .then(d => {
        const raw = d.signals ?? d.findings ?? [];
        setSignals(raw.map((s: any) => ({
          id: s.id,
          title: s.title,
          industry: s.industry ?? slug,
          signal_type: s.signal_type ?? 'technology',
          importance_score: s.importance_score ?? s.importance ?? 0,
          direction: s.direction,
          meaning: s.meaning,
          el_paso_score: s.el_paso_score,
          el_paso_angle: s.el_paso_angle,
          company: s.company,
          url: s.url,
          discovered_at: s.discovered_at ?? new Date().toISOString(),
          source_domain: s.source_domain ?? s.source,
        })));
      })
      .catch(() => setSignals([]))
      .finally(() => setLoading(false));
  }, [slug]);

  // Filter options built from signal types present
  const typeFilters = ['ALL', ...Array.from(new Set(signals.map(s => s.signal_type).filter(Boolean)))];
  const filtered = filter === 'ALL' ? signals : signals.filter(s => s.signal_type === filter);
  const PAGE_SIZE = 20;
  const paged = filtered.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paged.length < filtered.length;

  if (!meta) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-gray-600 text-sm">Sector not found</div>
        <Link href="/sector" className="text-cyan-500 text-sm mt-4 inline-block hover:underline">← All Sectors</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link href="/sector" className="inline-flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-400 transition-colors mb-6">
        ← All Sectors
      </Link>

      {/* Sector Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{meta.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{meta.label}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{meta.description}</p>
          </div>
        </div>

        {/* EP Relevance pill */}
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mt-2">
          <span className="text-[11px] font-bold text-cyan-400 tracking-wide">EL PASO</span>
          <span className="text-[11px] text-cyan-600">{meta.ep_relevance}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {meta.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Observer Intelligence Panel */}
      {loading ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8 animate-pulse">
          <div className="h-3 bg-gray-800 rounded w-40 mb-4" />
          <div className="h-2 bg-gray-800 rounded w-full mb-2" />
          <div className="h-2 bg-gray-800 rounded w-3/4" />
        </div>
      ) : (
        <ObserverIntelPanel sector={slug} signals={signals} />
      )}

      {/* Signal Feed Header + Filters */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Signal Feed</h2>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {loading ? 'Loading...' : `${filtered.length} signals`}
            {filter !== 'ALL' && ` · filtered by ${filter}`}
          </p>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1.5 flex-wrap justify-end">
          {typeFilters.slice(0, 6).map(t => (
            <button
              key={t}
              onClick={() => { setFilter(t); setPage(0); }}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide transition-all ${
                filter === t
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'
              }`}
            >
              {t === 'ALL' ? 'ALL' : (SIGNAL_TYPE_LABELS[t] ?? t.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Signal Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">
          No signals for this sector yet. Sources are being monitored continuously.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paged.map((s, i) => (
              <SignalCard key={s.id ?? i} {...s} />
            ))}
          </div>
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={() => setPage(p => p + 1)}
                className="text-[12px] text-gray-500 border border-gray-700 rounded-full px-6 py-2 hover:text-gray-300 hover:border-gray-600 transition-all"
              >
                Load more ({filtered.length - paged.length} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
