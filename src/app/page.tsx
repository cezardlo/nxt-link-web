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
  mapPoints?: Array<{ slug: string; name: string; signalCount: number; avgImportance: number; topIndustries: string[] }>;
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
    <div className="min-h-screen">
      <section className="relative overflow-hidden border-b border-nxt-border/60">
        <div className="hero-orb hero-orb-indigo left-[-8rem] top-[-6rem] h-[18rem] w-[18rem]" />
        <div className="hero-orb hero-orb-cyan right-[5%] top-[2rem] h-[14rem] w-[14rem]" />
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(88,113,255,0.22),transparent_34%),radial-gradient(circle_at_75%_15%,rgba(54,211,255,0.12),transparent_28%),linear-gradient(180deg,transparent_0%,rgba(8,10,18,0.28)_48%,var(--bg)_100%)]" />

        <div className="relative mx-auto max-w-[1280px] px-6 pb-20 pt-20">
          <div className="grid gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
            <div className="max-w-[680px]">
              <div className="slide-up mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(138,160,255,0.16)] bg-[rgba(13,19,34,0.9)] px-3 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <div className="h-1.5 w-1.5 rounded-full bg-nxt-green live-pulse" />
                <span className="text-xs font-mono tracking-wide text-nxt-muted">
                  {stats ? `${stats.total.toLocaleString()} signals tracked` : 'live monitoring'}
                </span>
              </div>

              <p className="section-kicker slide-up mb-4" style={{ animationDelay: '0.04s' }}>
                Market intelligence for operators
              </p>

              <h1 className="slide-up max-w-[760px] text-4xl font-bold leading-[1.02] text-nxt-text sm:text-5xl xl:text-6xl" style={{ animationDelay: '0.08s' }}>
                Turn incoming market noise into
                <span className="gradient-text"> one operating picture.</span>
              </h1>

              <p className="slide-up mt-5 max-w-[640px] text-lg leading-8 text-nxt-secondary" style={{ animationDelay: '0.14s' }}>
                NXT//LINK watches live signals, maps them to companies and places, and explains what matters in plain language.
                It is built for supply chain, logistics, and market teams that need a faster read on change.
              </p>

              <div className="slide-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.18s' }}>
                <Link
                  href="/briefing"
                  className="rounded-xl bg-nxt-accent px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
                >
                  Start with the briefing
                </Link>
                <Link
                  href="/command"
                  className="rounded-xl border border-nxt-border bg-nxt-surface px-5 py-3 text-sm font-medium text-nxt-secondary transition-all hover:border-nxt-muted hover:text-nxt-text"
                >
                  Open command view
                </Link>
                <Link
                  href="/map"
                  className="rounded-xl border border-[rgba(39,209,127,0.18)] bg-[rgba(12,30,23,0.72)] px-5 py-3 text-sm font-medium text-nxt-green transition-all hover:brightness-110"
                >
                  See the brain map
                </Link>
              </div>

              <div className="slide-up mt-10 grid gap-4 sm:grid-cols-3" style={{ animationDelay: '0.22s' }}>
                {[
                  { label: 'Signals tracked', value: stats?.total?.toLocaleString() ?? '---', hint: 'Live public intake' },
                  { label: 'Mapped companies', value: companyCount.toLocaleString(), hint: 'Connected into the graph' },
                  { label: 'Research notes', value: noteCount.toLocaleString(), hint: brain?.sources?.obsidian?.enabled ? 'Obsidian merged in' : 'Memory optional' },
                ].map((card) => (
                  <div key={card.label} className="rounded-[22px] border border-[rgba(138,160,255,0.12)] bg-[linear-gradient(180deg,rgba(20,27,46,0.92),rgba(11,15,27,0.92))] p-4">
                    <p className="text-xs font-mono uppercase tracking-[0.18em] text-nxt-dim">{card.label}</p>
                    <p className="mt-3 text-2xl font-mono font-bold text-nxt-text">{card.value}</p>
                    <p className="mt-1 text-xs text-nxt-muted">{card.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="slide-up grid gap-4" style={{ animationDelay: '0.24s' }}>
              <div className="rounded-[30px] border border-[rgba(138,160,255,0.16)] bg-[linear-gradient(180deg,rgba(18,24,41,0.96),rgba(10,13,24,0.96))] p-6 shadow-[0_24px_80px_rgba(1,5,16,0.42)] backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-kicker">How it works</p>
                    <h2 className="mt-2 text-2xl font-semibold text-nxt-text">One system, four jobs</h2>
                  </div>
                  <div className="rounded-full border border-[rgba(88,113,255,0.16)] bg-[rgba(88,113,255,0.08)] px-2.5 py-1 text-[11px] font-mono text-nxt-accent">
                    NVIDIA-first
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {[
                    ['Watch', 'Track live contracts, funding, launches, regulations, and market movement.'],
                    ['Map', 'Link each signal to companies, industries, and locations so the story has shape.'],
                    ['Learn', 'Merge memory from your notes and research instead of starting from zero each time.'],
                    ['Explain', 'Turn ranked signals into briefings, trust cues, and next actions for teams.'],
                  ].map(([title, text], index) => (
                    <div key={title} className="rounded-[20px] border border-[rgba(138,160,255,0.12)] bg-[rgba(20,27,46,0.78)] p-4">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-nxt-accent/15 text-xs font-mono text-nxt-accent">
                          0{index + 1}
                        </div>
                        <h3 className="text-sm font-semibold text-nxt-text">{title}</h3>
                      </div>
                      <p className="text-sm leading-6 text-nxt-secondary">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-nxt-border bg-nxt-card/86 p-5">
                  <p className="section-kicker">Top places</p>
                  <div className="mt-4 space-y-3">
                    {topPlaces.length === 0 ? (
                      <p className="text-sm text-nxt-dim">Map clusters will appear here once the sync runs.</p>
                    ) : (
                      topPlaces.map((place) => (
                        <div key={place.slug} className="flex items-center justify-between rounded-2xl border border-nxt-border bg-[rgba(10,13,22,0.75)] p-3">
                          <div>
                            <div className="text-sm font-medium text-nxt-text">{place.name}</div>
                            <div className="mt-1 text-xs text-nxt-dim">{place.topIndustries.join(', ') || 'No industries tagged yet'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-mono font-bold text-nxt-text">{place.signalCount}</div>
                            <div className="text-[10px] font-mono text-nxt-dim">{Math.round(place.avgImportance * 100)} score</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-nxt-border bg-nxt-card/86 p-5">
                  <p className="section-kicker">Trust layer</p>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-nxt-secondary">
                    <p>The site now ranks what looks important, shows confidence, and keeps the graph working even if memory is not connected yet.</p>
                    <div className="rounded-2xl border border-[rgba(39,209,127,0.18)] bg-[rgba(12,30,23,0.72)] p-4">
                      <div className="text-xs font-mono uppercase tracking-[0.18em] text-nxt-green">Brain status</div>
                      <div className="mt-2 text-sm font-semibold text-nxt-text">
                        {brain?.sources?.obsidian?.enabled ? 'Live signals + Obsidian memory' : 'Live signals active'}
                      </div>
                    </div>
                    {brain?.warnings?.[0] && (
                      <div className="rounded-2xl border border-[rgba(242,185,75,0.22)] bg-[rgba(46,30,8,0.56)] p-4 text-xs leading-5 text-nxt-secondary">
                        {brain.warnings[0]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {signals.length > 0 && (
        <section className="overflow-hidden border-y border-nxt-border bg-nxt-surface/50">
          <div className="flex items-center">
            <div className="shrink-0 border-r border-nxt-border bg-nxt-card px-4 py-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-nxt-accent">LIVE</span>
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
                      <span className="max-w-[320px] truncate whitespace-nowrap text-xs text-nxt-secondary">{signal.title}</span>
                      <span className="text-[10px] font-mono text-nxt-dim">{timeAgo(signal.discovered_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1220px] px-6 py-16">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Main paths</p>
            <h2 className="mt-2 text-3xl font-semibold text-nxt-text">Start fast, then go deeper where you need it.</h2>
          </div>
          <p className="max-w-[520px] text-sm leading-6 text-nxt-secondary">
            The website now has clearer jobs for each screen. You should be able to move from a short briefing into the signal feed, map, command view, or vendor research without getting lost.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['/briefing', 'Briefing', 'Start with the short narrative and what changed today.'],
            ['/intel', 'Signal Feed', 'Filter raw movement by score, source, and trust cues.'],
            ['/map', 'Brain Map', 'See which places are clustering and why.'],
            ['/vendors', 'Vendor Directory', 'Move from a signal into actual companies and categories.'],
          ].map(([href, title, desc]) => (
            <Link key={href} href={href} className="card-hover rounded-[24px] border border-nxt-border bg-nxt-surface p-5">
              <div className="text-sm font-semibold text-nxt-text">{title}</div>
              <p className="mt-2 text-sm leading-6 text-nxt-secondary">{desc}</p>
              <div className="mt-4 text-xs font-mono uppercase tracking-[0.18em] text-nxt-dim">Open</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
