'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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
  mapPoints?: Array<{
    slug: string;
    name: string;
    signalCount: number;
    avgImportance: number;
    topIndustries: string[];
  }>;
  entities?: Array<{ id: string; type: string; name: string }>;
  warnings?: string[];
  sources?: {
    obsidian?: {
      enabled: boolean;
    };
  };
};

const SIGNAL_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  contract_award: { label: 'Contract', color: '#22c55e' },
  funding_round: { label: 'Funding', color: '#a855f7' },
  patent_filing: { label: 'Patent', color: '#06b6d4' },
  partnership: { label: 'Partnership', color: '#f59e0b' },
  product_launch: { label: 'Launch', color: '#f97316' },
  regulation: { label: 'Regulation', color: '#ef4444' },
  market_expansion: { label: 'Expansion', color: '#10b981' },
};

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Home() {
  const [signals, setSignals] = useState<TickerSignal[]>([]);
  const [stats, setStats] = useState<{ total: number; today: number } | null>(null);
  const [brain, setBrain] = useState<BrainResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const [briefingRes, brainRes] = await Promise.allSettled([
        fetch('/api/briefing').then((res) => res.json() as Promise<BriefingResponse>),
        fetch('/api/brain/sync?limit=80').then((res) => res.json() as Promise<BrainResponse>),
      ]);

      if (!active) return;

      if (briefingRes.status === 'fulfilled' && briefingRes.value?.briefing) {
        setSignals(briefingRes.value.briefing.recent_signals?.slice(0, 8) || []);
        setStats({
          total: briefingRes.value.briefing.total_signals || 0,
          today: briefingRes.value.briefing.recent_signals?.length || 0,
        });
      }

      if (brainRes.status === 'fulfilled') {
        setBrain(brainRes.value);
      }
    }

    load().catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const topPlaces = brain?.mapPoints?.slice(0, 3) ?? [];
  const companyCount = brain?.entities?.filter((entity) => entity.type === 'company').length ?? 0;
  const noteCount = brain?.notesScanned ?? 0;

  return (
    <div className="min-h-screen bg-nxt-bg">
      <section className="relative overflow-hidden">
        <div className="hero-orb hero-orb-indigo left-[-10rem] top-[-8rem] h-[22rem] w-[22rem]" />
        <div className="hero-orb hero-orb-cyan right-[4%] top-[6rem] h-[16rem] w-[16rem]" />
        <div className="absolute inset-0 grid-pattern opacity-35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(88,113,255,0.22),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(54,211,255,0.14),transparent_24%),linear-gradient(180deg,rgba(7,8,18,0.18)_0%,rgba(7,8,18,0.74)_54%,var(--bg)_100%)]" />

        <div className="relative mx-auto max-w-[1320px] px-6 pb-24 pt-14">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(138,160,255,0.12)] pb-5">
            <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-nxt-dim">
              Intelligence Operating System
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.18em] text-nxt-muted">
              <div className="flex items-center gap-2 rounded-full border border-[rgba(39,209,127,0.16)] bg-[rgba(12,30,23,0.58)] px-3 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-nxt-green live-pulse" />
                <span>{stats ? `${stats.total.toLocaleString()} tracked` : 'Live intake'}</span>
              </div>
              <span>NVIDIA-first reasoning</span>
            </div>
          </div>

          <div className="grid gap-10 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
            <div className="max-w-[820px]">
              <p className="section-kicker slide-up mb-5" style={{ animationDelay: '0.04s' }}>
                NXT//LINK
              </p>
              <h1
                className="slide-up max-w-[900px] text-[clamp(3.4rem,8vw,7.8rem)] font-bold leading-[0.92] tracking-[-0.05em] text-nxt-text"
                style={{ animationDelay: '0.08s' }}
              >
                We turn incoming
                <br />
                market movement
                <br />
                into an
                <span className="gradient-text"> operating picture.</span>
              </h1>
            </div>

            <div className="slide-up max-w-[420px] xl:justify-self-end" style={{ animationDelay: '0.14s' }}>
              <p className="text-base leading-8 text-nxt-secondary">
                NXT//LINK watches signals, maps them to companies and places, merges research memory, and explains what matters so operators can move faster.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/briefing"
                  className="rounded-full bg-nxt-accent px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
                >
                  Open the briefing
                </Link>
                <Link
                  href="/command"
                  className="rounded-full border border-nxt-border bg-nxt-surface px-5 py-3 text-sm font-medium text-nxt-secondary transition-all hover:border-nxt-muted hover:text-nxt-text"
                >
                  Launch command view
                </Link>
              </div>
            </div>
          </div>

          <div className="slide-up mt-14 grid gap-3 border-t border-[rgba(138,160,255,0.12)] pt-5 sm:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: '0.2s' }}>
            {[
              { label: 'Signals tracked', value: stats?.total?.toLocaleString() ?? '---', note: 'public and monitored continuously' },
              { label: 'Mapped companies', value: companyCount.toLocaleString(), note: 'linked into one graph' },
              { label: 'Research notes', value: noteCount.toLocaleString(), note: brain?.sources?.obsidian?.enabled ? 'Obsidian memory connected' : 'memory layer optional' },
              { label: 'Active locations', value: topPlaces.length.toString(), note: 'visible on the live map' },
            ].map((item) => (
              <div key={item.label} className="flex items-end justify-between gap-4 border border-[rgba(138,160,255,0.1)] bg-[rgba(13,18,30,0.46)] px-4 py-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">{item.label}</div>
                  <div className="mt-2 text-2xl font-mono font-bold text-nxt-text">{item.value}</div>
                </div>
                <div className="max-w-[120px] text-right text-[11px] leading-5 text-nxt-muted">{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[rgba(138,160,255,0.1)] bg-[rgba(9,13,22,0.7)]">
        <div className="mx-auto max-w-[1320px] px-6 py-20">
          <div className="grid gap-10 xl:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="section-kicker">What It Does</p>
              <h2 className="mt-3 max-w-[420px] text-3xl font-semibold leading-tight text-nxt-text sm:text-4xl">
                An intelligence system built to connect signal to decision.
              </h2>
            </div>

            <div className="grid gap-px overflow-hidden border border-[rgba(138,160,255,0.12)] bg-[rgba(138,160,255,0.12)] md:grid-cols-2">
              {[
                ['Watch the market', 'Track contracts, funding, launches, partnerships, regulations, and movement as it happens.'],
                ['Map the entities', 'Turn signals into linked companies, industries, locations, and relationships for the live graph.'],
                ['Learn your memory', 'Pull research notes and wiki-links from Obsidian so the system stops starting from zero.'],
                ['Explain clearly', 'Use NVIDIA-backed reasoning to create briefings, trust cues, and operator-ready summaries.'],
              ].map(([title, text], index) => (
                <div key={title} className="bg-[rgba(10,13,22,0.96)] p-6">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-nxt-dim">0{index + 1}</div>
                  <h3 className="mt-4 text-xl font-semibold text-nxt-text">{title}</h3>
                  <p className="mt-3 max-w-[420px] text-sm leading-7 text-nxt-secondary">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-6 py-20">
        <div className="mb-8 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="section-kicker">Experience</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-nxt-text sm:text-4xl">
              See the system through the screens that matter.
            </h2>
          </div>
          <p className="max-w-[460px] text-sm leading-7 text-nxt-secondary">
            The experience is designed to move from short explanation into live evidence, then into deeper action surfaces.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="overflow-hidden border border-[rgba(138,160,255,0.12)] bg-[rgba(10,13,22,0.96)]">
            <div className="border-b border-[rgba(138,160,255,0.12)] px-5 py-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">Primary screens</div>
            </div>
            <div className="grid gap-px bg-[rgba(138,160,255,0.12)]">
              {[
                ['/briefing', 'Briefing', 'A short daily operating read on what changed, why it matters, and what to watch next.'],
                ['/intel', 'Signal Feed', 'A ranked feed with filters, confidence, trust cues, and source context.'],
                ['/map', 'Brain Map', 'A live picture of where activity is clustering across companies and locations.'],
                ['/command', 'Command View', 'A denser control surface for operators who want the full picture at once.'],
              ].map(([href, title, desc]) => (
                <Link key={href} href={href} className="group bg-[rgba(10,13,22,0.96)] px-5 py-5 transition-colors hover:bg-[rgba(18,24,41,0.96)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-nxt-text">{title}</h3>
                      <p className="mt-2 max-w-[500px] text-sm leading-7 text-nxt-secondary">{desc}</p>
                    </div>
                    <div className="pt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-nxt-dim transition-colors group-hover:text-nxt-accent">
                      Open
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-[rgba(138,160,255,0.12)] bg-[rgba(10,13,22,0.96)] p-5">
              <p className="section-kicker">Top Places</p>
              <div className="mt-5 space-y-3">
                {topPlaces.length === 0 ? (
                  <p className="text-sm leading-7 text-nxt-dim">Map clusters will appear here after the sync runs.</p>
                ) : (
                  topPlaces.map((place) => (
                    <div key={place.slug} className="border border-[rgba(138,160,255,0.1)] bg-[rgba(13,18,30,0.46)] p-4">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <div className="text-base font-medium text-nxt-text">{place.name}</div>
                          <div className="mt-1 text-xs text-nxt-dim">{place.topIndustries.join(', ') || 'No industries tagged yet'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-mono font-bold text-nxt-text">{place.signalCount}</div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-nxt-dim">
                            {Math.round(place.avgImportance * 100)} score
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border border-[rgba(138,160,255,0.12)] bg-[rgba(10,13,22,0.96)] p-5">
              <p className="section-kicker">System Notes</p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-nxt-secondary">
                <p>
                  NXT//LINK is not just a dashboard. It is an intelligence workflow that combines live signals, mapped entities, memory, and explanation.
                </p>
                <p>
                  The goal is simple: make it easier to understand what is changing before teams have to react.
                </p>
                {brain?.warnings?.[0] && (
                  <div className="border border-[rgba(242,185,75,0.22)] bg-[rgba(46,30,8,0.56)] p-4 text-xs leading-6 text-nxt-secondary">
                    {brain.warnings[0]}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {signals.length > 0 && (
        <section className="overflow-hidden border-y border-[rgba(138,160,255,0.1)] bg-[rgba(9,13,22,0.7)]">
          <div className="flex items-center">
            <div className="shrink-0 border-r border-[rgba(138,160,255,0.1)] px-4 py-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-nxt-accent">Live Intake</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="feed-scroll flex items-center gap-8 px-4 py-3">
                {signals.map((signal) => {
                  const typeInfo = SIGNAL_TYPE_LABELS[signal.signal_type] || { label: signal.signal_type, color: '#6b6b76' };
                  return (
                    <div key={signal.id} className="flex shrink-0 items-center gap-3">
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                        style={{ background: `${typeInfo.color}18`, color: typeInfo.color }}
                      >
                        {typeInfo.label}
                      </span>
                      <span className="max-w-[340px] truncate whitespace-nowrap text-xs text-nxt-secondary">{signal.title}</span>
                      <span className="text-[10px] font-mono text-nxt-dim">{timeAgo(signal.discovered_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1320px] px-6 py-20">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div>
            <p className="section-kicker">Why Teams Use It</p>
            <h2 className="mt-3 max-w-[680px] text-3xl font-semibold leading-tight text-nxt-text sm:text-4xl">
              Less scattered research. Faster briefings. Better visibility into what is building.
            </h2>
          </div>
          <div className="text-sm leading-7 text-nxt-secondary">
            Built for logistics, supply chain, market intelligence, and innovation teams that need to turn monitoring into actual operating context.
          </div>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden border border-[rgba(138,160,255,0.12)] bg-[rgba(138,160,255,0.12)] md:grid-cols-3">
          {[
            ['For operators', 'Know what changed, where it is happening, and what requires attention right now.'],
            ['For researchers', 'Merge notes, wiki-links, and external signals into one memory-backed graph.'],
            ['For decision makers', 'Get a simpler story about movement, trust, and opportunity without reading raw feeds all day.'],
          ].map(([title, text]) => (
            <div key={title} className="bg-[rgba(10,13,22,0.96)] p-6">
              <h3 className="text-xl font-semibold text-nxt-text">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-nxt-secondary">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
