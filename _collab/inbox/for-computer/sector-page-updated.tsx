'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const SECTORS = [
  {
    slug: 'ai-ml',
    label: 'AI / ML',
    emoji: '🤖',
    description: 'Artificial intelligence, machine learning, autonomous systems, and edge computing.',
    ep_relevance: 'Fort Bliss AI autonomy programs · UTEP NSF research · Juárez smart manufacturing',
    tags: ['Autonomous Systems', 'Computer Vision', 'NLP/LLM'],
  },
  {
    slug: 'defense',
    label: 'Defense',
    emoji: '🛡️',
    description: 'Military technology, weapons systems, C4ISR, hypersonics, and defense modernization.',
    ep_relevance: 'Fort Bliss 1st Armored Division · THAAD battery · Active DoD procurement',
    tags: ['C4ISR', 'Hypersonics', 'Electronic Warfare'],
  },
  {
    slug: 'cybersecurity',
    label: 'Cybersecurity',
    emoji: '🔐',
    description: 'Zero trust, OT/ICS security, quantum cryptography, threat intelligence.',
    ep_relevance: 'Fort Bliss DoD networks · CBP digital infrastructure · UTEP grad programs',
    tags: ['Zero Trust', 'OT/ICS', 'Quantum Crypto'],
  },
  {
    slug: 'logistics',
    label: 'Logistics',
    emoji: '🚚',
    description: 'Supply chain, autonomous freight, cross-border trade, warehouse automation.',
    ep_relevance: '$126B in US-Mexico trade · Busiest ports of entry · XPO, Amazon, FedEx hub',
    tags: ['Cross-Border', 'Autonomous Trucking', 'Warehouse Automation'],
  },
  {
    slug: 'manufacturing',
    label: 'Manufacturing',
    emoji: '🏭',
    description: 'Industry 4.0, smart factories, cobots, digital twins, nearshoring.',
    ep_relevance: '300+ maquiladoras · Ford, Foxconn, Bosch, Lear · Nearshoring wave',
    tags: ['Smart Factory', 'Digital Twin', 'Nearshoring'],
  },
  {
    slug: 'border-tech',
    label: 'Border Tech',
    emoji: '🌉',
    description: 'Biometrics, cargo scanning, trade compliance, smart crossings, surveillance.',
    ep_relevance: 'CBP advanced scanning · USBP sector HQ · Technology laboratory for the US',
    tags: ['Biometrics', 'Cargo Scanning', 'Smart Crossing'],
  },
  {
    slug: 'energy',
    label: 'Energy',
    emoji: '⚡',
    description: 'Fusion, solid-state batteries, green hydrogen, smart grid, microgrids.',
    ep_relevance: 'El Paso Electric grid modernization · Fort Bliss energy resilience · Solar growth',
    tags: ['Fusion', 'Battery Storage', 'Solar'],
  },
  {
    slug: 'space',
    label: 'Space',
    emoji: '🚀',
    description: 'Commercial launch, satellite constellations, lunar economy, space manufacturing.',
    ep_relevance: 'SpaceX Starbase 45 min away · Space Valley positioning · UTEP aerospace',
    tags: ['Commercial Launch', 'Satellite Constellation', 'Lunar Economy'],
  },
];

interface SectorStats {
  signalCount: number;
  epDirectCount: number;
  momentum: 'ACCELERATING' | 'EMERGING' | 'SLOWING';
}

interface IntelSignalResponse {
  ok: boolean;
  total?: number;
  signals?: Array<{ el_paso_score?: number }>;
  findings?: Array<{ el_paso_score?: number }>;
}

function getMomentumStyle(momentum: string): { color: string; symbol: string } {
  if (momentum === 'ACCELERATING') return { color: '#27d17f', symbol: '↑' };
  if (momentum === 'EMERGING') return { color: '#0EA5E9', symbol: '◉' };
  return { color: '#f59e0b', symbol: '↓' };
}

export default function SectorIndexPage() {
  const [stats, setStats] = useState<Record<string, SectorStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Load signal counts for all sectors in parallel using the intel-signals API
        const results = await Promise.all(
          SECTORS.map(sector =>
            fetch(`/api/intel-signals?industry=${encodeURIComponent(sector.slug)}&limit=1`)
              .then(r => r.json() as Promise<IntelSignalResponse>)
              .then(d => ({
                slug: sector.slug,
                total: d.total ?? 0,
                signals: d.signals ?? d.findings ?? [],
              }))
              .catch(() => ({ slug: sector.slug, total: 0, signals: [] }))
          )
        );

        const newStats: Record<string, SectorStats> = {};
        results.forEach(result => {
          const { slug, total, signals } = result;
          const epDirectCount = signals.filter(
            s => typeof s.el_paso_score === 'number' && s.el_paso_score >= 60
          ).length;

          newStats[slug] = {
            signalCount: total,
            epDirectCount,
            momentum: total >= 50 ? 'ACCELERATING' : total >= 20 ? 'EMERGING' : 'SLOWING',
          };
        });

        setStats(newStats);
      } catch (err) {
        console.error('[sector index] error loading stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#07090A]">
      <div className="mx-auto max-w-[1120px] px-6 py-10 pb-24">

        {/* Header */}
        <section className="mb-10 border-b border-white/[0.06] pb-10">
          <div className="flex items-center gap-2 text-sm text-[#6b7280] mb-6">
            <Link href="/" className="hover:text-[#D4D8DC] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[#D4D8DC]">Sectors</span>
          </div>

          <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280] mb-3">Intelligence Sectors</p>
          <h1 className="text-4xl font-bold text-[#D4D8DC] md:text-5xl mb-4">
            Sector<br />Intelligence
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[#9ca3af]">
            Deep-dive intelligence for every sector that matters to El Paso, Fort Bliss, and the Borderplex. 
            From global signals down to local opportunity.
          </p>
        </section>

        {/* Sector Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {SECTORS.map(sector => {
            const sectorStats = stats[sector.slug];
            const momentum = sectorStats?.momentum ?? 'EMERGING';
            const { color, symbol } = getMomentumStyle(momentum);
            const signalCount = sectorStats?.signalCount ?? 0;
            const epDirectCount = sectorStats?.epDirectCount ?? 0;

            return (
              <Link
                key={sector.slug}
                href={`/sector/${sector.slug}`}
                className="group block rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-[#0EA5E9]/20 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-[#0EA5E9]/5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{sector.emoji}</span>
                    <div>
                      <h2 className="text-xl font-bold text-[#D4D8DC]">{sector.label}</h2>
                      {!loading && (
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                            style={{ color, borderColor: `${color}33`, background: `${color}14` }}
                          >
                            {symbol} {momentum}
                          </span>
                          {signalCount > 0 && (
                            <span className="text-[11px] text-[#4b5563]">{signalCount} signals</span>
                          )}
                          {epDirectCount > 0 && (
                            <span className="text-[11px] font-semibold text-[#0EA5E9]">
                              {epDirectCount} EP DIRECT
                            </span>
                          )}
                        </div>
                      )}
                      {loading && (
                        <div className="mt-1 h-4 w-32 rounded bg-white/[0.04] animate-pulse" />
                      )}
                    </div>
                  </div>

                  <span className="shrink-0 rounded-xl border border-[#0EA5E9]/20 bg-[#0EA5E9]/5 px-3 py-1.5 text-xs font-semibold text-[#0EA5E9] opacity-0 transition-opacity group-hover:opacity-100">
                    Deep dive →
                  </span>
                </div>

                <p className="mb-3 text-sm leading-6 text-[#9ca3af]">{sector.description}</p>

                {/* El Paso relevance */}
                <div className="mb-3 rounded-xl border border-[#0EA5E9]/10 bg-[#0EA5E9]/5 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0EA5E9]">EP · </span>
                  <span className="text-[11px] text-[#6b7280]">{sector.ep_relevance}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {sector.tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[10px] text-[#4b5563]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick stats strip */}
        <div className="mt-10 grid grid-cols-3 gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-[#D4D8DC]">8</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#4b5563]">Sectors tracked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-[#D4D8DC]">40+</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#4b5563]">Global sources</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-[#D4D8DC]">Live</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#4b5563]">Signal updates</div>
          </div>
        </div>
      </div>
    </div>
  );
}
