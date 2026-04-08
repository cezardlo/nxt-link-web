'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// ── Sector metadata ────────────────────────────────────────────────────────────

const SECTOR_META: Record<string, {
  label: string;
  emoji: string;
  description: string;
  ep_why: string;
  subsectors: string[];
}> = {
  'ai-ml': {
    label: 'AI / ML',
    emoji: '🤖',
    description: 'Artificial intelligence, machine learning, autonomous systems, and edge computing.',
    ep_why: 'Fort Bliss is expanding AI autonomy test programs. UTEP has NSF-funded AI research. Juárez manufacturers are adopting AI quality control.',
    subsectors: ['Autonomous Systems', 'Computer Vision', 'NLP/LLM', 'Edge AI', 'Predictive Analytics'],
  },
  'defense': {
    label: 'Defense',
    emoji: '🛡️',
    description: 'Military technology, weapons systems, C4ISR, hypersonics, and defense modernization.',
    ep_why: 'Fort Bliss — 1st Armored Division — is one of the largest Army test sites in the US. THAAD battery. Active procurement for AI, robotics, and autonomous vehicles.',
    subsectors: ['C4ISR', 'Autonomous Weapons', 'Hypersonics', 'Electronic Warfare', 'Space Defense'],
  },
  'cybersecurity': {
    label: 'Cybersecurity',
    emoji: '🔐',
    description: 'Zero trust, OT/ICS security, quantum cryptography, threat intelligence.',
    ep_why: 'Fort Bliss networks are a prime DoD cybersecurity priority. CBP digital border infrastructure requires constant hardening. UTEP has cybersecurity graduate programs.',
    subsectors: ['Zero Trust', 'OT/ICS', 'Quantum Crypto', 'Threat Intel', 'Border Tech Cyber'],
  },
  'logistics': {
    label: 'Logistics',
    emoji: '🚚',
    description: 'Supply chain, autonomous freight, cross-border trade, warehouse automation.',
    ep_why: 'El Paso handles $126B in US-Mexico trade annually. BOTA and BOTE are the busiest commercial ports of entry in the Western Hemisphere. XPO, Amazon, FedEx all have major El Paso operations.',
    subsectors: ['Cross-Border', 'Autonomous Trucking', 'Warehouse Automation', 'Last Mile', 'Trade Compliance'],
  },
  'manufacturing': {
    label: 'Manufacturing',
    emoji: '🏭',
    description: 'Industry 4.0, smart factories, cobots, digital twins, nearshoring.',
    ep_why: '300+ maquiladoras in Juárez manufacture for Ford, Foxconn, Bosch, and Lear. Nearshoring wave is bringing more production to the Borderplex region.',
    subsectors: ['Smart Factory', 'Cobots', 'Digital Twin', 'Additive Manufacturing', 'Nearshoring'],
  },
  'border-tech': {
    label: 'Border Tech',
    emoji: '🌉',
    description: 'Biometrics, cargo scanning, trade compliance, smart crossings, surveillance.',
    ep_why: 'El Paso is the laboratory for US border technology. CBP operates its most advanced scanning and biometric systems here. USBP has a major sector headquarters.',
    subsectors: ['Biometrics', 'Cargo Scanning', 'Smart Crossing', 'Trade Compliance', 'Surveillance'],
  },
  'energy': {
    label: 'Energy',
    emoji: '⚡',
    description: 'Fusion, solid-state batteries, green hydrogen, smart grid, microgrids.',
    ep_why: 'El Paso Electric is modernizing the grid. ERCOT supplies power to the region. Fort Bliss has major energy resilience requirements. Solar capacity is growing.',
    subsectors: ['Fusion', 'Battery Storage', 'Solar', 'Grid Modernization', 'Hydrogen'],
  },
  'space': {
    label: 'Space',
    emoji: '🚀',
    description: 'Commercial launch, satellite constellations, lunar economy, space manufacturing.',
    ep_why: 'SpaceX Starbase is 45 minutes from El Paso. The region is positioning as Space Valley. Fort Bliss has space domain awareness programs. UTEP has aerospace engineering.',
    subsectors: ['Commercial Launch', 'Satellite Constellation', 'Space Manufacturing', 'Lunar Economy', 'Space Domain Awareness'],
  },
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface Signal {
  id: string;
  title: string;
  evidence: string | null;
  source: string | null;
  industry: string | null;
  importance_score: number | null;
  signal_type: string | null;
  discovered_at: string;
  url: string | null;
  company: string | null;
  region: string | null;
}

interface Vendor {
  id: number;
  company_name: string;
  company_url: string | null;
  description: string | null;
  iker_score: number | null;
  sector: string | null;
  hq_country: string | null;
  hq_city: string | null;
}

interface Conference {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  start_date: string | null;
  website: string | null;
  category: string | null;
  relevance_score: number | null;
}

interface Discovery {
  id: string;
  title: string;
  summary: string | null;
  research_institution: string | null;
  iker_impact_score: number | null;
  source_url: string | null;
  source_name: string | null;
  published_at: string | null;
}

// ── Utility functions ──────────────────────────────────────────────────────────

function relTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function signalTypeColor(type: string | null): string {
  const map: Record<string, string> = {
    contract_award: '#27d17f',
    funding_round: '#a855f7',
    patent_filing: '#22d3ee',
    research_breakthrough: '#0EA5E9',
    product_launch: '#f97316',
    market_shift: '#f59e0b',
    partnership: '#f59e0b',
  };
  return map[type ?? ''] ?? '#6b7280';
}

function scoreColor(score: number): string {
  if (score >= 85) return '#27d17f';
  if (score >= 70) return '#0EA5E9';
  if (score >= 50) return '#f59e0b';
  return '#6b7280';
}

function displayScore(score: number | null): number {
  if (!score) return 0;
  return Math.round(score <= 1 ? score * 100 : score);
}

function regionFlag(region: string | null): string {
  if (!region) return '🌍';
  const r = region.toLowerCase();
  if (r.includes('united states') || r.includes(' us') || r === 'us' || r.includes('texas') || r.includes('north america')) return '🇺🇸';
  if (r.includes('china') || r.includes('east asia')) return '🇨🇳';
  if (r.includes('europe') || r.includes('eu')) return '🇪🇺';
  if (r.includes('israel') || r.includes('middle east')) return '🇮🇱';
  if (r.includes('india') || r.includes('south asia')) return '🇮🇳';
  if (r.includes('south korea') || r.includes('korea')) return '🇰🇷';
  if (r.includes('japan')) return '🇯🇵';
  return '🌍';
}

function getMomentum(signalCount: number): { label: string; symbol: string; color: string } {
  if (signalCount >= 8) return { label: 'ACCELERATING', symbol: '↑', color: '#27d17f' };
  if (signalCount >= 4) return { label: 'EMERGING', symbol: '◉', color: '#0EA5E9' };
  return { label: 'SLOWING', symbol: '↓', color: '#f59e0b' };
}

// ── Simple SVG Bar Chart ───────────────────────────────────────────────────────

function PulseChart({ signals }: { signals: Signal[] }) {
  const days = 14;
  const now = Date.now();
  const buckets = Array.from({ length: days }, (_, i) => {
    const dayStart = now - (days - 1 - i) * 86400000;
    const dayEnd = dayStart + 86400000;
    return signals.filter(s => {
      const t = new Date(s.discovered_at).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
  });

  const maxVal = Math.max(...buckets, 1);
  const W = 360;
  const H = 60;
  const barW = Math.floor(W / days) - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }}>
      {buckets.map((count, i) => {
        const barH = Math.max(2, Math.round((count / maxVal) * (H - 8)));
        const x = i * (barW + 2);
        const y = H - barH;
        const isRecent = i >= days - 3;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx={2}
            fill={isRecent ? '#0EA5E9' : '#0EA5E933'}
          />
        );
      })}
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SectorPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const meta = SECTOR_META[slug];

  const [signals, setSignals] = useState<Signal[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const label = meta?.label ?? slug;

        const [sigRes, vendRes, confRes, discRes] = await Promise.allSettled([
          fetch(`/api/intel/feed?industry=${encodeURIComponent(slug)}&page_size=10`),
          fetch(`/api/vendors?sector=${encodeURIComponent(label)}&limit=6`),
          fetch(`/api/conferences`),
          fetch(`/api/discoveries?field=${encodeURIComponent(slug)}&limit=5`),
        ]);

        if (sigRes.status === 'fulfilled' && sigRes.value.ok) {
          const d = await sigRes.value.json();
          setSignals(d.signals ?? []);
        }
        if (vendRes.status === 'fulfilled' && vendRes.value.ok) {
          const d = await vendRes.value.json();
          setVendors(d.vendors ?? []);
        }
        if (confRes.status === 'fulfilled' && confRes.value.ok) {
          const d = await confRes.value.json();
          const allConfs: Conference[] = d.conferences ?? [];
          // Filter conferences that might relate to this sector
          const filtered = allConfs
            .filter(c => {
              const text = `${c.name} ${c.category ?? ''}`.toLowerCase();
              const keywords = meta?.subsectors?.map(s => s.toLowerCase()) ?? [slug];
              return keywords.some(k => text.includes(k.slice(0, 5))) || true; // always include some
            })
            .slice(0, 3);
          setConferences(filtered);
        }
        if (discRes.status === 'fulfilled' && discRes.value.ok) {
          const d = await discRes.value.json();
          setDiscoveries(d.discoveries ?? []);
        }
      } catch (err) {
        setError('Failed to load sector data');
        console.error('[sector page] error:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug, meta]);

  if (!meta) {
    return (
      <div className="min-h-screen bg-[#07090A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-[#D4D8DC] mb-2">Sector not found</h1>
          <p className="text-[#6b7280] mb-6">The sector &quot;{slug}&quot; doesn&apos;t exist.</p>
          <Link href="/sector" className="rounded-xl bg-[#0EA5E9] px-5 py-2.5 text-sm font-semibold text-white">
            View all sectors
          </Link>
        </div>
      </div>
    );
  }

  const momentum = getMomentum(signals.length);

  return (
    <div className="min-h-screen bg-[#07090A]">
      <div className="mx-auto max-w-[1120px] px-6 py-10 pb-24">

        {/* ── BREADCRUMB ─────────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-2 text-sm text-[#6b7280]">
          <Link href="/" className="hover:text-[#D4D8DC] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/sector" className="hover:text-[#D4D8DC] transition-colors">Sectors</Link>
          <span>/</span>
          <span className="text-[#D4D8DC]">{meta.label}</span>
        </div>

        {/* ── HERO ───────────────────────────────────────────────────────────── */}
        <section className="mb-10 border-b border-white/[0.06] pb-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-5xl">{meta.emoji}</span>
                <h1 className="text-4xl font-bold text-[#D4D8DC] md:text-5xl">{meta.label}</h1>
              </div>
              <p className="mt-2 max-w-2xl text-base leading-7 text-[#9ca3af]">{meta.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {/* Momentum badge */}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold"
                  style={{ color: momentum.color, borderColor: `${momentum.color}33`, background: `${momentum.color}14` }}
                >
                  {momentum.symbol} {momentum.label}
                </span>

                {/* Signal count */}
                {!loading && (
                  <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-sm text-[#9ca3af]">
                    {signals.length} signals this week
                  </span>
                )}
              </div>

              {/* Subsectors */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {meta.subsectors.map(sub => (
                  <span key={sub} className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-xs text-[#6b7280]">
                    {sub}
                  </span>
                ))}
              </div>
            </div>

            <Link
              href="/sector"
              className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 text-sm text-[#9ca3af] transition-colors hover:border-[#0EA5E9]/30 hover:text-[#D4D8DC] shrink-0"
            >
              ← All sectors
            </Link>
          </div>
        </section>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-sm text-red-400">{error}</div>
        ) : (
          <>
            {/* ── THE SITUATION ───────────────────────────────────────────────── */}
            <section className="mb-8">
              <h2 className="mb-4 text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">The Situation</h2>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <p className="text-[15px] leading-7 text-[#D4D8DC]">
                  {meta.label} is seeing sustained activity across{' '}
                  {signals.length > 0 ? `${signals.length} recent signals` : 'multiple dimensions'},{' '}
                  driven by both government procurement and private sector investment.
                  The sector continues to be shaped by advances in{' '}
                  {meta.subsectors.slice(0, 2).join(' and ')}.
                  Investment flows remain{' '}
                  {signals.filter(s => s.signal_type === 'funding_round').length > 2 ? 'strong' : 'active'},{' '}
                  with contract awards pointing toward near-term commercialization.
                  Early indicators suggest continued momentum through the next quarter.
                </p>

                {/* Why El Paso cares */}
                <div className="mt-5 rounded-xl border border-[#0EA5E9]/20 bg-[#0EA5E9]/5 p-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0EA5E9]">
                    Why El Paso Cares
                  </div>
                  <p className="text-sm leading-6 text-[#9ca3af]">{meta.ep_why}</p>
                </div>
              </div>
            </section>

            {/* ── PULSE CHART ─────────────────────────────────────────────────── */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Sector Pulse — Last 14 days</h2>
                <span className="text-xs text-[#4b5563]">signal count per day</span>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                {signals.length > 0 ? (
                  <PulseChart signals={signals} />
                ) : (
                  <div className="flex items-center justify-center h-16 text-sm text-[#4b5563]">
                    No recent signals tracked yet
                  </div>
                )}
              </div>
            </section>

            {/* ── TOP COMPANIES ───────────────────────────────────────────────── */}
            {vendors.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Top Companies in this Sector</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {vendors.slice(0, 6).map(vendor => {
                    const ikerScore = vendor.iker_score ? Math.round(vendor.iker_score) : null;
                    const scoreNum = ikerScore && ikerScore <= 1 ? Math.round(ikerScore * 100) : ikerScore;
                    return (
                      <div
                        key={vendor.id}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
                      >
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-lg font-bold text-[#0EA5E9]">
                            {vendor.company_name.slice(0, 1).toUpperCase()}
                          </div>
                          {scoreNum !== null && (
                            <span
                              className="rounded-lg px-2 py-0.5 text-xs font-mono font-bold"
                              style={{
                                background: `${scoreColor(scoreNum)}14`,
                                color: scoreColor(scoreNum),
                              }}
                            >
                              {scoreNum}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-[#D4D8DC]">{vendor.company_name}</div>
                        {vendor.description && (
                          <p className="mt-1 text-xs leading-5 text-[#6b7280] line-clamp-2">{vendor.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#4b5563]">
                          {vendor.hq_city && <span>{vendor.hq_city}</span>}
                          {vendor.hq_country && vendor.hq_city && <span>·</span>}
                          {vendor.hq_country && <span>{vendor.hq_country}</span>}
                        </div>
                        {vendor.company_url && (
                          <a
                            href={vendor.company_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex w-full items-center justify-center rounded-lg bg-[#0EA5E9] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          >
                            Visit →
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── LATEST INTELLIGENCE ─────────────────────────────────────────── */}
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Latest Intelligence</h2>
                <Link
                  href={`/intel?industry=${slug}`}
                  className="text-xs text-[#0EA5E9] hover:underline"
                >
                  View all →
                </Link>
              </div>

              {signals.length === 0 ? (
                <div className="flex items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-12 text-sm text-[#4b5563]">
                  No signals yet for this sector
                </div>
              ) : (
                <div className="space-y-3">
                  {signals.slice(0, 10).map(signal => {
                    const accent = signalTypeColor(signal.signal_type);
                    const score = displayScore(signal.importance_score);
                    const flag = regionFlag(signal.region);
                    return (
                      <a
                        key={signal.id}
                        href={signal.url ?? '#'}
                        target={signal.url ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
                        style={{ borderLeftWidth: 3, borderLeftColor: accent }}
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border text-center"
                          style={{ color: scoreColor(score), background: `${scoreColor(score)}14`, borderColor: `${scoreColor(score)}24` }}
                        >
                          <span className="text-sm font-bold font-mono leading-none">{score}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            {signal.signal_type && (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `${accent}16`, color: accent }}>
                                {signal.signal_type.replace(/_/g, ' ')}
                              </span>
                            )}
                            <span className="text-sm">{flag}</span>
                            <span className="ml-auto text-[11px] font-mono text-[#4b5563]">{relTime(signal.discovered_at)}</span>
                          </div>
                          <div className="text-sm font-medium leading-snug text-[#D4D8DC]">{signal.title}</div>
                          {signal.company && (
                            <span className="mt-1 text-[11px] text-[#0EA5E9]">{signal.company}</span>
                          )}
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── UPCOMING CONFERENCES ────────────────────────────────────────── */}
            {conferences.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Upcoming Conferences</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {conferences.slice(0, 3).map(conf => (
                    <div key={conf.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]">
                      <div className="mb-1 text-sm font-semibold text-[#D4D8DC] line-clamp-2">{conf.name}</div>
                      <div className="mb-3 text-xs text-[#6b7280]">
                        {[conf.city, conf.country].filter(Boolean).join(', ')}
                        {conf.start_date && (
                          <span className="ml-2 text-[#4b5563]">
                            {new Date(conf.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {conf.website && (
                        <a
                          href={conf.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center rounded-lg bg-[#0EA5E9] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          Register →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── RECENT DISCOVERIES ──────────────────────────────────────────── */}
            {discoveries.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Recent Discoveries</h2>
                <div className="space-y-3">
                  {discoveries.slice(0, 5).map(disc => {
                    const impact = disc.iker_impact_score
                      ? Math.round(disc.iker_impact_score <= 1 ? disc.iker_impact_score * 100 : disc.iker_impact_score)
                      : null;
                    return (
                      <div key={disc.id} className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]">
                        {impact !== null && (
                          <div
                            className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border text-center"
                            style={{ color: scoreColor(impact), background: `${scoreColor(impact)}14`, borderColor: `${scoreColor(impact)}24` }}
                          >
                            <span className="text-sm font-bold font-mono leading-none">{impact}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium leading-snug text-[#D4D8DC]">{disc.title}</div>
                          {disc.research_institution && (
                            <div className="mt-1 text-[11px] text-[#0EA5E9]">{disc.research_institution}</div>
                          )}
                          {disc.summary && (
                            <p className="mt-1 text-xs leading-5 text-[#6b7280] line-clamp-2">{disc.summary}</p>
                          )}
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-[11px] text-[#4b5563]">{relTime(disc.published_at)}</span>
                            {disc.source_url && (
                              <a
                                href={disc.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-[#0EA5E9] hover:underline"
                              >
                                Read source →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
