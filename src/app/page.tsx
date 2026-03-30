'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/* --- Live signal ticker data --- */
interface TickerSignal {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  discovered_at: string;
}

const SIGNAL_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  contract_award:   { label: 'Contract',    color: '#22c55e' },
  funding_round:    { label: 'Funding',     color: '#a855f7' },
  patent_filing:    { label: 'Patent',      color: '#06b6d4' },
  partnership:      { label: 'Partnership', color: '#f59e0b' },
  product_launch:   { label: 'Launch',      color: '#f97316' },
  regulation:       { label: 'Regulation',  color: '#ef4444' },
  market_expansion: { label: 'Expansion',   color: '#10b981' },
};

const NAV_CARDS = [
  {
    href: '/briefing',
    title: 'Daily Briefing',
    desc: 'Top insights, regional risk, and trend detection — updated every cycle.',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/intel',
    title: 'Signal Feed',
    desc: 'Real-time intelligence signals across contracts, funding, patents, and more.',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
        <circle cx={12} cy={12} r={2} /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
      </svg>
    ),
  },
  {
    href: '/vendors',
    title: 'Vendor Directory',
    desc: 'Discover logistics and supply chain vendors — enriched profiles and scoring.',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20" /><path d="M5 20V8l5 4V8l5 4V4h3v16" />
      </svg>
    ),
  },
  {
    href: '/map',
    title: 'Global Map',
    desc: 'Geographic signal density and vendor clustering across trade regions.',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={12} cy={12} r={10} /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
      </svg>
    ),
  },
  {
    href: '/conferences',
    title: 'Events',
    desc: 'Industry conferences and trade events — hot zones and opportunity mapping.',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x={3} y={4} width={18} height={18} rx={2} /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
      </svg>
    ),
  },
  {
    href: '/products',
    title: 'Products',
    desc: 'Technology and product catalog — compare solutions across the supply chain.',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1={12} y1={22.08} x2={12} y2={12} />
      </svg>
    ),
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
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-nxt-bg" />

        <div className="relative max-w-[1000px] mx-auto px-6 pt-24 pb-16 text-center">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-nxt-surface border border-nxt-border mb-8 slide-up">
            <div className="w-1.5 h-1.5 rounded-full bg-nxt-green live-pulse" />
            <span className="text-xs font-mono text-nxt-muted tracking-wide">
              {stats ? `${stats.total.toLocaleString()} SIGNALS TRACKED` : 'MONITORING'}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-grotesk font-bold text-nxt-text leading-tight mb-5 slide-up" style={{ animationDelay: '0.06s' }}>
            Supply Chain Intelligence
            <br />
            <span className="gradient-text">for Trucking &amp; Logistics</span>
          </h1>

          <p className="text-lg text-nxt-secondary max-w-[560px] mx-auto mb-10 slide-up" style={{ animationDelay: '0.12s' }}>
            Real-time signals, vendor discovery, and market intelligence — powered by AI agents that never sleep.
          </p>

          <div className="flex items-center justify-center gap-3 slide-up" style={{ animationDelay: '0.18s' }}>
            <Link
              href="/briefing"
              className="px-5 py-2.5 rounded-lg bg-nxt-accent text-white text-sm font-semibold hover:brightness-110 transition-all"
            >
              Open Briefing
            </Link>
            <Link
              href="/intel"
              className="px-5 py-2.5 rounded-lg bg-nxt-surface border border-nxt-border text-nxt-secondary text-sm font-medium hover:text-nxt-text hover:border-nxt-muted transition-all"
            >
              View Signals
            </Link>
          </div>
        </div>
      </section>

      {/* Live Signal Ticker */}
      {signals.length > 0 && (
        <section className="border-y border-nxt-border bg-nxt-surface/50 overflow-hidden">
          <div className="flex items-center">
            <div className="shrink-0 px-4 py-3 border-r border-nxt-border bg-nxt-card">
              <span className="text-[10px] font-mono font-semibold text-nxt-accent tracking-widest uppercase">LIVE</span>
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center gap-8 px-4 py-3 feed-scroll">
                {signals.map((s) => {
                  const typeInfo = SIGNAL_TYPE_LABELS[s.signal_type] || { label: s.signal_type, color: '#6b6b76' };
                  return (
                    <div key={s.id} className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: typeInfo.color + '18', color: typeInfo.color }}
                      >
                        {typeInfo.label}
                      </span>
                      <span className="text-xs text-nxt-secondary whitespace-nowrap max-w-[280px] truncate">{s.title}</span>
                      <span className="text-[10px] font-mono text-nxt-dim">{timeAgo(s.discovered_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Navigation Cards */}
      <section className="max-w-[1000px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {NAV_CARDS.map((card, i) => (
            <Link
              key={card.href}
              href={card.href}
              className="group p-5 rounded-nxt-md bg-nxt-surface border border-nxt-border card-hover slide-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-nxt-card border border-nxt-border flex items-center justify-center text-nxt-accent group-hover:text-nxt-accent-light transition-colors">
                  {card.icon}
                </div>
                <h3 className="text-sm font-semibold text-nxt-text">{card.title}</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-nxt-muted group-hover:text-nxt-secondary transition-colors">
                {card.desc}
              </p>
              <div className="flex items-center gap-1.5 mt-4 text-xs text-nxt-dim group-hover:text-nxt-accent transition-colors">
                <span>Explore</span>
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-t border-nxt-border">
        <div className="max-w-[1000px] mx-auto px-6 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold font-mono text-nxt-text">{stats ? stats.total.toLocaleString() : '---'}</div>
              <div className="text-xs text-nxt-muted mt-1">Signals Tracked</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-nxt-text">6</div>
              <div className="text-xs text-nxt-muted mt-1">Signal Types</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-nxt-text">24/7</div>
              <div className="text-xs text-nxt-muted mt-1">AI Monitoring</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-nxt-green">LIVE</div>
              <div className="text-xs text-nxt-muted mt-1">System Status</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-nxt-border">
        <div className="max-w-[1000px] mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-nxt-accent flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-sm font-grotesk font-semibold text-nxt-muted">
              NXT<span className="text-nxt-dim mx-0.5">{'//'}</span>LINK
            </span>
          </div>
          <span className="text-xs text-nxt-dim font-mono">Supply Chain Intelligence</span>
        </div>
      </footer>
    </div>
  );
}
