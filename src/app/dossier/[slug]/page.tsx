'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BottomNav } from '@/components/ui';
import { COLORS } from '@/lib/tokens';

// ─── Design tokens ────────────────────────────────────────────────────────────
const CYAN   = COLORS.cyan;
const GREEN  = COLORS.green;
const GOLD   = COLORS.gold;
const RED    = COLORS.red;
const PURPLE = '#aa66ff';

// ─── Static fallback descriptions ────────────────────────────────────────────
const FALLBACKS: Record<string, string> = {
  defense: 'The defense technology sector covers autonomous systems, command and control, cybersecurity, counter-UAS, and AI-powered battlefield intelligence. Fort Bliss makes El Paso a key node in this network.',
  'defense-ai': 'Defense AI applies machine learning to battlefield intelligence, logistics, autonomous systems, and threat detection. It is the fastest-growing procurement category at the Pentagon.',
  'ai-ml': 'Artificial intelligence and machine learning is the fastest growing category across all industries. From language models to computer vision, AI is being embedded into every product and service.',
  cybersecurity: 'Cybersecurity protects organizations from digital attacks, data theft, and system compromise. CMMC compliance is driving a procurement surge across all defense contractors.',
  energy: 'The energy sector is transitioning from fossil fuels to renewables. Solar, storage, and smart grid technology are the fastest growing subsectors.',
  'energy-storage': 'Energy storage technology — batteries, flywheels, and pumped hydro — is the critical enabler of renewable grids. Lithium-ion costs have fallen 90% in a decade.',
  healthcare: 'Healthcare technology digitizes clinical workflows, improves diagnostics, and reduces administrative burden. AI diagnostics and robotic surgery are the leading growth areas.',
  logistics: 'Logistics technology tracks, routes, and automates the movement of goods. Warehouse robotics and route optimization are transforming the industry.',
  manufacturing: 'Manufacturing technology automates production, improves quality, and reduces waste. Robotics, computer vision, and predictive maintenance are leading investments.',
  'border-tech': 'Border technology enables secure, efficient movement of people and goods across international crossings. Computer vision and biometrics are replacing manual inspection.',
  fintech: 'Financial technology modernizes banking, payments, and investment management. AI-powered fraud detection and digital payments are the fastest growing areas.',
  'booz-allen-hamilton': 'Booz Allen Hamilton is a management and IT consulting firm serving federal clients across defense, intelligence, and civilian agencies. It is one of the largest contractors supporting DoD AI initiatives.',
};

// ─── Connected industry map ───────────────────────────────────────────────────
const CONNECTED: Record<string, string[]> = {
  defense:              ['Cybersecurity', 'Autonomous Systems', 'AI / ML'],
  'defense-ai':         ['Defense', 'Machine Learning', 'ISR Systems'],
  'ai-ml':              ['Cybersecurity', 'Healthcare', 'Defense AI'],
  cybersecurity:        ['Defense', 'Fintech', 'Cloud Infrastructure'],
  energy:               ['Manufacturing', 'Logistics', 'Smart Grid'],
  'energy-storage':     ['Renewables', 'Electric Vehicles', 'Grid Modernization'],
  healthcare:           ['AI / ML', 'Robotics', 'Medical Devices'],
  logistics:            ['Manufacturing', 'Supply Chain', 'Robotics'],
  manufacturing:        ['Logistics', 'Robotics', 'Energy'],
  'border-tech':        ['Surveillance', 'Biometrics', 'Defense'],
  fintech:              ['Cybersecurity', 'AI / ML', 'Regulatory Tech'],
  'booz-allen-hamilton':['Defense', 'Cybersecurity', 'Federal IT'],
};

// ─── Signal type icons ────────────────────────────────────────────────────────
const SIGNAL_ICONS: Record<string, string> = {
  funding_round:      '💰',
  contract_award:     '📋',
  product_launch:     '🚀',
  regulatory_action:  '📜',
  research_paper:     '🔬',
  patent_filing:      '📄',
  hiring_signal:      '👥',
  merger_acquisition: '🤝',
  news:               '📰',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Signal = {
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance: number;
  importance_score?: number;
  discovered_at: string;
  url?: string | null;
};

type IntelResponse = {
  ok: boolean;
  signals?: Signal[];
  findings?: Signal[];
};

type TrajectoryForecast = {
  industry: string;
  slug: string;
  current_score: number;
  predicted_score_30d: number;
  predicted_score_90d: number;
  direction: string;
  velocity: number;
  confidence: number;
  adoption_stage: string;
};

type PredictionsResponse = {
  ok: boolean;
  data?: {
    trajectories?: TrajectoryForecast[];
  };
};

type ProfileBlock = {
  type: string;
  title?: string;
  content?: string;
};

type ProfileResponse = {
  ok: boolean;
  profile?: {
    blocks?: ProfileBlock[];
    slug?: string;
  };
};

type Decision = 'YES' | 'WAIT' | 'KEEP_WATCHING';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 8) return `${wks}w ago`;
  const mths = Math.floor(days / 30);
  return `${mths}mo ago`;
}

function computeDecision(signals: Signal[]): Decision {
  if (signals.length === 0) return 'KEEP_WATCHING';
  const recent90 = signals.filter(s => {
    const ago = Date.now() - new Date(s.discovered_at).getTime();
    return ago <= 90 * 86_400_000;
  });
  if (recent90.length < 3) return 'KEEP_WATCHING';
  const avg = recent90.reduce((acc, s) => acc + (s.importance ?? s.importance_score ?? 0), 0) / recent90.length;
  if (avg > 0.7) return 'YES';
  return 'WAIT';
}

function ikerColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 60) return GOLD;
  return RED;
}

function ikerLabel(score: number): string {
  if (score >= 80) return 'TRUSTED';
  if (score >= 60) return 'RELIABLE';
  return 'CAUTION';
}

function directionSummary(forecast: TrajectoryForecast): string {
  const d = forecast.direction;
  const v = forecast.velocity.toFixed(1);
  const map: Record<string, string> = {
    accelerating: `Momentum is building fast — velocity +${v} pts/30d.`,
    growing:      `Steady upward trend — velocity +${v} pts/30d.`,
    plateauing:   'Activity is leveling off. Watch for a catalyst or pullback.',
    declining:    `Signals are cooling — velocity ${v} pts/30d.`,
    volatile:     'High activity but inconsistent. Expect swings.',
  };
  return map[d] ?? 'Trajectory data is insufficient to forecast with confidence.';
}

// ─── Decision badge ───────────────────────────────────────────────────────────
function DecisionBadge({ decision }: { decision: Decision }) {
  const config = {
    YES:          { color: GREEN,  text: 'YES', sub: 'Strong signal activity — worth engaging now.' },
    WAIT:         { color: GOLD,   text: 'WAIT', sub: 'Signals present but momentum not yet confirmed. Review in 90 days.' },
    KEEP_WATCHING:{ color: PURPLE, text: 'KEEP WATCHING', sub: 'Not enough signal data yet. Set a follow and check back.' },
  }[decision];

  return (
    <div
      className="rounded-[22px] mb-7"
      style={{
        background: COLORS.card,
        border: `1px solid ${config.color}33`,
        borderLeft: `4px solid ${config.color}`,
        padding: '22px 26px',
      }}
    >
      <div className="font-mono text-[9px] tracking-[0.25em] mb-3" style={{ color: COLORS.dim }}>
        SHOULD YOU ENGAGE WITH THIS?
      </div>
      <div className="flex items-center gap-4 mb-2">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{
            background: config.color,
            boxShadow: `0 0 12px ${config.color}`,
          }}
        />
        <span className="font-grotesk text-[22px] font-bold tracking-wide" style={{ color: config.color }}>
          {config.text}
        </span>
      </div>
      <p className="font-mono text-[11px] leading-relaxed m-0" style={{ color: COLORS.muted }}>
        {config.sub}
      </p>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="divider-glow mb-4" />
      <div className="font-mono text-[9px] tracking-[0.25em] mb-4" style={{ color: COLORS.dim }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DossierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug   = typeof params?.slug === 'string' ? params.slug : (params?.slug?.[0] ?? '');
  const label  = slugToLabel(slug);

  const [signals,    setSignals]    = useState<Signal[]>([]);
  const [forecast,   setForecast]   = useState<TrajectoryForecast | null>(null);
  const [profile,    setProfile]    = useState<ProfileBlock[] | null>(null);
  const [ikerScore,  setIkerScore]  = useState<number | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [followed,   setFollowed]   = useState(false);
  const [copied,     setCopied]     = useState(false);

  // ── Save to recent dossiers ───────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    try {
      const key  = 'nxt_recent_dossiers';
      const raw  = localStorage.getItem(key);
      const prev: Array<{ label: string; slug: string }> = raw ? JSON.parse(raw) : [];
      const next = [{ label, slug }, ...prev.filter(r => r.slug !== slug)].slice(0, 8);
      localStorage.setItem(key, JSON.stringify(next));
    } catch { /* ignore */ }
  }, [slug, label]);

  // ── Fetch all data in parallel ────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    const industry = slug.replace(/-/g, ' ');

    Promise.allSettled([
      // 1. Signals
      fetch(`/api/intel-signals?industry=${encodeURIComponent(industry)}&limit=20`)
        .then(r => r.json() as Promise<IntelResponse>)
        .then(data => {
          const list = data.signals ?? data.findings ?? [];
          const term = slug.toLowerCase();
          const filtered = list.filter(s =>
            s.industry?.toLowerCase().includes(term.split('-')[0]) ||
            s.industry?.toLowerCase().includes(industry.toLowerCase())
          );
          setSignals(filtered.length ? filtered : list.slice(0, 10));
        }),

      // 2. Predictions
      fetch('/api/predictions')
        .then(r => r.json() as Promise<PredictionsResponse>)
        .then(data => {
          const trajectories = data.data?.trajectories ?? [];
          const match = trajectories.find(t =>
            t.slug === slug || t.industry.toLowerCase().includes(slug.split('-')[0])
          );
          if (match) setForecast(match);
        }),

      // 3. Industry profile (may 404)
      fetch(`/api/industry/${encodeURIComponent(slug)}/profile`)
        .then(r => {
          if (!r.ok) return null;
          return r.json() as Promise<ProfileResponse>;
        })
        .then(data => {
          if (data?.ok && data.profile?.blocks) {
            setProfile(data.profile.blocks);
            const ikerBlock = data.profile.blocks.find(b => b.type === 'iker' || b.title?.toLowerCase().includes('iker'));
            if (ikerBlock?.content) {
              const m = ikerBlock.content.match(/(\d+)/);
              if (m) setIkerScore(parseInt(m[1], 10));
            }
          }
        }),
    ]).finally(() => {
      setLoading(false);
    });
  }, [slug]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const decision = computeDecision(signals);

  const getDescription = useCallback((): string => {
    if (profile) {
      const snap = profile.find(b => b.type === 'snapshot' || b.type === 'what_it_is');
      if (snap?.content) return snap.content;
      const first = profile.find(b => b.content && b.content.length > 40);
      if (first?.content) return first.content;
    }
    if (FALLBACKS[slug]) return FALLBACKS[slug];
    const part = slug.split('-')[0];
    const match = Object.entries(FALLBACKS).find(([k]) => k.startsWith(part));
    if (match) return match[1];
    return `Intelligence dossier for ${label}. Signal data is being collected. Check back as the platform ingests more sources.`;
  }, [profile, slug, label]);

  const connected = CONNECTED[slug] ?? CONNECTED[slug.split('-')[0]] ?? ['AI / ML', 'Cybersecurity', 'Defense'];

  const handleShare = useCallback(() => {
    const url = `https://www.nxtlinktech.com/dossier/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  }, [slug]);

  const handleFollow = useCallback(() => {
    setFollowed(prev => !prev);
    try {
      const key  = 'nxt_followed_dossiers';
      const raw  = localStorage.getItem(key);
      const prev: string[] = raw ? JSON.parse(raw) : [];
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug];
      localStorage.setItem(key, JSON.stringify(next));
    } catch { /* ignore */ }
  }, [slug]);

  // ── Load followed state ───────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nxt_followed_dossiers');
      if (raw) {
        const list: string[] = JSON.parse(raw);
        setFollowed(list.includes(slug));
      }
    } catch { /* ignore */ }
  }, [slug]);

  // ── No slug guard ─────────────────────────────────────────────────────────
  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono" style={{ background: COLORS.bg, color: COLORS.muted }}>
        <div className="text-center">
          <div className="text-[11px] tracking-[0.2em] mb-4">NO DOSSIER FOUND</div>
          <button
            onClick={() => router.push('/dossier')}
            className="font-mono text-[11px] bg-transparent border-none cursor-pointer"
            style={{ color: CYAN }}
          >
            ← BACK TO SEARCH
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-mono text-white pb-20" style={{ background: COLORS.bg }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3"
        style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dossier')}
            className="font-mono text-[11px] bg-transparent border-none cursor-pointer p-0"
            style={{ color: COLORS.muted }}
          >
            ← DOSSIER
          </button>
          <span style={{ color: COLORS.dim }}>|</span>
          <span className="font-mono text-[10px] tracking-[0.15em]" style={{ color: COLORS.muted }}>
            {slug.toUpperCase()}
          </span>
        </div>
        <Link href="/" className="font-grotesk text-[12px] tracking-[0.15em] no-underline font-bold" style={{ color: COLORS.orange }}>
          NXT//LINK
        </Link>
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="max-w-[680px] mx-auto px-6 pt-8 space-y-4 animate-fade-in">
          <div className="h-3 w-28 rounded animate-pulse" style={{ background: COLORS.card }} />
          <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: COLORS.card }} />
          <div className="h-4 w-64 rounded animate-pulse" style={{ background: COLORS.card }} />
          <div className="h-24 rounded-[22px] animate-pulse mt-6" style={{ background: COLORS.card }} />
          <div className="h-24 rounded-[22px] animate-pulse" style={{ background: COLORS.card }} />
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-[20px] animate-pulse" style={{ background: COLORS.card }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && (
        <div className="max-w-[680px] mx-auto px-6 pt-8 pb-4">

          {/* Title */}
          <div className="mb-7">
            <div className="font-mono text-[9px] tracking-[0.25em] mb-2" style={{ color: COLORS.dim }}>
              INTELLIGENCE DOSSIER
            </div>
            <h1 className="font-grotesk text-[26px] font-bold tracking-tight mb-1" style={{ color: COLORS.text }}>
              {label}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[9px]" style={{ color: COLORS.dim }}>
                {signals.length} SIGNAL{signals.length !== 1 ? 'S' : ''} TRACKED
              </span>
              {forecast && (
                <>
                  <span style={{ color: COLORS.dim }}>·</span>
                  <span
                    className="font-mono text-[9px] tracking-[0.12em]"
                    style={{ color: forecast.direction === 'accelerating' || forecast.direction === 'growing' ? GREEN : COLORS.muted }}
                  >
                    {forecast.direction.toUpperCase()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── IKER score (vendor dossiers) ── */}
          {ikerScore !== null && (
            <div
              className="rounded-[22px] flex items-center gap-5 mb-6 px-6 py-4"
              style={{
                background: COLORS.card,
                border: `1px solid ${ikerColor(ikerScore)}33`,
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ border: `3px solid ${ikerColor(ikerScore)}` }}
              >
                <span className="font-grotesk text-[14px] font-bold" style={{ color: ikerColor(ikerScore) }}>{ikerScore}</span>
              </div>
              <div>
                <div className="font-mono text-[9px] tracking-[0.2em] mb-1" style={{ color: COLORS.dim }}>TRUST SCORE</div>
                <div className="font-grotesk text-[15px] font-bold tracking-wide" style={{ color: ikerColor(ikerScore) }}>
                  {ikerScore}/100 — {ikerLabel(ikerScore)}
                </div>
              </div>
            </div>
          )}

          {/* ── 1. DECISION BADGE ── */}
          <DecisionBadge decision={decision} />

          {/* ── 2. WHAT IS THIS ── */}
          <Section label="WHAT IS THIS">
            <p className="font-mono text-[12px] leading-[1.8] m-0" style={{ color: COLORS.muted }}>
              {getDescription()}
            </p>
          </Section>

          {/* ── 3. SIGNAL HISTORY ── */}
          <Section label={`SIGNAL HISTORY — LAST 90 DAYS (${signals.length})`}>
            {signals.length === 0 ? (
              <div className="font-mono text-[11px]" style={{ color: COLORS.dim }}>
                No signals found for this topic yet. The platform is still indexing this area.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {signals.slice(0, 15).map((s, i) => {
                  const icon = SIGNAL_ICONS[s.signal_type] ?? '📡';
                  const imp  = s.importance ?? s.importance_score ?? 0;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-[20px] px-4 py-3"
                      style={{
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <span className="text-[13px] shrink-0 mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[11px] leading-relaxed no-underline block"
                            style={{ color: COLORS.accent }}
                          >
                            {s.title}
                          </a>
                        ) : (
                          <span className="font-mono text-[11px] leading-relaxed block" style={{ color: COLORS.text }}>
                            {s.title}
                          </span>
                        )}
                        <div className="flex gap-2.5 mt-1.5 flex-wrap">
                          {s.company && (
                            <span className="font-mono text-[9px]" style={{ color: COLORS.muted }}>{s.company}</span>
                          )}
                          <span className="font-mono text-[9px]" style={{ color: COLORS.dim }}>{timeAgo(s.discovered_at)}</span>
                          <span className="font-mono text-[9px]" style={{ color: imp > 0.7 ? GREEN : imp > 0.4 ? GOLD : COLORS.muted }}>
                            IMP {Math.round(imp * 100)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── 4. WHERE IT IS HEADING ── */}
          <Section label="WHERE IT IS HEADING">
            {forecast ? (
              <div>
                <p className="font-mono text-[12px] leading-[1.8] mb-5 mt-0" style={{ color: COLORS.muted }}>
                  {directionSummary(forecast)}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'CURRENT SCORE', value: forecast.current_score.toFixed(0), color: COLORS.text },
                    { label: '30D FORECAST',  value: forecast.predicted_score_30d.toFixed(0), color: forecast.predicted_score_30d > forecast.current_score ? GREEN : RED },
                    { label: '90D FORECAST',  value: forecast.predicted_score_90d.toFixed(0), color: forecast.predicted_score_90d > forecast.current_score ? GREEN : RED },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="rounded-[20px] px-4 py-3"
                      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
                    >
                      <div className="font-mono text-[8px] tracking-[0.2em] mb-2" style={{ color: COLORS.dim }}>{item.label}</div>
                      <div className="font-grotesk text-[20px] font-bold" style={{ color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 font-mono text-[9px]" style={{ color: COLORS.dim }}>
                  CONFIDENCE {Math.round(forecast.confidence * 100)}% · STAGE {forecast.adoption_stage?.toUpperCase() ?? 'UNKNOWN'}
                </div>
              </div>
            ) : (
              <div>
                <p className="font-mono text-[12px] leading-[1.8] mb-4 mt-0" style={{ color: COLORS.muted }}>
                  {signals.length >= 5
                    ? `${signals.length} signals have been captured in this area. Activity suggests this is an emerging category. Formal trajectory modeling will unlock once 10+ signals are indexed.`
                    : 'Not enough signal data yet to build a trajectory model. As more funding rounds, contracts, and research papers are indexed, a forecast will appear here.'}
                </p>
                {signals.length > 0 && (
                  <div
                    className="rounded-[20px] px-5 py-3.5"
                    style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
                  >
                    <div className="font-mono text-[9px] mb-2" style={{ color: COLORS.dim }}>SIGNAL MOMENTUM</div>
                    <div className="font-grotesk text-[13px] font-bold" style={{ color: signals.length >= 10 ? GREEN : signals.length >= 5 ? GOLD : COLORS.muted }}>
                      {signals.length >= 10 ? 'HIGH' : signals.length >= 5 ? 'MODERATE' : 'LOW'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── 5. CONNECTED TO ── */}
          <Section label="CONNECTED TO">
            <div className="flex gap-2.5 flex-wrap">
              {connected.map(c => {
                const connSlug = c.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                return (
                  <Link
                    key={c}
                    href={`/dossier/${connSlug}`}
                    className="rounded-full font-mono text-[10px] tracking-[0.1em] no-underline inline-flex items-center gap-2 px-4 py-2.5 transition-all duration-200 hover:scale-[1.03]"
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.accent,
                    }}
                  >
                    <span className="text-[9px]" style={{ color: COLORS.dim }}>→</span>
                    {c}
                  </Link>
                );
              })}
            </div>
          </Section>

          {/* ── 6. ACTION BUTTONS ── */}
          <div className="flex gap-3 flex-wrap mt-4">
            {/* REQUEST INTRO */}
            <a
              href={`mailto:hello@nxtlinktech.com?subject=Intro Request — ${label}&body=I would like to request an introduction for the ${label} dossier (https://www.nxtlinktech.com/dossier/${slug}).`}
              className="rounded-full font-mono text-[11px] font-bold tracking-[0.15em] no-underline inline-block transition-opacity duration-200 px-6 py-3"
              style={{
                background: COLORS.orange,
                border: `1px solid ${COLORS.orange}`,
                color: '#000',
              }}
            >
              REQUEST INTRO
            </a>

            {/* FOLLOW */}
            <button
              onClick={handleFollow}
              className="rounded-full font-mono text-[11px] font-bold tracking-[0.15em] cursor-pointer transition-all duration-200 px-6 py-3"
              style={{
                background: followed ? `${CYAN}18` : COLORS.card,
                border: `1px solid ${followed ? CYAN : COLORS.border}`,
                color: followed ? CYAN : COLORS.muted,
              }}
            >
              {followed ? '✓ FOLLOWING' : '+ FOLLOW'}
            </button>

            {/* SHARE */}
            <button
              onClick={handleShare}
              className="rounded-full font-mono text-[11px] font-bold tracking-[0.15em] cursor-pointer transition-all duration-200 px-6 py-3"
              style={{
                background: COLORS.card,
                border: `1px solid ${copied ? GREEN : COLORS.border}`,
                color: copied ? GREEN : COLORS.muted,
              }}
            >
              {copied ? '✓ COPIED' : 'SHARE'}
            </button>
          </div>

          {/* Share URL hint */}
          <div className="font-mono text-[9px] mt-3 tracking-[0.1em]" style={{ color: COLORS.dim }}>
            nxtlinktech.com/dossier/{slug}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
