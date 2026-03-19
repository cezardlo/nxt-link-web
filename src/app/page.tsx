'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ORANGE = '#ff6600';
const CYAN = '#00d4ff';
const GREEN = '#00ff88';
const GOLD = '#ffd700';
const RED = '#ff3b30';
const FONT = "'JetBrains Mono', 'Courier New', monospace";

// ─── Types ────────────────────────────────────────────────────────────────────
type Signal = {
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance_score: number;
  discovered_at: string;
  url?: string | null;
};

type WhatChanged = {
  new_companies?: number;
  new_signals?: number;
  new_connections?: number;
  funding_total?: string;
  needs_attention?: string[];
  top_signals?: Signal[];
};

type AgentRun = {
  id: string;
  agent_name?: string;
  status?: string;
  signals_found?: number;
  entities_found?: number;
  started_at?: string;
};

type DecisionCard = {
  type: 'CALL_SOMEONE' | 'WATCH_THIS' | 'ACT_BEFORE_DATE' | 'KEEP_WATCHING';
  headline: string;
  detail: string;
  vendor_name?: string;
  timeline?: string;
  trigger?: string;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useStreak(): number {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nxt_streak');
      const data = raw ? JSON.parse(raw) : null;
      const today = new Date().toDateString();
      if (data?.lastDate === today) {
        setStreak(data.count ?? 1);
      } else if (data?.lastDate === new Date(Date.now() - 86400000).toDateString()) {
        const newCount = (data.count ?? 0) + 1;
        localStorage.setItem('nxt_streak', JSON.stringify({ lastDate: today, count: newCount }));
        setStreak(newCount);
      } else {
        localStorage.setItem('nxt_streak', JSON.stringify({ lastDate: today, count: 1 }));
        setStreak(1);
      }
    } catch { setStreak(1); }
  }, []);
  return streak;
}

function useLastSession(): string | null {
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => {
    try { setLast(localStorage.getItem('nxt_last_query')); } catch { /* */ }
  }, []);
  return last;
}

function priorityOf(s: Signal): string {
  if (s.importance_score >= 0.85) return 'P0';
  if (s.importance_score >= 0.65) return 'P1';
  if (s.importance_score >= 0.40) return 'P2';
  return 'P3';
}

function priorityColor(p: string): string {
  return p === 'P0' ? RED : p === 'P1' ? ORANGE : p === 'P2' ? GOLD : CYAN;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  return `${m}m ago`;
}

// ─── Components ───────────────────────────────────────────────────────────────

function NavBar({ active }: { active: string }) {
  const tabs = [
    { label: 'TODAY', href: '/' },
    { label: 'EXPLORE', href: '/explore' },
    { label: 'WORLD', href: '/world' },
    { label: 'FOLLOW', href: '/following' },
    { label: 'STORE', href: '/store' },
    { label: 'DOSSIER', href: '/dossier' },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 48,
      background: '#0a0a0a', borderTop: `1px solid rgba(255,102,0,0.15)`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      fontFamily: FONT, zIndex: 100,
    }}>
      {tabs.map(t => (
        <Link key={t.label} href={t.href} style={{
          color: active === t.label ? ORANGE : 'rgba(255,255,255,0.3)',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          textDecoration: 'none', padding: '8px 12px',
          borderTop: active === t.label ? `2px solid ${ORANGE}` : '2px solid transparent',
        }}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

function DecisionBlock({ decision }: { decision: DecisionCard }) {
  const icons: Record<string, string> = {
    CALL_SOMEONE: '📞',
    WATCH_THIS: '👁',
    ACT_BEFORE_DATE: '⚡',
    KEEP_WATCHING: '📡',
  };
  return (
    <div style={{
      background: '#0d0d0d', border: `1px solid ${ORANGE}33`,
      borderLeft: `3px solid ${ORANGE}`, borderRadius: 4, padding: 16, marginBottom: 16,
    }}>
      <div style={{ fontSize: 9, color: ORANGE, letterSpacing: '0.15em', marginBottom: 6 }}>
        {icons[decision.type]} ONE THING TO DO TODAY
      </div>
      <div style={{ fontSize: 16, color: '#fff', fontWeight: 700, marginBottom: 6 }}>
        {decision.headline}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
        {decision.detail}
      </div>
      {decision.vendor_name && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <button style={{
            background: ORANGE, color: '#000', border: 'none',
            padding: '6px 14px', borderRadius: 2, fontSize: 11, fontWeight: 700,
            fontFamily: FONT, cursor: 'pointer', letterSpacing: '0.05em',
          }}>
            REQUEST INTRO
          </button>
          <button style={{
            background: 'transparent', color: ORANGE, border: `1px solid ${ORANGE}44`,
            padding: '6px 14px', borderRadius: 2, fontSize: 11, fontFamily: FONT, cursor: 'pointer',
          }}>
            REMIND ME LATER
          </button>
        </div>
      )}
      {decision.trigger && (
        <div style={{ marginTop: 8, fontSize: 10, color: CYAN, opacity: 0.7 }}>
          Trigger: {decision.trigger}
        </div>
      )}
    </div>
  );
}

function SignalRow({ signal, onClick }: { signal: Signal; onClick: () => void }) {
  const p = priorityOf(signal);
  return (
    <button onClick={onClick} style={{
      width: '100%', background: '#0d0d0d', border: `1px solid rgba(255,102,0,0.08)`,
      borderRadius: 4, padding: '10px 12px', marginBottom: 6, cursor: 'pointer',
      display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
      fontFamily: FONT,
    }}>
      <span style={{
        fontSize: 9, fontWeight: 700, color: priorityColor(p),
        background: `${priorityColor(p)}18`, padding: '2px 6px', borderRadius: 2,
        minWidth: 28, textAlign: 'center', marginTop: 2, flexShrink: 0,
      }}>
        {p}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#e0e0e0', lineHeight: 1.4, marginBottom: 2 }}>
          {signal.title.length > 90 ? signal.title.slice(0, 90) + '…' : signal.title}
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', display: 'flex', gap: 8 }}>
          <span style={{ color: CYAN }}>{signal.industry.toUpperCase()}</span>
          {signal.company && <span>{signal.company}</span>}
          <span>{timeAgo(signal.discovered_at)}</span>
        </div>
      </div>
      <span style={{ fontSize: 9, color: ORANGE, flexShrink: 0 }}>DRILL DOWN →</span>
    </button>
  );
}

function WhileYouSlept({ changed, agentRuns }: { changed: WhatChanged; agentRuns: AgentRun[] }) {
  const items = [
    changed.new_companies && changed.new_companies > 0
      ? { icon: '✦', label: `${changed.new_companies} new companies appeared`, color: GOLD }
      : null,
    changed.new_signals && changed.new_signals > 0
      ? { icon: '⚡', label: `${changed.new_signals} new signals detected`, color: CYAN }
      : null,
    changed.new_connections && changed.new_connections > 0
      ? { icon: '🔗', label: `${changed.new_connections} new connections formed`, color: GREEN }
      : null,
    changed.funding_total
      ? { icon: '💰', label: `${changed.funding_total} in funding tracked`, color: GREEN }
      : null,
    changed.needs_attention && changed.needs_attention.length > 0
      ? { icon: '🔴', label: `${changed.needs_attention.length} things need attention`, color: RED }
      : null,
    agentRuns.length > 0
      ? { icon: '🤖', label: `${agentRuns.length} agent tasks ran overnight`, color: 'rgba(255,255,255,0.4)' }
      : null,
  ].filter(Boolean) as Array<{ icon: string; label: string; color: string }>;

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: 8 }}>
        WHILE YOU WERE SLEEPING
      </div>
      <div style={{
        background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 4, padding: '10px 14px',
      }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < items.length - 1 ? 6 : 0 }}>
            <span>{item.icon}</span>
            <span style={{ fontSize: 11, color: item.color }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const router = useRouter();
  const now = useClock();
  const streak = useStreak();
  const lastQuery = useLastSession();

  const [signals, setSignals] = useState<Signal[]>([]);
  const [changed, setChanged] = useState<WhatChanged>({});
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [decision, setDecision] = useState<DecisionCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sigRes, changedRes, runsRes] = await Promise.allSettled([
        fetch('/api/intel-signals?limit=20').then(r => r.json()),
        fetch('/api/what-changed').then(r => r.json()),
        fetch('/api/agents/runs').then(r => r.json()),
      ]);

      let rawSignals: Signal[] = [];
      if (sigRes.status === 'fulfilled') {
        rawSignals = (sigRes.value?.signals ?? []).slice(0, 10);
        setSignals(rawSignals);
      }

      if (changedRes.status === 'fulfilled') {
        const d = changedRes.value;
        setChanged({
          new_companies: d?.companies_discovered ?? d?.new_companies ?? 0,
          new_signals: d?.signals_today ?? d?.new_signals ?? rawSignals.length,
          new_connections: d?.connections_formed ?? d?.new_connections ?? 0,
          funding_total: d?.funding_total ?? null,
          needs_attention: d?.alerts ?? d?.needs_attention ?? [],
          top_signals: d?.top_signals ?? rawSignals.slice(0, 3),
        });
      }

      if (runsRes.status === 'fulfilled') {
        const runs = (runsRes.value?.runs ?? runsRes.value ?? []).slice(0, 5);
        setAgentRuns(runs);
      }

      // Build decision from top signal
      if (rawSignals.length > 0) {
        const top = rawSignals[0];
        if (top.signal_type === 'regulatory_action') {
          setDecision({ type: 'ACT_BEFORE_DATE', headline: 'A regulation is changing — act within 90 days', detail: top.title.slice(0, 120), timeline: '90 days' });
        } else if (top.importance_score >= 0.85) {
          setDecision({ type: 'WATCH_THIS', headline: `Watch ${top.industry} — urgent signal today`, detail: top.title.slice(0, 120), timeline: '72 hours' });
        } else {
          setDecision({ type: 'KEEP_WATCHING', headline: `Track ${top.industry} activity this week`, detail: `${rawSignals.length} signals active. Most important: ${top.title.slice(0, 80)}`, trigger: 'Contract award or funding round >$50M' });
        }
      } else {
        setDecision({ type: 'KEEP_WATCHING', headline: 'Intelligence pipeline warming up', detail: 'Agents are running. Check back in 10 minutes for fresh signals.', trigger: 'New signals detected' });
      }
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDrillDown = (signal: Signal) => {
    try { localStorage.setItem('nxt_drill_signal', JSON.stringify(signal)); } catch { /* */ }
    router.push('/intel?tab=drilldown');
  };

  const handleSurpriseMe = () => {
    const r = signals[Math.floor(Math.random() * signals.length)];
    if (r) router.push(`/explore?seed=${encodeURIComponent(r.industry)}`);
  };

  const topThree = signals.filter(s => s.importance_score >= 0.65).slice(0, 3);
  const rest = signals.filter(s => !topThree.includes(s)).slice(0, 5);

  const timeStr = now?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) ?? '--:--';
  const dateStr = now?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) ?? '';

  return (
    <div style={{
      minHeight: '100vh', background: '#000', fontFamily: FONT,
      color: '#fff', paddingBottom: 60,
    }}>

      {/* Header */}
      <div style={{
        padding: '12px 16px 0', borderBottom: `1px solid rgba(255,102,0,0.1)`,
        background: '#060606',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: ORANGE, letterSpacing: '0.05em' }}>
              NXT<span style={{ color: 'rgba(255,102,0,0.3)' }}>//</span>LINK
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              {greeting}, Cessar
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, color: CYAN, fontVariantNumeric: 'tabular-nums' }}>{timeStr}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{dateStr}</div>
          </div>
        </div>
        {/* Streak */}
        {streak > 0 && (
          <div style={{ paddingBottom: 10, paddingTop: 6 }}>
            <span style={{ fontSize: 10, color: GOLD }}>
              🔥 Day {streak} streak — you've opened NXT LINK {streak} day{streak > 1 ? 's' : ''} in a row
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 16px' }}>

        {/* Decision card */}
        {decision && <DecisionBlock decision={decision} />}

        {/* While you were sleeping */}
        <WhileYouSlept changed={changed} agentRuns={agentRuns} />

        {/* Top 3 signals */}
        {topThree.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: 8 }}>
              TOP 3 RIGHT NOW
            </div>
            {topThree.map((s, i) => (
              <SignalRow key={i} signal={s} onClick={() => handleDrillDown(s)} />
            ))}
          </div>
        )}

        {/* Continue where left off */}
        {lastQuery && (
          <Link href={`/ask?q=${encodeURIComponent(lastQuery)}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
            <div style={{
              background: '#0d0d0d', border: `1px solid ${CYAN}22`,
              borderRadius: 4, padding: '10px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>CONTINUE WHERE YOU LEFT OFF</div>
                <div style={{ fontSize: 12, color: CYAN }}>"{lastQuery}"</div>
              </div>
              <span style={{ color: CYAN, fontSize: 14 }}>→</span>
            </div>
          </Link>
        )}

        {/* More signals */}
        {rest.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: 8 }}>
              MORE SIGNALS
            </div>
            {rest.map((s, i) => (
              <SignalRow key={i} signal={s} onClick={() => handleDrillDown(s)} />
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && signals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
            Loading intelligence…
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <Link href="/explore" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'transparent', border: `1px solid ${ORANGE}44`, color: ORANGE,
              padding: '8px 14px', borderRadius: 2, fontSize: 10, fontFamily: FONT,
              cursor: 'pointer', letterSpacing: '0.1em',
            }}>
              EXPLORE TREE →
            </button>
          </Link>
          <button onClick={handleSurpriseMe} style={{
            background: 'transparent', border: `1px solid rgba(255,255,255,0.1)`,
            color: 'rgba(255,255,255,0.4)', padding: '8px 14px', borderRadius: 2,
            fontSize: 10, fontFamily: FONT, cursor: 'pointer', letterSpacing: '0.1em',
          }}>
            SURPRISE ME ✦
          </button>
          <Link href="/store" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'transparent', border: `1px solid ${CYAN}22`, color: CYAN,
              padding: '8px 14px', borderRadius: 2, fontSize: 10, fontFamily: FONT,
              cursor: 'pointer', letterSpacing: '0.1em',
            }}>
              TECH STORE
            </button>
          </Link>
        </div>
      </div>

      <NavBar active="TODAY" />
    </div>
  );
}
