'use client';
// @ts-nocheck

import Link from 'next/link';
import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, type Variants, useInView } from 'framer-motion';
import { COLORS } from '@/lib/tokens';

// ── Types ────────────────────────────────────────────────────────────────────

type Vendor = {
  name: string;
  category: string | null;
  iker_score: number | null;
  website: string | null;
};

type Decision = {
  rank: number;
  signal_id: string;
  title: string;
  industry: string;
  signal_type: string;
  company: string | null;
  amount_usd: number | null;
  source: string | null;
  discovered_at: string;
  score: {
    final: number;
    cluster_volume: number;
    cluster_velocity: number;
    ep_relevance: number;
    source_quality: number;
  };
  cause: string;
  effect: string;
  consequence: string;
  what_to_do: string[];
  who_can_help: Vendor[];
  urgency: 'act_now' | 'watch' | 'opportunity';
  why_el_paso: string;
  related_count: number;
};

type Top3Response = {
  ok: boolean;
  mode: 'top3';
  generated_at: string;
  decisions: Decision[];
  total_signals_analyzed: number;
};

type SearchResponse = {
  ok: boolean;
  mode: 'search';
  query: string;
  cause: string;
  effect: string;
  consequence: string;
  what_to_do: string[];
  urgency: string;
  why_el_paso: string;
  signals: { id: string; title: string; industry: string; company: string | null; source: string | null; discovered_at: string; score: number }[];
  who_can_help: Vendor[];
  total_signals_searched: number;
};

type TickerSignal = {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  discovered_at: string;
};

type BriefingResponse = {
  briefing?: {
    total_signals?: number;
    recent_signals?: TickerSignal[];
  };
};

type BrainResponse = {
  scannedSignals?: number;
  notesScanned?: number;
  entities?: Array<{ id: string; type: string; name: string }>;
};

type ConvergenceEvent = {
  id: string;
  industry: string;
  signals: string[];
  confidence: number;
  summary: string;
  signalCount: number;
  region: string;
  detectedAt: string;
};

type ConvergenceResponse = {
  ok: boolean;
  convergenceCount: number;
  data: ConvergenceEvent[];
};

// ── Static Data ──────────────────────────────────────────────────────────────

const SECTOR_BARS = [
  { name: 'AI / ML', pct: 94, trend: 'up', color: 'teal' },
  { name: 'Defense', pct: 81, trend: 'up', color: 'teal' },
  { name: 'Cybersecurity', pct: 76, trend: 'up', color: 'teal' },
  { name: 'Logistics', pct: 62, trend: 'neutral', color: 'dim' },
  { name: 'Manufacturing', pct: 54, trend: 'down', color: 'muted' },
  { name: 'Border Tech', pct: 68, trend: 'up', color: 'teal' },
  { name: 'Energy', pct: 47, trend: 'neutral', color: 'dim' },
  { name: 'Space', pct: 38, trend: 'up', color: 'teal' },
  { name: 'Industrial Tech', pct: 55, trend: 'up', color: 'teal' },
  { name: 'Renewable Energy', pct: 61, trend: 'up', color: 'teal' },
  { name: 'Semiconductors', pct: 72, trend: 'up', color: 'teal' },
  { name: 'Agriculture', pct: 33, trend: 'neutral', color: 'dim' },
  { name: 'Life Sciences', pct: 58, trend: 'up', color: 'teal' },
  { name: 'Climate Tech', pct: 44, trend: 'up', color: 'teal' },
] as const;

const FORWARD_CARDS = [
  {
    headline: 'AI + Defense convergence is accelerating',
    body: 'Fort Bliss is transitioning from a traditional Army installation to one of the most active AI testing grounds in the DoD, hosting autonomous systems pilots and AI-driven logistics.',
    sector: 'Defense / AI',
    color: 'from-nxt-accent/10 to-purple-500/5',
  },
  {
    headline: 'The US-Mexico border is becoming a technology corridor',
    body: '$126B in annual trade between El Paso and Ciudad Juárez demands smarter infrastructure — from autonomous inspection systems to predictive customs analytics.',
    sector: 'Border Tech / Trade',
    color: 'from-emerald-500/10 to-cyan-500/5',
  },
  {
    headline: 'Quantum computing moves from lab to deployment',
    body: 'Encryption vulnerabilities and logistics optimization are first targets. Regional logistics hubs like El Paso will see early commercial deployments within 24 months.',
    sector: 'Quantum / Logistics',
    color: 'from-amber-500/10 to-orange-500/5',
  },
];

const STATIC_VENDORS = [
  {
    id: 'jacobs',
    name: 'Jacobs Solutions',
    sector: 'Defense / Engineering',
    iker: 94,
    desc: 'Global engineering firm delivering critical infrastructure, advanced manufacturing, and defense technology solutions.',
    company_url: 'https://www.jacobs.com',
    domain: 'jacobs.com',
  },
  {
    id: 'booz-allen',
    name: 'Booz Allen Hamilton',
    sector: 'Defense / AI',
    iker: 91,
    desc: 'Leading defense and intelligence consultancy specializing in AI, cyber, and data analytics for government clients.',
    company_url: 'https://www.boozallen.com',
    domain: 'boozallen.com',
  },
  {
    id: 'palantir',
    name: 'Palantir',
    sector: 'AI / Intelligence',
    iker: 89,
    desc: 'Data integration and AI-powered decision intelligence platform used by defense, intelligence, and commercial clients.',
    company_url: 'https://www.palantir.com',
    domain: 'palantir.com',
  },
  {
    id: 'crowdstrike',
    name: 'CrowdStrike',
    sector: 'Cybersecurity',
    iker: 88,
    desc: 'Cloud-native endpoint protection platform with AI-driven threat intelligence and real-time attack prevention.',
    company_url: 'https://www.crowdstrike.com',
    domain: 'crowdstrike.com',
  },
  {
    id: 'shield-ai',
    name: 'Shield AI',
    sector: 'Defense / Autonomous',
    iker: 85,
    desc: 'Building AI pilot technology for defense, enabling autonomous and AI-powered aircraft to operate in contested environments.',
    company_url: 'https://shield.ai',
    domain: 'shield.ai',
  },
  {
    id: 'mesaai',
    name: 'MesaAI',
    sector: 'AI / Border Tech',
    iker: 82,
    desc: 'Regional AI solutions provider focused on border security, trade analytics, and infrastructure intelligence for the Southwest.',
    company_url: 'https://mesaai.com',
    domain: 'mesaai.com',
  },
];

const STATIC_PRODUCTS = [
  {
    id: 'samsara',
    name: 'Samsara Fleet Management',
    company: 'Samsara',
    desc: 'Complete fleet visibility with real-time GPS tracking, driver safety scoring, and predictive maintenance alerts for logistics operations.',
    category: 'Logistics',
    maturity: 'MATURE',
    pricing: 'Enterprise — from $27/vehicle/mo',
    cta_url: 'https://www.samsara.com',
    color: 'from-emerald-500/10 to-teal-500/5',
  },
  {
    id: 'falcon',
    name: 'CrowdStrike Falcon',
    company: 'CrowdStrike',
    desc: 'AI-native endpoint protection stopping breaches before they happen — detection, prevention, and response in a single lightweight agent.',
    category: 'Cybersecurity',
    maturity: 'MATURE',
    pricing: 'Enterprise — contact for pricing',
    cta_url: 'https://www.crowdstrike.com/products/endpoint-security/',
    color: 'from-red-500/10 to-orange-500/5',
  },
  {
    id: 'palantir-aip',
    name: 'Palantir AIP',
    company: 'Palantir',
    desc: 'AI-powered operational intelligence platform connecting LLMs to real enterprise data — enabling decision-grade AI for defense and commercial operations.',
    category: 'Defense / AI',
    maturity: 'EMERGING',
    pricing: 'Enterprise — contact Palantir',
    cta_url: 'https://www.palantir.com/platforms/aip/',
    color: 'from-nxt-accent/10 to-purple-500/5',
  },
  {
    id: 'dat-load',
    name: 'DAT Load Board',
    company: 'DAT Freight & Analytics',
    desc: 'The largest freight marketplace in North America — real-time load matching, lane rate intelligence, and carrier network access for shippers and brokers.',
    category: 'Logistics',
    maturity: 'MATURE',
    pricing: 'Subscription — from $45/mo',
    cta_url: 'https://www.dat.com',
    color: 'from-amber-500/10 to-yellow-500/5',
  },
];

const STATIC_CONFERENCES = [
  {
    id: 'hannover-2026',
    name: 'Hannover Messe 2026',
    location: 'Hannover, Germany',
    dates: 'Apr 20–24, 2026',
    category: 'Smart Manufacturing',
    score: 96,
    website: 'https://www.hannovermesse.de/en/',
    daysUntil: 13,
  },
  {
    id: 'ausa-2026',
    name: 'AUSA Annual Meeting 2026',
    location: 'Washington, D.C.',
    dates: 'Oct 12–14, 2026',
    category: 'Defense / Army',
    score: 93,
    website: 'https://www.ausa.org/annual',
    daysUntil: 188,
  },
  {
    id: 'border-expo-2026',
    name: 'Border Security Expo 2026',
    location: 'San Antonio, TX',
    dates: 'May 13–14, 2026',
    category: 'Border Tech / CBP',
    score: 91,
    website: 'https://www.bordersecurityexpo.com',
    daysUntil: 36,
  },
];

// ── Urgency config ───────────────────────────────────────────────────────────

const URGENCY_STYLES = {
  act_now: {
    label: 'ACT NOW',
    classes: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  watch: {
    label: 'WATCH',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  opportunity: {
    label: 'OPPORTUNITY',
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
} as const;

// ── Signal type labels ───────────────────────────────────────────────────────

const SIGNAL_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  contract_award:   { label: 'Contract', color: '#22c55e' },
  funding_round:    { label: 'Funding',  color: '#a855f7' },
  patent_filing:    { label: 'Patent',   color: '#06b6d4' },
  partnership:      { label: 'Partner',  color: '#f59e0b' },
  product_launch:   { label: 'Launch',   color: '#f97316' },
  regulation:       { label: 'Rule',     color: '#ef4444' },
  market_expansion: { label: 'Expand',   color: '#10b981' },
};

// ── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <span className="text-[8px] tracking-[0.18em] font-bold text-nxt-dim">
      {text}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: 'act_now' | 'watch' | 'opportunity' }) {
  const config = URGENCY_STYLES[urgency] ?? URGENCY_STYLES.watch;
  return (
    <span className={`inline-flex items-center text-[8px] tracking-[0.12em] font-bold px-2.5 py-0.5 rounded-full border ${config.classes}`}>
      {config.label}
    </span>
  );
}

function SectorBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center text-[8px] tracking-[0.12em] uppercase font-bold px-2.5 py-0.5 rounded-full border bg-white/[0.04] border-white/[0.1] text-nxt-muted">
      {label}
    </span>
  );
}

function MaturityBadge({ label }: { label: string }) {
  const isEmerging = label === 'EMERGING';
  return (
    <span className={`inline-flex items-center text-[8px] tracking-[0.12em] font-bold px-2.5 py-0.5 rounded-full border ${
      isEmerging
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }`}>
      {label}
    </span>
  );
}

// ── Animated bar (scroll-triggered) ─────────────────────────────────────────

function SectorBar({ name, pct, trend, color, delay }: {
  name: string; pct: number; trend: string; color: string; delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  const barColor =
    color === 'teal' ? 'bg-nxt-accent' :
    color === 'dim'  ? 'bg-nxt-dim/60' :
    'bg-nxt-muted/40';

  const arrowColor =
    trend === 'up'   ? 'text-nxt-accent' :
    trend === 'down' ? 'text-red-400' :
    'text-nxt-dim';

  const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <div ref={ref} className="flex items-center gap-3">
      <div className="w-24 shrink-0 text-[11px] text-nxt-text/70 font-medium text-right">{name}</div>
      <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: inView ? `${pct}%` : 0 }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className={`text-[13px] font-bold w-5 shrink-0 ${arrowColor}`}>{arrow}</span>
    </div>
  );
}

// ── Company Logo with initials fallback ──────────────────────────────────────

const INITIALS_COLORS = [
  'bg-nxt-accent/20 text-nxt-accent',
  'bg-emerald-500/20 text-emerald-400',
  'bg-amber-500/20 text-amber-400',
  'bg-purple-500/20 text-purple-400',
  'bg-red-500/20 text-red-400',
  'bg-cyan-500/20 text-cyan-400',
];

function CompanyLogo({ domain, name, index }: { domain: string; name: string; index: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colorClass = INITIALS_COLORS[index % INITIALS_COLORS.length];

  if (failed) {
    return (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold ${colorClass}`}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${name} logo`}
      width={40}
      height={40}
      className="w-10 h-10 rounded-xl object-contain bg-white/[0.08] p-1"
      onError={() => setFailed(true)}
    />
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 animate-pulse flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
        <div className="h-5 w-20 rounded-full bg-white/[0.04]" />
      </div>
      <div className="h-5 w-4/5 rounded bg-white/[0.06]" />
      <div className="h-3 w-full rounded bg-white/[0.04]" />
      <div className="h-3 w-3/4 rounded bg-white/[0.04]" />
      <div className="mt-2 h-px bg-white/[0.06]" />
      <div className="h-3 w-full rounded bg-white/[0.04]" />
      <div className="h-3 w-5/6 rounded bg-white/[0.04]" />
      <div className="mt-auto h-8 w-full rounded-xl bg-white/[0.04]" />
    </div>
  );
}

// ── Story Decision Card (Section 3) ─────────────────────────────────────────

const STORY_CARD_COLORS = [
  'from-nxt-accent/10 to-purple-500/5',
  'from-emerald-500/10 to-cyan-500/5',
  'from-amber-500/10 to-orange-500/5',
];

function StoryDecisionCard({ decision: d, index }: { decision: Decision; index: number }) {
  const topVendor = d.who_can_help?.[0];
  const vendorUrl = topVendor?.website ?? '#';

  return (
    <motion.div
      variants={fadeUp as any}
      className="relative group rounded-2xl border border-white/[0.06] bg-nxt-surface/80 backdrop-blur-xl p-5 flex flex-col gap-3 transition-all duration-300 hover:border-white/[0.14] hover:shadow-2xl hover:shadow-nxt-accent/5"
    >
      {/* Gradient glow on hover */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${STORY_CARD_COLORS[index % 3]} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

      <div className="relative flex flex-col gap-3 h-full">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <UrgencyBadge urgency={d.urgency} />
          <SectorBadge label={d.industry} />
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold leading-snug text-white group-hover:text-nxt-accent-light transition-colors">
          {d.title}
        </h3>

        {/* Cause + Effect */}
        <p className="text-[12px] leading-relaxed text-nxt-text/60">{d.cause}</p>
        <p className="text-[12px] leading-relaxed text-nxt-text/80">{d.effect}</p>

        <div className="border-t border-white/[0.06]" />

        {/* Why El Paso */}
        <div>
          <SectionLabel text="WHY EL PASO CARES" />
          <p className="text-[12px] leading-relaxed mt-1 text-nxt-accent/80 italic">{d.why_el_paso}</p>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* What to do */}
        {d.what_to_do.length > 0 && (
          <div>
            <SectionLabel text="WHAT TO DO" />
            <p className="text-[12px] leading-relaxed mt-1 text-nxt-text/70">{d.what_to_do[0]}</p>
          </div>
        )}

        {/* Vendor pills */}
        {d.who_can_help.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {d.who_can_help.slice(0, 3).map((v, i) => (
              <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/15 text-cyan-400">
                {v.name}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto">
          <a
            href={vendorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2 rounded-xl bg-nxt-accent text-white text-[12px] font-semibold tracking-wide transition-all duration-200 hover:bg-nxt-accent-light no-underline"
          >
            Contact Vendors →
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [top3, setTop3] = useState<Decision[] | null>(null);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [error, setError] = useState('');

  const [input, setInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const [tickerSignals, setTickerSignals] = useState<TickerSignal[]>([]);
  const [convergenceAlerts, setConvergenceAlerts] = useState<ConvergenceEvent[]>([]);

  const storyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    loadTop3();
    loadTicker();
    loadConvergence();
  }, []);

  async function loadTop3() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/decide');
      const data: Top3Response = await res.json();
      if (data.ok) {
        setTop3(data.decisions);
        setTotalAnalyzed(data.total_signals_analyzed);
      }
    } catch {
      // silently degrade — we show skeleton
    } finally {
      setLoading(false);
    }
  }

  async function loadTicker() {
    try {
      const res = await fetch('/api/briefing');
      const data: BriefingResponse = await res.json();
      if (data?.briefing?.recent_signals) {
        setTickerSignals(data.briefing.recent_signals.slice(0, 12));
      }
    } catch {
      // non-critical
    }
  }

  async function loadConvergence() {
    try {
      const res = await fetch('/api/intelligence/convergence?window=24h&min_confidence=0.7');
      const data: ConvergenceResponse = await res.json();
      if (data?.ok && data.data?.length > 0) {
        // Show only high-confidence alerts (top 3)
        setConvergenceAlerts(data.data.slice(0, 3));
      }
    } catch {
      // non-critical — convergence is bonus intel
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (q.length < 3) return;

    setSearching(true);
    setSearchResult(null);
    setError('');

    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: q }),
      });
      const data: SearchResponse = await res.json();
      if (data.ok) {
        setSearchResult(data);
      } else {
        setError('No results found');
      }
    } catch {
      setError('Network error');
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchResult(null);
    setInput('');
    setError('');
  }

  const signalTape = useMemo(() => (tickerSignals.length ? [...tickerSignals, ...tickerSignals] : []), [tickerSignals]);

  const headlineDecision = top3?.[0];

  return (
    <div className="min-h-screen bg-nxt-bg relative overflow-hidden">

      {/* ═══ Animated Ambient Background ══════════════════════════════════════ */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-nxt-bg via-nxt-surface to-nxt-bg" />
        <div className="absolute top-[15%] left-[20%] w-[500px] h-[500px] bg-nxt-accent/[0.04] rounded-full blur-[120px] animate-pulse-soft" />
        <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '1.3s' }} />
        <div className="absolute top-[60%] left-[50%] w-[300px] h-[300px] bg-amber-500/[0.02] rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: '2.5s' }} />
      </div>

      <div className="relative z-10">

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 1 — THE HEADLINE STORY
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-10 lg:gap-16">

              {/* Left: Headline */}
              <motion.div
                className="flex-1"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-1.5 w-1.5 rounded-full bg-nxt-accent animate-pulse shadow-sm shadow-nxt-accent/60" />
                  <span className="text-[10px] tracking-[0.18em] uppercase font-bold text-nxt-accent/70">
                    Top Signal Right Now
                  </span>
                </div>

                {loading ? (
                  <div className="flex flex-col gap-4">
                    <div className="h-10 w-5/6 rounded-lg bg-white/[0.06] animate-pulse" />
                    <div className="h-10 w-3/5 rounded-lg bg-white/[0.05] animate-pulse" />
                    <div className="h-4 w-full rounded bg-white/[0.04] animate-pulse mt-2" />
                    <div className="h-4 w-4/5 rounded bg-white/[0.04] animate-pulse" />
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-white font-grotesk mb-5">
                      {headlineDecision?.title ?? 'Intelligence is moving fast in your region'}
                    </h1>
                    <p className="text-[14px] sm:text-[15px] leading-relaxed text-nxt-text/70 max-w-xl">
                      {headlineDecision?.cause ?? 'Technology signals across defense, logistics, and border infrastructure are converging.'}{' '}
                      {headlineDecision?.why_el_paso && (
                        <span className="text-nxt-accent/80">{headlineDecision.why_el_paso}</span>
                      )}
                    </p>
                  </>
                )}

                <motion.button
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  onClick={() => storyRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="mt-8 inline-flex items-center gap-2 bg-nxt-accent text-white px-6 py-3 rounded-xl font-semibold text-[13px] tracking-wide transition-all duration-200 hover:bg-nxt-accent-light hover:shadow-lg hover:shadow-nxt-accent/25 cursor-pointer border-none"
                >
                  Explore the full story →
                </motion.button>
              </motion.div>

              {/* Right: Live signal count badge */}
              <motion.div
                className="lg:w-60 shrink-0"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <div className="rounded-2xl border border-nxt-accent/20 bg-nxt-accent/[0.04] backdrop-blur-xl p-6 text-center">
                  <div className="text-[9px] tracking-[0.18em] uppercase font-bold text-nxt-accent/60 mb-2">Watching worldwide</div>
                  <div className="text-4xl font-bold font-mono text-white tabular-nums">
                    {totalAnalyzed > 0 ? totalAnalyzed.toLocaleString() : '—'}
                  </div>
                  <div className="text-[11px] text-nxt-muted mt-1">Watching 137 sources · 40+ countries · every sector that matters</div>
                  <div className="mt-4 flex items-center justify-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400/70">Live feed active</span>
                  </div>
                </div>

                {headlineDecision && (
                  <div className="mt-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="text-[9px] tracking-[0.14em] uppercase text-nxt-dim mb-2">Current urgency</div>
                    <UrgencyBadge urgency={headlineDecision.urgency} />
                    <div className="mt-2 text-[10px] text-nxt-muted leading-relaxed">{headlineDecision.effect}</div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 2 — SECTOR PULSE
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-20 border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
            >
              <motion.div variants={fadeUp as any} className="mb-8">
                <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-nxt-accent/60 mb-1">Sector Pulse</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-grotesk">
                  What's moving on Earth right now?
                </h2>
              </motion.div>

              <motion.div variants={fadeUp as any} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-4">
                {SECTOR_BARS.map((bar, i) => (
                  <SectorBar
                    key={bar.name}
                    name={bar.name}
                    pct={bar.pct}
                    trend={bar.trend}
                    color={bar.color}
                    delay={i * 0.07}
                  />
                ))}
              </motion.div>

              <motion.p variants={fadeUp as any} className="mt-6 text-[11px] text-nxt-dim">
                Signal activity relative to 90-day baseline · Rising = teal · Falling = dim
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            INTELLIGENCE NETWORK STAT BAR
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="py-8 border-b border-white/[0.06] bg-[rgba(7,9,10,0.8)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-nxt-accent/60 mb-5">Intelligence Network</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: '137', label: 'Sources Active' },
                { value: '40+', label: 'Countries' },
                { value: '6', label: 'Cron Jobs' },
                { value: 'Every 2h', label: 'Feed Updates' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-nxt-border bg-[rgba(9,14,26,0.7)] p-4 text-center"
                >
                  <div className="text-2xl font-mono font-bold text-white tabular-nums">{stat.value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-nxt-dim">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 3 — THE BIG STORY (3 narrative cards)
        ═══════════════════════════════════════════════════════════════════════ */}
        <section ref={storyRef} className="py-16 sm:py-20 border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">

            {/* ── CONVERGENCE DETECTED banner ──────────────────────────────── */}
            {convergenceAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-6 space-y-2"
              >
                {convergenceAlerts.map((alert) => {
                  const sectorLabels = alert.signals
                    .map(s => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
                    .join(' × ');
                  const pct = Math.round(alert.confidence * 100);
                  return (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 rounded-xl px-4 py-3 bg-amber-400/10 border border-amber-400/25"
                    >
                      <div className="mt-0.5 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                            CONVERGENCE DETECTED
                          </span>
                          <span className="text-[10px] text-amber-400/60 font-mono">{pct}% confidence</span>
                        </div>
                        <p className="text-[13px] font-semibold text-amber-100 mt-0.5 leading-snug">
                          {alert.industry} — {sectorLabels} — unusual co-movement detected
                        </p>
                        <p className="text-[11px] text-amber-400/70 mt-0.5">
                          {alert.signalCount} signals spiked · {alert.region} · {new Date(alert.detectedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              className="mb-8"
            >
              <motion.div variants={fadeUp as any}>
                <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-nxt-accent/60 mb-1">Intelligence</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-grotesk">What is happening</h2>
                <p className="text-[13px] text-nxt-muted mt-1">Top decisions from {totalAnalyzed > 0 ? `${totalAnalyzed.toLocaleString()} signals` : 'live signals'} — updated continuously</p>
              </motion.div>
            </motion.div>

            {loading && (
              <div className="grid gap-5 md:grid-cols-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}

            {!loading && top3 && (
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-40px' }}
                className="grid gap-5 md:grid-cols-3"
              >
                {top3.map((d, i) => (
                  <StoryDecisionCard key={d.signal_id} decision={d} index={i} />
                ))}
              </motion.div>
            )}

            {!loading && !top3 && (
              <p className="text-sm text-center py-8 text-nxt-muted">No decisions available right now.</p>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 4 — WHERE IT'S HEADING
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-20 border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
            >
              <motion.div variants={fadeUp as any} className="mb-8">
                <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-nxt-accent/60 mb-1">Forward-Looking</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-grotesk">What comes next</h2>
              </motion.div>

              <div className="grid gap-5 md:grid-cols-3">
                {FORWARD_CARDS.map((card, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp as any}
                    className={`relative rounded-2xl border border-white/[0.06] bg-nxt-surface/80 backdrop-blur-xl p-6 bg-gradient-to-br ${card.color}`}
                  >
                    <h3 className="text-[15px] font-bold leading-snug text-white mb-3">{card.headline}</h3>
                    <p className="text-[12px] leading-relaxed text-nxt-text/65">{card.body}</p>
                    <div className="mt-4">
                      <SectorBadge label={card.sector} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 5 — COMPANIES DOING IT
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-20 border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
            >
              <motion.div variants={fadeUp as any} className="mb-2">
                <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-nxt-accent/60 mb-1">Vendors</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-grotesk">The companies building this</h2>
              </motion.div>
              <motion.p variants={fadeUp as any} className="text-[13px] text-nxt-muted mb-8">
                Browse and contact the vendors shaping these sectors
              </motion.p>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {STATIC_VENDORS.map((v, i) => (
                  <motion.div
                    key={v.id}
                    variants={fadeUp as any}
                    className="group rounded-2xl border border-white/[0.06] bg-nxt-surface/80 backdrop-blur-xl p-5 flex flex-col gap-3 transition-all duration-300 hover:border-white/[0.14] hover:shadow-xl hover:shadow-nxt-accent/5"
                  >
                    {/* Logo + Name row */}
                    <div className="flex items-center gap-3">
                      <CompanyLogo domain={v.domain} name={v.name} index={i} />
                      <div>
                        <div className="text-[14px] font-bold text-white leading-tight">{v.name}</div>
                        <SectorBadge label={v.sector} />
                      </div>
                    </div>

                    {/* IKER Score */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] tracking-[0.14em] uppercase text-nxt-dim">IKER Score</span>
                      <span className="text-[12px] font-bold text-emerald-400 font-mono">{v.iker}</span>
                    </div>

                    {/* Description */}
                    <p className="text-[12px] leading-relaxed text-nxt-text/65 line-clamp-2">{v.desc}</p>

                    {/* Buttons */}
                    <div className="flex gap-2 mt-auto">
                      <a
                        href={v.company_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 rounded-xl bg-nxt-accent text-white text-[11px] font-semibold tracking-wide transition-all duration-200 hover:bg-nxt-accent-light no-underline"
                      >
                        Visit Website →
                      </a>
                      <Link
                        href={`/vendor/${v.id}`}
                        className="flex-1 text-center py-2 rounded-xl border border-white/[0.1] bg-white/[0.04] text-nxt-text text-[11px] font-semibold tracking-wide transition-all duration-200 hover:bg-white/[0.08] no-underline"
                      >
                        Learn More
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={fadeUp as any} className="mt-6 text-center">
                <Link
                  href="/vendors"
                  className="text-[13px] text-nxt-accent hover:text-nxt-accent-light transition-colors no-underline"
                >
                  See all 442 companies →
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 6 — PRODUCTS YOU CAN BUY
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-20 border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
            >
              <motion.div variants={fadeUp as any} className="mb-2">
                <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-nxt-accent/60 mb-1">Marketplace</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-grotesk">Products available today</h2>
              </motion.div>
              <motion.p variants={fadeUp as any} className="text-[13px] text-nxt-muted mb-8">
                Technology you can deploy — from free trials to enterprise
              </motion.p>

              <div className="grid gap-5 sm:grid-cols-2">
                {STATIC_PRODUCTS.map((p, i) => (
                  <motion.div
                    key={p.id}
                    variants={fadeUp as any}
                    className={`relative group rounded-2xl border border-white/[0.06] bg-nxt-surface/80 backdrop-blur-xl p-5 flex flex-col gap-3 bg-gradient-to-br ${p.color} transition-all duration-300 hover:border-white/[0.14]`}
                  >
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <SectorBadge label={p.category} />
                      <MaturityBadge label={p.maturity} />
                    </div>

                    {/* Name + Company */}
                    <div>
                      <h3 className="text-[16px] font-bold text-white leading-tight">{p.name}</h3>
                      <p className="text-[11px] text-nxt-muted mt-0.5">{p.company}</p>
                    </div>

                    {/* Description */}
                    <p className="text-[12px] leading-relaxed text-nxt-text/65 line-clamp-3">{p.desc}</p>

                    {/* Price */}
                    <p className="text-[11px] text-nxt-accent/70 font-mono">{p.pricing}</p>

                    {/* Buttons */}
                    <div className="flex gap-2 mt-auto">
                      <a
                        href={p.cta_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 rounded-xl bg-nxt-accent text-white text-[11px] font-semibold tracking-wide transition-all duration-200 hover:bg-nxt-accent-light no-underline"
                      >
                        Get Demo →
                      </a>
                      <Link
                        href="/products/compare"
                        className="flex-1 text-center py-2 rounded-xl border border-white/[0.1] bg-white/[0.04] text-nxt-text text-[11px] font-semibold tracking-wide transition-all duration-200 hover:bg-white/[0.08] no-underline"
                      >
                        Compare
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={fadeUp as any} className="mt-6 text-center">
                <Link
                  href="/products"
                  className="text-[13px] text-nxt-accent hover:text-nxt-accent-light transition-colors no-underline"
                >
                  Browse all 1,041 products →
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 7 — WHAT TO WATCH (Conferences)
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-20 border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
            >
              <motion.div variants={fadeUp as any} className="mb-2">
                <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-nxt-accent/60 mb-1">Events</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-grotesk">What is coming up</h2>
              </motion.div>
              <motion.p variants={fadeUp as any} className="text-[13px] text-nxt-muted mb-8">
                Conferences where these technologies will be shown
              </motion.p>

              <div className="grid gap-5 md:grid-cols-3">
                {STATIC_CONFERENCES.map((conf, i) => (
                  <motion.div
                    key={conf.id}
                    variants={fadeUp as any}
                    className="group rounded-2xl border border-white/[0.06] bg-nxt-surface/80 backdrop-blur-xl p-5 flex flex-col gap-3 transition-all duration-300 hover:border-white/[0.14]"
                  >
                    {/* Countdown badge */}
                    <div>
                      {conf.daysUntil === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-[9px] tracking-widest font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE NOW
                        </span>
                      ) : (
                        <span className="text-[9px] tracking-[0.12em] font-bold px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-nxt-muted">
                          In {conf.daysUntil} days
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="text-[14px] font-bold text-white leading-snug">{conf.name}</h3>

                    {/* Location + dates */}
                    <div className="text-[11px] text-nxt-muted">
                      <div>{conf.location}</div>
                      <div>{conf.dates}</div>
                    </div>

                    {/* Category */}
                    <SectorBadge label={conf.category} />

                    {/* Buttons */}
                    <div className="flex gap-2 mt-auto">
                      <a
                        href={conf.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 rounded-xl bg-nxt-accent text-white text-[11px] font-semibold tracking-wide transition-all duration-200 hover:bg-nxt-accent-light no-underline"
                      >
                        Register →
                      </a>
                      <Link
                        href={`/conference/${conf.id}`}
                        className="flex-1 text-center py-2 rounded-xl border border-white/[0.1] bg-white/[0.04] text-nxt-text text-[11px] font-semibold tracking-wide transition-all duration-200 hover:bg-white/[0.08] no-underline"
                      >
                        See Exhibitors
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 8 — ASK ANYTHING
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-20 border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
            >
              <motion.div variants={fadeUp as any} className="text-center mb-8">
                <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-nxt-accent/60 mb-1">Intelligence Search</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-grotesk">Ask anything</h2>
                <p className="text-[13px] text-nxt-muted mt-2">
                  Search across all companies, products, conferences, and discoveries
                </p>
              </motion.div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl text-[12px] bg-red-500/[0.06] border border-red-500/20 text-red-400 mb-4"
                >
                  {error}
                </motion.div>
              )}

              {/* Search bar */}
              <motion.div variants={fadeUp as any}>
                <form onSubmit={handleSearch}>
                  <div className={`relative group transition-all duration-500 ${inputFocused ? 'scale-[1.01]' : ''}`}>
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-nxt-accent/30 via-emerald-500/20 to-nxt-accent/30 rounded-2xl blur-lg transition-opacity duration-500 ${inputFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                    <div className="relative flex items-center gap-3 bg-nxt-surface/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-5 py-1 transition-all duration-300 group-hover:border-white/[0.12]">
                      <svg className="w-5 h-5 text-nxt-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                      <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        placeholder="Describe a problem or ask anything..."
                        className="flex-1 bg-transparent text-nxt-text placeholder:text-nxt-dim outline-none text-[14px] font-grotesk min-h-[52px]"
                      />
                      <button
                        type="submit"
                        disabled={input.trim().length < 3 || searching}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-nxt-accent text-white font-bold text-[15px] transition-all duration-200 hover:bg-nxt-accent-light disabled:opacity-20 disabled:cursor-default cursor-pointer"
                      >
                        {searching ? '...' : '→'}
                      </button>
                    </div>
                  </div>
                </form>

                {searchResult && (
                  <button
                    onClick={clearSearch}
                    className="text-[11px] tracking-wide mt-3 text-nxt-muted hover:text-nxt-secondary transition-colors bg-transparent border-none cursor-pointer"
                  >
                    ← Clear search
                  </button>
                )}
              </motion.div>

              {/* Searching spinner */}
              {searching && (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <div className="w-8 h-8 border-2 border-nxt-accent/20 border-t-nxt-accent rounded-full animate-spin" />
                  <span className="text-[10px] tracking-[0.12em] uppercase text-nxt-dim">Searching live signals...</span>
                </div>
              )}

              {/* Search result */}
              {!searching && searchResult && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <UrgencyBadge urgency={searchResult.urgency as 'act_now' | 'watch' | 'opportunity'} />
                    <span className="text-[10px] text-nxt-dim">{searchResult.total_signals_searched} signals searched</span>
                  </div>

                  <div className="mb-3">
                    <SectionLabel text="CAUSE" />
                    <p className="text-[13px] leading-relaxed mt-1 text-nxt-text/80">{searchResult.cause}</p>
                  </div>

                  <div className="mb-3">
                    <SectionLabel text="EFFECT" />
                    <p className="text-[12px] leading-relaxed mt-1 text-nxt-text/60">{searchResult.effect}</p>
                  </div>

                  <div className="mb-4">
                    <SectionLabel text="IF YOU DON&apos;T ACT" />
                    <p className="text-[12px] leading-relaxed mt-1 text-amber-400">{searchResult.consequence}</p>
                  </div>

                  <div className="mb-4">
                    <SectionLabel text="ACTION" />
                    <div className="flex flex-col gap-2 mt-2">
                      {searchResult.what_to_do.map((action, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[10px] font-bold shrink-0 w-5 h-5 flex items-center justify-center mt-0.5 bg-nxt-accent/10 rounded-md text-nxt-accent">{i + 1}</span>
                          <span className="text-[12px] leading-relaxed text-nxt-text/70">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {searchResult.who_can_help.length > 0 && (
                    <div className="mb-3">
                      <SectionLabel text="WHO CAN HELP" />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {searchResult.who_can_help.map((v, i) => (
                          <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">{v.name}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResult.signals.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.06]">
                      <SectionLabel text="SUPPORTING SIGNALS" />
                      <div className="flex flex-col gap-2 mt-2">
                        {searchResult.signals.map(s => (
                          <div key={s.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                            <div className="text-[11px] font-medium text-nxt-text">{s.title}</div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] text-nxt-dim">{s.industry}</span>
                              {s.company && <span className="text-[9px] text-nxt-muted">{s.company}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            SIGNAL TICKER (bottom strip)
        ═══════════════════════════════════════════════════════════════════════ */}
        {signalTape.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="border-t border-white/[0.06] bg-nxt-bg/80 backdrop-blur-sm py-3"
          >
            <div className="overflow-hidden">
              <div className="flex gap-5 animate-marquee">
                {signalTape.map((signal, index) => {
                  const typeInfo = SIGNAL_TYPE_LABELS[signal.signal_type] || { label: signal.signal_type, color: '#6b6b76' };
                  return (
                    <div key={`${signal.id}-${index}`} className="flex items-center gap-2 shrink-0 px-2">
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[10px]"
                        style={{ background: `${typeInfo.color}15`, color: typeInfo.color, border: `1px solid ${typeInfo.color}25` }}
                      >
                        {typeInfo.label}
                      </span>
                      <span className="max-w-[340px] truncate whitespace-nowrap text-xs text-nxt-secondary">
                        {signal.title}
                      </span>
                      <span className="text-[10px] font-mono text-nxt-dim">
                        {timeAgo(signal.discovered_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
