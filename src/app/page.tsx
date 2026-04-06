'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TickerSignal {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  discovered_at: string;
}

const SIGNAL_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  contract_award: { label: 'Contract', color: '#22c55e' },
  funding_round: { label: 'Funding', color: '#a855f7' },
  patent_filing: { label: 'Patent', color: '#06b6d4' },
  partnership: { label: 'Partnership', color: '#f59e0b' },
  product_launch: { label: 'Launch', color: '#f97316' },
  regulation: { label: 'Regulation', color: '#ef4444' },
  market_expansion: { label: 'Expansion', color: '#10b981' },
};

const NAV_CARDS = [
  {
    href: '/briefing',
    title: 'Daily Briefing',
    desc: 'Start with the short version: what changed, why it matters, and what needs attention.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/intel',
    title: 'Signal Feed',
    desc: 'Track live signals across contracts, funding, patents, regulations, and launches.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
        <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
        <circle cx={12} cy={12} r={2} />
        <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
        <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
      </svg>
    ),
  },
  {
    href: '/vendors',
    title: 'Vendor Directory',
    desc: 'Review vendors with richer profiles, category tags, and scoring in one place.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20" />
        <path d="M5 20V8l5 4V8l5 4V4h3v16" />
      </svg>
    ),
  },
  {
    href: '/map',
    title: 'Global Map',
    desc: 'See where activity is building across regions, sectors, and supply chain corridors.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={12} cy={12} r={10} />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    href: '/conferences',
    title: 'Events',
    desc: 'Spot important conferences, trade events, and where opportunities are gathering.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x={3} y={4} width={18} height={18} rx={2} />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
      </svg>
    ),
  },
  {
    href: '/products',
    title: 'Products',
    desc: 'Compare products and technologies relevant to logistics, operations, and industry teams.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1={12} y1={22.08} x2={12} y2={12} />
      </svg>
    ),
  },
];

const AUDIENCE_PILLS = ['Operations teams', 'Economic development', 'Supply chain strategy', 'Innovation scouting'];

const WORKFLOW_STEPS = [
  {
    title: 'Watch the market',
    desc: 'Pull live signals from public sources so important movement shows up early.',
  },
  {
    title: 'Understand the story',
    desc: 'Turn noisy updates into plain-language briefings, patterns, and regional context.',
  },
  {
    title: 'Act faster',
    desc: 'Move from signal to vendor, product, or next decision without hunting across tools.',
  },
];

const CAPABILITY_CARDS = [
  {
    title: 'Signals',
    desc: 'Live contracts, patents, funding, launches, and regulation in one stream.',
  },
  {
    title: 'Vendors',
    desc: 'Profiles, categories, and scoring so you can evaluate who matters faster.',
  },
  {
    title: 'Markets',
    desc: 'Regional context, event activity, and supply-chain movement across sectors.',
  },
];

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

  useEffect(() => {
    fetch('/api/briefing')
      .then((r) => r.json())
      .then((data) => {
        if (data?.briefing) {
          setSignals(data.briefing.recent_signals?.slice(0, 8) || []);
          setStats({
            total: data.briefing.total_signals || 0,
            today: data.briefing.recent_signals?.length || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="hero-orb hero-orb-indigo left-[-8rem] top-[-7rem] h-[18rem] w-[18rem]" />
        <div className="hero-orb hero-orb-cyan right-[6%] top-[3rem] h-[14rem] w-[14rem]" />
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_38%),linear-gradient(180deg,transparent_0%,rgba(10,10,15,0.2)_42%,var(--bg)_100%)]" />

        <div className="relative mx-auto max-w-[1100px] px-6 pb-20 pt-24">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="slide-up mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(138,160,255,0.16)] bg-[rgba(13,19,34,0.88)] px-3 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <div className="h-1.5 w-1.5 rounded-full bg-nxt-green live-pulse" />
                <span className="text-xs font-mono tracking-wide text-nxt-muted">
                  {stats ? `${stats.total.toLocaleString()} SIGNALS TRACKED` : 'LIVE MONITORING'}
                </span>
              </div>

              <p className="section-kicker slide-up mb-4" style={{ animationDelay: '0.03s' }}>
                Supply chain command center
              </p>

              <h1 className="slide-up mb-5 text-4xl font-bold leading-tight text-nxt-text sm:text-5xl lg:text-6xl" style={{ animationDelay: '0.06s' }}>
                Know what is changing
                <br />
                <span className="gradient-text">before your market does</span>
              </h1>

              <p className="slide-up mb-6 max-w-[680px] text-lg text-nxt-secondary" style={{ animationDelay: '0.12s' }}>
                NXT//LINK turns scattered public signals into a simple operating view for supply chain, logistics, and industry teams.
                See what changed, which vendors matter, and where new opportunities are forming.
              </p>

              <div className="slide-up mb-8 flex flex-wrap gap-2" style={{ animationDelay: '0.16s' }}>
                {AUDIENCE_PILLS.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-nxt-border bg-nxt-surface/80 px-3 py-1.5 text-xs font-medium text-nxt-secondary"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="slide-up flex flex-wrap items-center gap-3" style={{ animationDelay: '0.18s' }}>
                <Link
                  href="/briefing"
                  className="rounded-lg bg-nxt-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
                >
                  Start with the Briefing
                </Link>
                <Link
                  href="/intel"
                  className="rounded-lg border border-nxt-border bg-nxt-surface px-5 py-2.5 text-sm font-medium text-nxt-secondary transition-all hover:border-nxt-muted hover:text-nxt-text"
                >
                  Browse Live Signals
                </Link>
              </div>

              <div className="slide-up mt-8 grid gap-3 sm:grid-cols-3" style={{ animationDelay: '0.22s' }}>
                {CAPABILITY_CARDS.map((card) => (
                  <div key={card.title} className="rounded-2xl border border-[rgba(138,160,255,0.12)] bg-[linear-gradient(180deg,rgba(20,27,46,0.92),rgba(11,15,27,0.92))] p-4">
                    <p className="text-xs font-mono uppercase tracking-[0.2em] text-nxt-dim">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-nxt-secondary">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="slide-up" style={{ animationDelay: '0.24s' }}>
              <div className="rounded-[28px] border border-[rgba(138,160,255,0.16)] bg-[linear-gradient(180deg,rgba(18,24,41,0.96),rgba(10,13,24,0.96))] p-5 shadow-[0_24px_80px_rgba(1,5,16,0.42)] backdrop-blur">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="section-kicker">At a glance</p>
                    <h2 className="mt-2 text-xl font-semibold text-nxt-text">What this platform does</h2>
                  </div>
                  <div className="rounded-full border border-[rgba(88,113,255,0.16)] bg-[rgba(88,113,255,0.08)] px-2.5 py-1 text-[11px] font-mono text-nxt-accent">
                    {stats ? `${stats.today} recent` : 'Live'}
                  </div>
                </div>

                <div className="space-y-3">
                  {WORKFLOW_STEPS.map((step, index) => (
                    <div key={step.title} className="rounded-2xl border border-[rgba(138,160,255,0.12)] bg-[rgba(20,27,46,0.78)] p-4">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-nxt-accent/15 text-xs font-mono text-nxt-accent">
                          0{index + 1}
                        </div>
                        <h3 className="text-sm font-semibold text-nxt-text">{step.title}</h3>
                      </div>
                      <p className="text-sm leading-6 text-nxt-secondary">{step.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[rgba(138,160,255,0.12)] bg-[rgba(20,27,46,0.78)] p-4">
                    <div className="text-2xl font-mono font-bold text-nxt-text">{stats ? stats.total.toLocaleString() : '---'}</div>
                    <div className="mt-1 text-xs text-nxt-muted">Signals tracked</div>
                  </div>
                  <div className="rounded-2xl border border-[rgba(39,209,127,0.18)] bg-[rgba(12,30,23,0.72)] p-4">
                    <div className="text-2xl font-mono font-bold text-nxt-green">24/7</div>
                    <div className="mt-1 text-xs text-nxt-muted">Continuous monitoring</div>
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
                {signals.map((s) => {
                  const typeInfo = SIGNAL_TYPE_LABELS[s.signal_type] || { label: s.signal_type, color: '#6b6b76' };
                  return (
                    <div key={s.id} className="flex shrink-0 items-center gap-3">
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                        style={{ background: `${typeInfo.color}18`, color: typeInfo.color }}
                      >
                        {typeInfo.label}
                      </span>
                      <span className="max-w-[280px] truncate whitespace-nowrap text-xs text-nxt-secondary">{s.title}</span>
                      <span className="text-[10px] font-mono text-nxt-dim">{timeAgo(s.discovered_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1100px] px-6 py-16">
        <div className="mb-8">
          <p className="section-kicker">Core views</p>
          <h2 className="mt-2 text-2xl font-semibold text-nxt-text">Start in one place, then go deeper</h2>
          <p className="mt-2 max-w-[720px] text-sm leading-6 text-nxt-secondary">
            The platform is strongest when it guides you from the high-level picture into the exact signals,
            vendors, products, and events behind the story.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_CARDS.map((card, i) => (
            <Link
              key={card.href}
              href={card.href}
              className="card-hover slide-up group rounded-nxt-md border border-nxt-border bg-nxt-surface p-5"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-nxt-border bg-nxt-card text-nxt-accent transition-colors group-hover:text-nxt-accent-light">
                  {card.icon}
                </div>
                <h3 className="text-sm font-semibold text-nxt-text">{card.title}</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-nxt-muted transition-colors group-hover:text-nxt-secondary">
                {card.desc}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-nxt-dim transition-colors group-hover:text-nxt-accent">
                <span>Explore</span>
                <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-nxt-border bg-nxt-surface/35">
        <div className="mx-auto max-w-[1100px] px-6 py-16">
          <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Operating rhythm</p>
              <h2 className="mt-2 text-2xl font-semibold text-nxt-text">A clearer flow from noise to decision</h2>
            </div>
            <p className="max-w-[460px] text-sm leading-6 text-nxt-secondary">
              This is the screen architecture the site should keep following: first explain what changed, then show supporting evidence, then route people into the exact place to act.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[22px] border border-nxt-border bg-nxt-card/80 p-6">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-nxt-accent">01</p>
              <h3 className="mt-3 text-lg font-semibold text-nxt-text">Brief first</h3>
              <p className="mt-2 text-sm leading-6 text-nxt-secondary">
                Lead with the short narrative, not the raw data dump. New visitors need orientation before exploration.
              </p>
            </div>
            <div className="rounded-[22px] border border-nxt-border bg-nxt-card/80 p-6">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-nxt-accent">02</p>
              <h3 className="mt-3 text-lg font-semibold text-nxt-text">Evidence second</h3>
              <p className="mt-2 text-sm leading-6 text-nxt-secondary">
                Show the live stream, categories, and signal types once the user already understands the story.
              </p>
            </div>
            <div className="rounded-[22px] border border-nxt-border bg-nxt-card/80 p-6">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-nxt-accent">03</p>
              <h3 className="mt-3 text-lg font-semibold text-nxt-text">Action third</h3>
              <p className="mt-2 text-sm leading-6 text-nxt-secondary">
                From there, route into vendors, products, markets, and events without making users hunt through the site.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-nxt-border">
        <div className="mx-auto grid max-w-[1100px] gap-6 px-6 py-16 lg:grid-cols-3">
          <div className="rounded-[22px] border border-nxt-border bg-nxt-surface p-6">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-nxt-dim">Better first step</p>
            <h3 className="mt-3 text-lg font-semibold text-nxt-text">Begin with the briefing</h3>
            <p className="mt-2 text-sm leading-6 text-nxt-secondary">
              If you are new to the platform, the briefing gives you the shortest path to understanding what matters now.
            </p>
          </div>
          <div className="rounded-[22px] border border-nxt-border bg-nxt-surface p-6">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-nxt-dim">Faster decisions</p>
            <h3 className="mt-3 text-lg font-semibold text-nxt-text">Move from signal to action</h3>
            <p className="mt-2 text-sm leading-6 text-nxt-secondary">
              Use the signal feed to spot movement, then jump directly into vendors, products, and regional context.
            </p>
          </div>
          <div className="rounded-[22px] border border-nxt-border bg-nxt-surface p-6">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-nxt-dim">Less noise</p>
            <h3 className="mt-3 text-lg font-semibold text-nxt-text">One place for scattered information</h3>
            <p className="mt-2 text-sm leading-6 text-nxt-secondary">
              Public data, market movement, and ecosystem intelligence are easier to follow when they share one operating view.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-nxt-border">
        <div className="mx-auto max-w-[1000px] px-6 py-12">
          <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
            <div>
              <div className="text-2xl font-mono font-bold text-nxt-text">{stats ? stats.total.toLocaleString() : '---'}</div>
              <div className="mt-1 text-xs text-nxt-muted">Signals tracked</div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-nxt-text">6</div>
              <div className="mt-1 text-xs text-nxt-muted">Signal types</div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-nxt-text">24/7</div>
              <div className="mt-1 text-xs text-nxt-muted">AI monitoring</div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-nxt-green">LIVE</div>
              <div className="mt-1 text-xs text-nxt-muted">System status</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-nxt-border">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between px-6 py-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-nxt-accent">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-sm font-grotesk font-semibold text-nxt-muted">
              NXT<span className="mx-0.5 text-nxt-dim">{'//'}</span>LINK
            </span>
          </div>
          <span className="text-xs font-mono text-nxt-dim">Supply Chain Intelligence</span>
        </div>
      </footer>
    </div>
  );
}
