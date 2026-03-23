'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BottomNav, TopBar } from '@/components/ui';
import { COLORS } from '@/lib/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChangeType = 'NEEDS_ATTENTION' | 'UPDATE' | 'QUIET';

interface FollowItem {
  id: string;
  type: 'industry' | 'company' | 'technology';
  label: string;
  followedAt: string;
}

interface DisplayFollow {
  id: string;
  type: 'industry' | 'company' | 'technology';
  label: string;
  lastChange: string;
  changeType: ChangeType;
  summary: string;
  action?: string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_FOLLOWS: DisplayFollow[] = [
  { id: 'defense-ai', type: 'industry', label: 'Defense AI', lastChange: '2h ago', changeType: 'NEEDS_ATTENTION', summary: 'New $1.5B contract awarded at Fort Bliss — your attention needed', action: 'View Signal' },
  { id: 'booz-allen', type: 'company', label: 'Booz Allen Hamilton', lastChange: '6h ago', changeType: 'UPDATE', summary: 'Two new contracts detected this week. IKER score unchanged at 84.' },
  { id: 'cybersecurity', type: 'industry', label: 'Cybersecurity', lastChange: '1d ago', changeType: 'UPDATE', summary: 'Google completed $32B Wiz acquisition. Market consolidating fast.' },
  { id: 'el-paso-electric', type: 'company', label: 'El Paso Electric', lastChange: '3d ago', changeType: 'QUIET', summary: 'No significant changes in the past 72 hours.' },
  { id: 'border-tech', type: 'industry', label: 'Border Tech', lastChange: '5d ago', changeType: 'QUIET', summary: 'Steady. No new contracts or funding rounds detected.' },
];

const SUGGESTED = [
  { id: 'defense-ai', type: 'industry' as const, label: 'Defense AI', hint: 'High signal velocity' },
  { id: 'booz-allen', type: 'company' as const, label: 'Booz Allen Hamilton', hint: 'Active in El Paso' },
  { id: 'border-tech', type: 'industry' as const, label: 'Border Tech', hint: 'Trending contracts' },
];

const LS_KEY = 'nxt_follows';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadFollows(): FollowItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as FollowItem[]) : [];
  } catch { return []; }
}

function saveFollows(items: FollowItem[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

function typeColor(type: DisplayFollow['type']): string {
  if (type === 'industry') return COLORS.cyan;
  if (type === 'company') return COLORS.gold;
  return COLORS.green;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FollowCard({ item, onUnfollow }: { item: DisplayFollow; onUnfollow: (id: string) => void }) {
  const isAttention = item.changeType === 'NEEDS_ATTENTION';
  const isUpdate = item.changeType === 'UPDATE';
  const isQuiet = item.changeType === 'QUIET';

  return (
    <div
      className={`rounded-[22px] p-5 mb-4 border transition-all ${isQuiet ? 'opacity-60' : ''} ${isAttention ? 'critical-pulse' : ''}`}
      style={{
        background: COLORS.card,
        borderColor: isAttention ? `${COLORS.red}40` : isUpdate ? `${COLORS.gold}25` : COLORS.border,
        boxShadow: isAttention ? `0 0 24px ${COLORS.red}10` : 'none',
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full"
            style={{ color: typeColor(item.type), background: `${typeColor(item.type)}12`, border: `1px solid ${typeColor(item.type)}25` }}
          >
            {item.type}
          </span>
          <span className={`font-grotesk text-[14px] font-semibold ${isQuiet ? 'text-white/40' : 'text-white/90'}`}>
            {item.label}
          </span>
        </div>
        <span className="font-mono text-[10px]" style={{ color: COLORS.dim }}>{item.lastChange}</span>
      </div>

      {/* Summary */}
      <p className={`text-[13px] leading-relaxed mb-4 ${isQuiet ? 'text-white/30' : 'text-white/55'}`}>
        {item.summary}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div>
          {isAttention && (
            <span className="font-mono text-[10px] tracking-[0.15em] font-bold" style={{ color: COLORS.red }}>
              ▲ HIGH IMPACT
            </span>
          )}
          {isUpdate && (
            <span className="font-mono text-[10px] tracking-[0.15em]" style={{ color: COLORS.gold }}>
              ● CHANGED
            </span>
          )}
          {isQuiet && (
            <span className="font-mono text-[10px] tracking-[0.15em]" style={{ color: COLORS.dim }}>
              — NO CHANGE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {item.action && isAttention && (
            <button
              className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase px-4 py-2 rounded-full transition-colors min-h-[36px]"
              style={{
                color: COLORS.red,
                border: `1px solid ${COLORS.red}50`,
                background: `${COLORS.red}08`,
              }}
            >
              {item.action.toUpperCase()}
            </button>
          )}
          <button
            onClick={() => onUnfollow(item.id)}
            className="font-mono text-[10px] tracking-[0.1em] hover:text-white/30 transition-colors px-3 py-2 min-w-[44px] min-h-[36px] rounded-full"
            style={{ color: COLORS.dim }}
          >
            UNFOLLOW
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mt-8 mb-4">
      <span className="font-mono text-[10px] font-bold tracking-[0.2em]" style={{ color }}>{label}</span>
      <span className="font-mono text-[10px]" style={{ color: COLORS.dim }}>({count})</span>
      <div className="flex-1 h-px" style={{ background: `${color}18` }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FollowingPage() {
  const [follows, setFollows] = useState<FollowItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setFollows(loadFollows());
    setMounted(true);
  }, []);

  const hasRealFollows = follows.length > 0;

  const displayItems: DisplayFollow[] = hasRealFollows
    ? follows.map((f) => {
        const demo = DEMO_FOLLOWS.find((d) => d.id === f.id);
        if (demo) return demo;
        return { id: f.id, type: f.type, label: f.label, lastChange: 'recently', changeType: 'QUIET' as ChangeType, summary: 'No significant changes detected since you started following.' };
      })
    : DEMO_FOLLOWS;

  const attentionItems = displayItems.filter((d) => d.changeType === 'NEEDS_ATTENTION');
  const updateItems = displayItems.filter((d) => d.changeType === 'UPDATE');
  const quietItems = displayItems.filter((d) => d.changeType === 'QUIET');

  function handleUnfollow(id: string) {
    if (!hasRealFollows) return;
    const updated = follows.filter((f) => f.id !== id);
    setFollows(updated);
    saveFollows(updated);
  }

  function handleSuggestedFollow(item: typeof SUGGESTED[number]) {
    if (follows.find((f) => f.id === item.id)) return;
    const updated = [...follows, { id: item.id, type: item.type, label: item.label, followedAt: new Date().toISOString() }];
    setFollows(updated);
    saveFollows(updated);
  }

  const isFollowing = (id: string) => follows.some((f) => f.id === id);

  if (!mounted) {
    return (
      <div className="min-h-screen font-mono text-white flex flex-col" style={{ background: COLORS.bg }}>
        <TopBar />
        <div className="px-6 pt-8 pb-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <div className="h-6 w-32 rounded animate-pulse" style={{ background: COLORS.surface }} />
          <div className="h-3 w-48 rounded animate-pulse mt-3" style={{ background: COLORS.surface }} />
        </div>
        <div className="flex-1 px-5 pt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-[22px] animate-pulse" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }} />
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-mono text-white flex flex-col animate-fade-up" style={{ background: COLORS.bg }}>
      <TopBar />

      {/* Header */}
      <div className="px-6 pt-8 pb-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="flex items-baseline gap-3">
          <h1 className="font-grotesk text-[22px] font-bold tracking-tight" style={{ color: COLORS.accent }}>
            Following
          </h1>
          {!hasRealFollows && (
            <span
              className="font-mono text-[9px] tracking-[0.15em] px-2.5 py-1 rounded-full"
              style={{ color: COLORS.muted, border: `1px solid ${COLORS.border}`, background: `${COLORS.dim}15` }}
            >
              SAMPLE DATA
            </span>
          )}
        </div>
        <p className="font-mono text-[11px] tracking-[0.08em] mt-2" style={{ color: COLORS.muted }}>
          Only what changed since your last visit
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-24">
        {/* Demo notice */}
        {!hasRealFollows && (
          <div
            className="mt-6 mb-2 p-5 rounded-[20px]"
            style={{ background: `${COLORS.accent}06`, border: `1px solid ${COLORS.accent}18` }}
          >
            <p className="font-grotesk text-[13px] font-semibold" style={{ color: COLORS.accent }}>
              You&apos;re not following anything yet.
            </p>
            <p className="text-[12px] leading-relaxed mt-2" style={{ color: COLORS.muted }}>
              Visit{' '}
              <Link href="/explore" className="underline underline-offset-2 font-semibold transition-colors hover:opacity-80" style={{ color: COLORS.accent }}>
                Explore
              </Link>{' '}
              or an Industry page to start following topics.
              Showing sample data below.
            </p>
          </div>
        )}

        {attentionItems.length > 0 && (
          <>
            <SectionLabel label="NEEDS ATTENTION" count={attentionItems.length} color={COLORS.red} />
            {attentionItems.map((item) => <FollowCard key={item.id} item={item} onUnfollow={handleUnfollow} />)}
          </>
        )}

        {updateItems.length > 0 && (
          <>
            <SectionLabel label="UPDATES" count={updateItems.length} color={COLORS.gold} />
            {updateItems.map((item) => <FollowCard key={item.id} item={item} onUnfollow={handleUnfollow} />)}
          </>
        )}

        {quietItems.length > 0 && (
          <>
            <SectionLabel label="QUIET" count={quietItems.length} color={COLORS.dim} />
            {quietItems.map((item) => <FollowCard key={item.id} item={item} onUnfollow={handleUnfollow} />)}
          </>
        )}

        {hasRealFollows && displayItems.length === 0 && (
          <div className="text-center mt-20">
            <p className="font-grotesk text-[16px] font-semibold tracking-wide" style={{ color: COLORS.dim }}>
              You&apos;re not following anything yet.
            </p>
            <p className="font-mono text-[11px] mt-3 leading-relaxed" style={{ color: COLORS.muted }}>
              Visit{' '}
              <Link href="/explore" className="underline underline-offset-2 transition-colors hover:opacity-80" style={{ color: COLORS.accent }}>
                Explore
              </Link>{' '}
              or an Industry page to start following topics.
            </p>
          </div>
        )}

        {/* Suggested */}
        <div className="mt-10 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <span className="font-mono text-[10px] font-bold tracking-[0.2em]" style={{ color: COLORS.gold }}>
              SUGGESTED TO FOLLOW
            </span>
            <div className="flex-1 h-px" style={{ background: `${COLORS.gold}15` }} />
          </div>

          <div className="flex flex-col gap-3">
            {SUGGESTED.map((s) => {
              const followed = isFollowing(s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-5 rounded-[22px] border transition-all"
                  style={{ borderColor: COLORS.border, background: COLORS.card }}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className="font-mono text-[9px] tracking-[0.12em] uppercase px-2.5 py-1 rounded-full"
                        style={{ color: typeColor(s.type), border: `1px solid ${typeColor(s.type)}25`, background: `${typeColor(s.type)}10` }}
                      >
                        {s.type}
                      </span>
                      <span className="font-grotesk text-[13px] font-semibold text-white/90">{s.label}</span>
                    </div>
                    <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.muted }}>{s.hint}</p>
                  </div>
                  <button
                    onClick={() => handleSuggestedFollow(s)}
                    disabled={followed}
                    className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase px-5 py-2.5 rounded-full transition-all min-h-[36px]"
                    style={{
                      color: followed ? COLORS.dim : COLORS.accent,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: followed ? 'transparent' : `${COLORS.accent}40`,
                      background: followed ? 'transparent' : `${COLORS.accent}08`,
                      opacity: followed ? 0.5 : 1,
                      cursor: followed ? 'default' : 'pointer',
                    }}
                  >
                    {followed ? 'FOLLOWING' : '+ FOLLOW'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
