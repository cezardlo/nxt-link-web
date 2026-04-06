'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

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
  partnership: { label: 'Partner', color: '#f59e0b' },
  product_launch: { label: 'Launch', color: '#f97316' },
  regulation: { label: 'Rule', color: '#ef4444' },
  market_expansion: { label: 'Expand', color: '#10b981' },
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
        const recentSignals = briefingRes.value.briefing.recent_signals?.slice(0, 10) || [];
        setSignals(recentSignals);
        setStats({
          total: briefingRes.value.briefing.total_signals || 0,
          today: recentSignals.length,
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

  const topPlaces = brain?.mapPoints?.slice(0, 5) ?? [];
  const companyCount = brain?.entities?.filter((entity) => entity.type === 'company').length ?? 0;
  const noteCount = brain?.notesScanned ?? 0;
  const signalTape = useMemo(() => (signals.length ? [...signals, ...signals] : []), [signals]);

  const jobs = [
    {
      index: '01',
      title: 'Watch live movement',
      body: 'Track contracts, launches, policy, funding, and expansion as they appear.',
    },
    {
      index: '02',
      title: 'Map what connects',
      body: 'Turn raw signals into companies, sectors, places, and linked activity.',
    },
    {
      index: '03',
      title: 'Merge research memory',
      body: 'Pull Obsidian notes into the same operating picture instead of leaving context scattered.',
    },
    {
      index: '04',
      title: 'Explain the change',
      body: 'Use NVIDIA-first agents to turn graph movement into plain-language decisions.',
    },
  ];

  return (
    <div className="bg-nxt-bg text-nxt-text">
      <section className="relative isolate min-h-[calc(100svh-4.5rem)] overflow-hidden border-b border-[rgba(138,160,255,0.1)]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,12,0.22)_0%,rgba(4,6,12,0.72)_72%,rgba(4,6,12,1)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(88,113,255,0.28),transparent_24%),radial-gradient(circle_at_78%_22%,rgba(54,211,255,0.18),transparent_24%),linear-gradient(120deg,rgba(255,255,255,0.02)_0%,transparent_36%,rgba(255,255,255,0.02)_100%)]" />
        <div className="absolute inset-y-0 left-[5vw] hidden w-px bg-[linear-gradient(180deg,transparent,rgba(138,160,255,0.16),transparent)] xl:block" />
        <div className="absolute inset-y-0 right-[6vw] hidden w-px bg-[linear-gradient(180deg,transparent,rgba(138,160,255,0.12),transparent)] xl:block" />

        <div className="relative flex min-h-[calc(100svh-4.5rem)] flex-col justify-between px-6 pb-8 pt-6 lg:px-10 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(138,160,255,0.12)] pb-4"
          >
            <div className="flex items-center gap-4">
              <div className="nxt-hero-wordmark">NXT//LINK</div>
              <div className="hidden text-[10px] font-mono uppercase tracking-[0.22em] text-nxt-dim sm:block">
                Intelligence operating system
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.2em] text-nxt-muted">
              <div className="flex items-center gap-2 rounded-full border border-[rgba(39,209,127,0.16)] bg-[rgba(9,22,17,0.55)] px-3 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-nxt-green live-pulse" />
                <span>{stats ? `${stats.total.toLocaleString()} records live` : 'Live intake active'}</span>
              </div>
              <span className="hidden sm:inline">NVIDIA-first agents</span>
            </div>
          </motion.div>

          <div className="grid flex-1 gap-12 py-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(540px,1.1fr)] xl:items-center xl:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.08 }}
              className="max-w-[42rem]"
            >
              <div className="mb-6 text-[10px] font-mono uppercase tracking-[0.34em] text-nxt-dim">
                Signals in. Patterns mapped. Decisions explained.
              </div>
              <h1 className="text-[clamp(3.5rem,8vw,8.8rem)] font-bold uppercase leading-[0.86] tracking-[-0.08em] text-white">
                Build the
                <br />
                market picture
                <br />
                before it is
                <br />
                obvious.
              </h1>
              <p className="mt-7 max-w-[34rem] text-base leading-8 text-nxt-secondary sm:text-lg">
                NXT//LINK watches incoming signals, maps companies and places, learns from research memory, and turns movement into a usable operating picture.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/briefing" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#05070d] transition-transform duration-200 hover:-translate-y-0.5">
                  Open the briefing
                </Link>
                <Link href="/map" className="rounded-full border border-[rgba(138,160,255,0.18)] bg-[rgba(13,18,30,0.46)] px-6 py-3 text-sm font-medium text-nxt-text transition-colors duration-200 hover:border-[rgba(138,160,255,0.34)]">
                  See the live map
                </Link>
              </div>

              <div className="mt-10 grid max-w-[36rem] gap-3 border-t border-[rgba(138,160,255,0.12)] pt-6 sm:grid-cols-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">Signals</div>
                  <div className="mt-2 text-3xl font-mono font-bold text-white">{stats?.total?.toLocaleString() ?? '---'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">Companies</div>
                  <div className="mt-2 text-3xl font-mono font-bold text-white">{companyCount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">Research memory</div>
                  <div className="mt-2 text-3xl font-mono font-bold text-white">{noteCount.toLocaleString()}</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.16 }}
              className="relative"
            >
              <div className="nxt-field-plane">
                <div className="nxt-field-grid" />
                <div className="nxt-field-sweep" />

                <div className="absolute left-6 top-6 z-10 text-[10px] font-mono uppercase tracking-[0.26em] text-nxt-dim">
                  Operating picture
                </div>
                <div className="absolute right-6 top-6 z-10 rounded-full border border-[rgba(138,160,255,0.16)] bg-[rgba(7,10,16,0.6)] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-accent">
                  Live graph sync
                </div>

                <div className="absolute inset-x-8 bottom-8 top-16 z-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="flex flex-col justify-between rounded-[1.8rem] border border-[rgba(138,160,255,0.12)] bg-[rgba(6,9,16,0.58)] p-6 backdrop-blur-sm">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-nxt-dim">Field priority</div>
                      <div className="mt-5 max-w-[18rem] text-[clamp(2.2rem,4vw,4.8rem)] font-bold leading-[0.92] tracking-[-0.06em] text-white">
                        Signal to map to action.
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="border-t border-[rgba(138,160,255,0.12)] pt-3">
                        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">Today</div>
                        <div className="mt-2 text-2xl font-mono font-bold text-white">{stats?.today ?? 0}</div>
                      </div>
                      <div className="border-t border-[rgba(138,160,255,0.12)] pt-3">
                        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">Places</div>
                        <div className="mt-2 text-2xl font-mono font-bold text-white">{topPlaces.length}</div>
                      </div>
                      <div className="border-t border-[rgba(138,160,255,0.12)] pt-3">
                        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">Mode</div>
                        <div className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-nxt-text">NVIDIA</div>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[1.8rem] border border-[rgba(138,160,255,0.12)] bg-[rgba(6,9,16,0.68)] p-5 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(88,113,255,0.18),transparent_44%)]" />
                    <div className="absolute left-[18%] top-[24%] h-3 w-3 rounded-full bg-nxt-cyan shadow-[0_0_28px_rgba(54,211,255,0.8)]" />
                    <div className="absolute left-[42%] top-[48%] h-3 w-3 rounded-full bg-nxt-accent shadow-[0_0_28px_rgba(88,113,255,0.8)]" />
                    <div className="absolute right-[20%] top-[30%] h-3 w-3 rounded-full bg-nxt-green shadow-[0_0_28px_rgba(39,209,127,0.8)]" />
                    <div className="absolute bottom-[18%] right-[28%] h-3 w-3 rounded-full bg-[#f59e0b] shadow-[0_0_28px_rgba(245,158,11,0.8)]" />
                    <div className="nxt-radar-ring left-[18%] top-[24%]" />
                    <div className="nxt-radar-ring left-[42%] top-[48%]" />
                    <div className="nxt-radar-ring right-[20%] top-[30%]" />
                    <div className="nxt-radar-ring bottom-[18%] right-[28%]" />

                    <div className="relative z-10 flex h-full flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-nxt-dim">Map clusters</div>
                        <div className="mt-4 space-y-3">
                          {topPlaces.length === 0 ? (
                            <p className="max-w-[16rem] text-sm leading-7 text-nxt-secondary">
                              Location clusters will appear after the sync finishes.
                            </p>
                          ) : (
                            topPlaces.slice(0, 3).map((place) => (
                              <div key={place.slug} className="flex items-end justify-between border-b border-[rgba(138,160,255,0.1)] pb-3">
                                <div>
                                  <div className="text-base font-medium text-white">{place.name}</div>
                                  <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-nxt-dim">
                                    {place.topIndustries[0] || 'Mixed activity'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-mono font-bold text-white">{place.signalCount}</div>
                                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-nxt-dim">signals</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] leading-6 text-nxt-secondary">
                        The homepage now behaves like a field display, not a dashboard grid.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.28 }}
            className="border-t border-[rgba(138,160,255,0.12)] pt-5"
          >
            <div className="nxt-tape-wrap">
              <div className="nxt-tape">
                {signalTape.map((signal, index) => {
                  const typeInfo = SIGNAL_TYPE_LABELS[signal.signal_type] || { label: signal.signal_type, color: '#6b6b76' };
                  return (
                    <div key={`${signal.id}-${index}`} className="nxt-tape-item">
                      <span className="rounded px-1.5 py-0.5 font-mono text-[10px]" style={{ background: `${typeInfo.color}18`, color: typeInfo.color }}>
                        {typeInfo.label}
                      </span>
                      <span className="max-w-[340px] truncate whitespace-nowrap text-xs text-nxt-secondary">{signal.title}</span>
                      <span className="text-[10px] font-mono text-nxt-dim">{timeAgo(signal.discovered_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-[rgba(138,160,255,0.08)] px-6 py-20 lg:px-10 xl:px-16">
        <div className="grid gap-12 xl:grid-cols-[0.7fr_1.3fr] xl:items-start">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-nxt-dim">What NXT//LINK does</div>
            <h2 className="mt-4 max-w-[22rem] text-[clamp(2.3rem,4vw,4.5rem)] font-bold uppercase leading-[0.9] tracking-[-0.06em] text-white">
              Four jobs.
              <br />
              One system.
            </h2>
          </div>

          <div className="border-t border-[rgba(138,160,255,0.12)]">
            {jobs.map((job, index) => (
              <motion.div
                key={job.index}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: index * 0.06 }}
                className="grid gap-4 border-b border-[rgba(138,160,255,0.12)] py-6 md:grid-cols-[100px_minmax(0,1fr)_minmax(0,16rem)] md:items-start"
              >
                <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-nxt-dim">{job.index}</div>
                <div className="text-2xl font-semibold tracking-[-0.03em] text-white">{job.title}</div>
                <p className="max-w-[22rem] text-sm leading-7 text-nxt-secondary">{job.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-10 xl:px-16">
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-[rgba(138,160,255,0.12)] bg-[rgba(8,11,18,0.92)] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(88,113,255,0.08),transparent_44%,rgba(54,211,255,0.08)_100%)]" />
            <div className="relative z-10">
              <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-nxt-dim">System surfaces</div>
              <h2 className="mt-4 max-w-[38rem] text-[clamp(2.1rem,4vw,4rem)] font-bold uppercase leading-[0.92] tracking-[-0.05em] text-white">
                Move from the picture to the right operating screen.
              </h2>

              <div className="mt-10 space-y-5">
                {[
                  ['/briefing', 'Briefing', 'The short read on what changed, why it matters, and what to do next.'],
                  ['/intel', 'Signal Feed', 'A ranked list with confidence, filters, and source context.'],
                  ['/map', 'Brain Map', 'A place-based view of where activity is clustering.'],
                  ['/command', 'Command View', 'The dense operating surface for full-system work.'],
                ].map(([href, title, body]) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex flex-col gap-3 border-t border-[rgba(138,160,255,0.12)] py-4 transition-colors hover:text-white md:flex-row md:items-start md:justify-between"
                  >
                    <div>
                      <div className="text-2xl font-semibold tracking-[-0.03em] text-white">{title}</div>
                      <p className="mt-2 max-w-[32rem] text-sm leading-7 text-nxt-secondary">{body}</p>
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-nxt-dim transition-colors group-hover:text-nxt-accent">
                      Open screen
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[2rem] border border-[rgba(138,160,255,0.12)] bg-[rgba(10,13,22,0.92)] p-6 sm:p-8">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-nxt-dim">Memory and trust</div>
              <div className="mt-4 text-4xl font-bold uppercase leading-[0.9] tracking-[-0.05em] text-white">
                Research memory is part of the picture.
              </div>
              <p className="mt-5 text-sm leading-7 text-nxt-secondary">
                Obsidian notes, mapped entities, and live intake can sit in the same system instead of living in separate tools.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              <div className="flex items-end justify-between border-t border-[rgba(138,160,255,0.12)] pt-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">Obsidian</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {brain?.sources?.obsidian?.enabled ? 'Connected' : 'Optional'}
                  </div>
                </div>
                <div className="text-right text-[11px] leading-5 text-nxt-muted">{noteCount.toLocaleString()} notes scanned</div>
              </div>
              <div className="flex items-end justify-between border-t border-[rgba(138,160,255,0.12)] pt-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">Warnings</div>
                  <div className="mt-2 text-lg font-semibold text-white">{brain?.warnings?.length ? 'Attention needed' : 'System clear'}</div>
                </div>
                <div className="max-w-[10rem] text-right text-[11px] leading-5 text-nxt-muted">
                  {brain?.warnings?.[0] ?? 'No blocking sync warnings reported.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
