'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ORANGE = '#ff6600';
const CYAN   = '#00d4ff';
const GREEN  = '#00ff88';
const GOLD   = '#ffd700';
const RED    = '#ff3b30';
const PURPLE = '#aa66ff';
const FONT   = "'JetBrains Mono', 'Courier New', monospace";

// ─── Bottom nav ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'TODAY',   href: '/dashboard' },
  { label: 'EXPLORE', href: '/ask' },
  { label: 'WORLD',   href: '/map' },
  { label: 'FOLLOW',  href: '/map' },
  { label: 'STORE',   href: '/' },
  { label: 'DOSSIER', href: '/dossier', active: true },
];

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
    <div style={{
      background: '#060606',
      border: `1px solid ${config.color}33`,
      borderLeft: `4px solid ${config.color}`,
      borderRadius: 4,
      padding: '20px 24px',
      marginBottom: 24,
    }}>
      <div style={{ color: '#555', fontSize: 9, letterSpacing: '0.25em', marginBottom: 10 }}>
        SHOULD YOU ENGAGE WITH THIS?
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: config.color,
          boxShadow: `0 0 10px ${config.color}`,
          flexShrink: 0,
        }} />
        <span style={{ color: config.color, fontSize: 22, fontWeight: 700, letterSpacing: '0.04em' }}>
          {config.text}
        </span>
      </div>
      <p style={{ color: '#888', fontSize: 11, margin: 0, lineHeight: 1.6 }}>
        {config.sub}
      </p>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ color: '#333', fontSize: 9, letterSpacing: '0.25em', marginBottom: 12, borderBottom: '1px solid #111', paddingBottom: 6 }}>
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
          // Filter to this industry (loose match)
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
            // Extract IKER score if present
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
    // Try profile blocks first
    if (profile) {
      const snap = profile.find(b => b.type === 'snapshot' || b.type === 'what_it_is');
      if (snap?.content) return snap.content;
      const first = profile.find(b => b.content && b.content.length > 40);
      if (first?.content) return first.content;
    }
    // Fallback by exact slug or first slug segment
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
      <div style={{ fontFamily: FONT, background: '#000', minHeight: '100vh', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', marginBottom: 16 }}>NO DOSSIER FOUND</div>
          <button onClick={() => router.push('/dossier')} style={{ color: CYAN, background: 'none', border: 'none', fontFamily: FONT, fontSize: 11, cursor: 'pointer' }}>
            ← BACK TO SEARCH
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT, background: '#000', minHeight: '100vh', color: '#fff', paddingBottom: 72 }}>
      {/* ── Header ── */}
      <div style={{ borderBottom: '1px solid #111', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#000', zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/dossier')}
            style={{ color: '#444', background: 'none', border: 'none', fontFamily: FONT, fontSize: 11, cursor: 'pointer', padding: 0 }}
          >
            ← DOSSIER
          </button>
          <span style={{ color: '#222' }}>|</span>
          <span style={{ color: '#666', fontSize: 10, letterSpacing: '0.15em' }}>{slug.toUpperCase()}</span>
        </div>
        <Link href="/" style={{ color: ORANGE, fontSize: 12, letterSpacing: '0.15em', textDecoration: 'none', fontWeight: 700 }}>
          NXT//LINK
        </Link>
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#333', fontSize: 10, letterSpacing: '0.2em' }}>
          <div style={{ marginBottom: 16, color: CYAN, fontSize: 12 }}>◌</div>
          LOADING DOSSIER…
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px' }}>

          {/* Title */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: '#333', fontSize: 9, letterSpacing: '0.25em', marginBottom: 6 }}>
              INTELLIGENCE DOSSIER
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#fff', letterSpacing: '-0.01em' }}>
              {label}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: '#444', fontSize: 9 }}>
                {signals.length} SIGNAL{signals.length !== 1 ? 'S' : ''} TRACKED
              </span>
              {forecast && (
                <>
                  <span style={{ color: '#222' }}>·</span>
                  <span style={{ color: forecast.direction === 'accelerating' || forecast.direction === 'growing' ? GREEN : '#888', fontSize: 9, letterSpacing: '0.12em' }}>
                    {forecast.direction.toUpperCase()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── IKER score (vendor dossiers) ── */}
          {ikerScore !== null && (
            <div style={{
              background: '#060606',
              border: `1px solid ${ikerColor(ikerScore)}33`,
              borderRadius: 4,
              padding: '14px 18px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                border: `3px solid ${ikerColor(ikerScore)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: ikerColor(ikerScore), fontSize: 14, fontWeight: 700 }}>{ikerScore}</span>
              </div>
              <div>
                <div style={{ color: '#444', fontSize: 9, letterSpacing: '0.2em', marginBottom: 2 }}>TRUST SCORE</div>
                <div style={{ color: ikerColor(ikerScore), fontSize: 15, fontWeight: 700, letterSpacing: '0.05em' }}>
                  {ikerScore}/100 — {ikerLabel(ikerScore)}
                </div>
              </div>
            </div>
          )}

          {/* ── 1. DECISION BADGE ── */}
          <DecisionBadge decision={decision} />

          {/* ── 2. WHAT IS THIS ── */}
          <Section label="WHAT IS THIS">
            <p style={{ color: '#aaa', fontSize: 12, lineHeight: 1.75, margin: 0 }}>
              {getDescription()}
            </p>
          </Section>

          {/* ── 3. SIGNAL HISTORY ── */}
          <Section label={`SIGNAL HISTORY — LAST 90 DAYS (${signals.length})`}>
            {signals.length === 0 ? (
              <div style={{ color: '#333', fontSize: 11 }}>No signals found for this topic yet. The platform is still indexing this area.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {signals.slice(0, 15).map((s, i) => {
                  const icon = SIGNAL_ICONS[s.signal_type] ?? '📡';
                  const imp  = s.importance ?? s.importance_score ?? 0;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '8px 10px',
                        background: '#050505',
                        border: '1px solid #111',
                        borderRadius: 3,
                      }}
                    >
                      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: CYAN, fontSize: 11, lineHeight: 1.5, textDecoration: 'none', display: 'block' }}
                          >
                            {s.title}
                          </a>
                        ) : (
                          <span style={{ color: '#ccc', fontSize: 11, lineHeight: 1.5, display: 'block' }}>{s.title}</span>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          {s.company && (
                            <span style={{ color: '#555', fontSize: 9 }}>{s.company}</span>
                          )}
                          <span style={{ color: '#333', fontSize: 9 }}>{timeAgo(s.discovered_at)}</span>
                          <span style={{ color: imp > 0.7 ? GREEN : imp > 0.4 ? GOLD : '#555', fontSize: 9 }}>
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
                <p style={{ color: '#aaa', fontSize: 12, lineHeight: 1.75, margin: '0 0 16px' }}>
                  {directionSummary(forecast)}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'CURRENT SCORE', value: forecast.current_score.toFixed(0), color: '#fff' },
                    { label: '30D FORECAST',  value: forecast.predicted_score_30d.toFixed(0), color: forecast.predicted_score_30d > forecast.current_score ? GREEN : RED },
                    { label: '90D FORECAST',  value: forecast.predicted_score_90d.toFixed(0), color: forecast.predicted_score_90d > forecast.current_score ? GREEN : RED },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#060606', border: '1px solid #111', borderRadius: 3, padding: '10px 12px' }}>
                      <div style={{ color: '#333', fontSize: 8, letterSpacing: '0.2em', marginBottom: 6 }}>{item.label}</div>
                      <div style={{ color: item.color, fontSize: 20, fontWeight: 700 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, color: '#333', fontSize: 9 }}>
                  CONFIDENCE {Math.round(forecast.confidence * 100)}% · STAGE {forecast.adoption_stage?.toUpperCase() ?? 'UNKNOWN'}
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: '#aaa', fontSize: 12, lineHeight: 1.75, margin: '0 0 14px' }}>
                  {signals.length >= 5
                    ? `${signals.length} signals have been captured in this area. Activity suggests this is an emerging category. Formal trajectory modeling will unlock once 10+ signals are indexed.`
                    : 'Not enough signal data yet to build a trajectory model. As more funding rounds, contracts, and research papers are indexed, a forecast will appear here.'}
                </p>
                {signals.length > 0 && (
                  <div style={{ background: '#060606', border: '1px solid #111', borderRadius: 3, padding: '10px 14px' }}>
                    <div style={{ color: '#333', fontSize: 9, marginBottom: 6 }}>SIGNAL MOMENTUM</div>
                    <div style={{ color: signals.length >= 10 ? GREEN : signals.length >= 5 ? GOLD : '#555', fontSize: 13, fontWeight: 700 }}>
                      {signals.length >= 10 ? 'HIGH' : signals.length >= 5 ? 'MODERATE' : 'LOW'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── 5. CONNECTED TO ── */}
          <Section label="CONNECTED TO">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {connected.map(c => {
                const connSlug = c.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                return (
                  <Link
                    key={c}
                    href={`/dossier/${connSlug}`}
                    style={{
                      background: '#080808',
                      border: `1px solid #1a1a1a`,
                      borderRadius: 3,
                      color: CYAN,
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      padding: '6px 12px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <span style={{ color: '#333', fontSize: 9 }}>→</span>
                    {c}
                  </Link>
                );
              })}
            </div>
          </Section>

          {/* ── 6. ACTION BUTTONS ── */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {/* REQUEST INTRO */}
            <a
              href={`mailto:hello@nxtlinktech.com?subject=Intro Request — ${label}&body=I would like to request an introduction for the ${label} dossier (https://www.nxtlinktech.com/dossier/${slug}).`}
              style={{
                background: ORANGE,
                border: `1px solid ${ORANGE}`,
                borderRadius: 4,
                color: '#000',
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.15em',
                padding: '11px 20px',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'opacity 0.15s',
              }}
            >
              REQUEST INTRO
            </a>

            {/* FOLLOW */}
            <button
              onClick={handleFollow}
              style={{
                background: followed ? `${CYAN}18` : '#080808',
                border: `1px solid ${followed ? CYAN : '#222'}`,
                borderRadius: 4,
                color: followed ? CYAN : '#666',
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.15em',
                padding: '11px 20px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {followed ? '✓ FOLLOWING' : '+ FOLLOW'}
            </button>

            {/* SHARE */}
            <button
              onClick={handleShare}
              style={{
                background: '#080808',
                border: `1px solid ${copied ? GREEN : '#222'}`,
                borderRadius: 4,
                color: copied ? GREEN : '#666',
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.15em',
                padding: '11px 20px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {copied ? '✓ COPIED' : 'SHARE'}
            </button>
          </div>

          {/* Share URL hint */}
          <div style={{ color: '#222', fontSize: 9, marginTop: 10, letterSpacing: '0.1em' }}>
            nxtlinktech.com/dossier/{slug}
          </div>
        </div>
      )}

      {/* ── Bottom nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 48, background: '#050505',
        borderTop: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'stretch',
        zIndex: 50,
      }}>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT,
              fontSize: 9,
              letterSpacing: '0.15em',
              color: item.active ? ORANGE : '#444',
              textDecoration: 'none',
              borderTop: item.active ? `2px solid ${ORANGE}` : '2px solid transparent',
              transition: 'color 0.15s',
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
