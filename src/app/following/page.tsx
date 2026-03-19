'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  {
    id: 'defense-ai',
    type: 'industry',
    label: 'Defense AI',
    lastChange: '2h ago',
    changeType: 'NEEDS_ATTENTION',
    summary: 'New $1.5B contract awarded at Fort Bliss — your attention needed',
    action: 'View Signal',
  },
  {
    id: 'booz-allen',
    type: 'company',
    label: 'Booz Allen Hamilton',
    lastChange: '6h ago',
    changeType: 'UPDATE',
    summary: 'Two new contracts detected this week. IKER score unchanged at 84.',
  },
  {
    id: 'cybersecurity',
    type: 'industry',
    label: 'Cybersecurity',
    lastChange: '1d ago',
    changeType: 'UPDATE',
    summary: 'Google completed $32B Wiz acquisition. Market consolidating fast.',
  },
  {
    id: 'el-paso-electric',
    type: 'company',
    label: 'El Paso Electric',
    lastChange: '3d ago',
    changeType: 'QUIET',
    summary: 'No significant changes in the past 72 hours.',
  },
  {
    id: 'border-tech',
    type: 'industry',
    label: 'Border Tech',
    lastChange: '5d ago',
    changeType: 'QUIET',
    summary: 'Steady. No new contracts or funding rounds detected.',
  },
];

const SUGGESTED: { id: string; type: 'industry' | 'company' | 'technology'; label: string; hint: string }[] = [
  { id: 'defense-ai',   type: 'industry', label: 'Defense AI',           hint: 'High signal velocity' },
  { id: 'booz-allen',   type: 'company',  label: 'Booz Allen Hamilton',   hint: 'Active in El Paso' },
  { id: 'border-tech',  type: 'industry', label: 'Border Tech',           hint: 'Trending contracts' },
];

const LS_KEY = 'nxt_follows';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadFollows(): FollowItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as FollowItem[]) : [];
  } catch {
    return [];
  }
}

function saveFollows(items: FollowItem[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    // storage unavailable — silently ignore
  }
}

function typeBadgeColor(type: DisplayFollow['type']): string {
  if (type === 'industry') return '#00d4ff';
  if (type === 'company')  return '#ffd700';
  return '#00ff88';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FollowCard({
  item,
  onUnfollow,
}: {
  item: DisplayFollow;
  onUnfollow: (id: string) => void;
}) {
  const isAttention = item.changeType === 'NEEDS_ATTENTION';
  const isUpdate    = item.changeType === 'UPDATE';
  const isQuiet     = item.changeType === 'QUIET';

  const borderColor = isAttention ? '#ff3b30' : isUpdate ? '#00d4ff' : '#444444';
  const textOpacity = isQuiet ? '0.55' : '1';

  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColor}`,
        borderRight: `1px solid ${isAttention ? 'rgba(255,59,48,0.25)' : isUpdate ? 'rgba(0,212,255,0.15)' : 'rgba(68,68,68,0.3)'}`,
        borderTop: `1px solid ${isAttention ? 'rgba(255,59,48,0.25)' : isUpdate ? 'rgba(0,212,255,0.15)' : 'rgba(68,68,68,0.3)'}`,
        borderBottom: `1px solid ${isAttention ? 'rgba(255,59,48,0.25)' : isUpdate ? 'rgba(0,212,255,0.15)' : 'rgba(68,68,68,0.3)'}`,
        background: isAttention
          ? 'rgba(255,59,48,0.05)'
          : isUpdate
          ? 'rgba(0,212,255,0.04)'
          : 'transparent',
        borderRadius: '2px',
        padding: '12px 14px',
        marginBottom: '8px',
        opacity: textOpacity,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Type badge */}
          <span
            style={{
              fontSize: '8px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: typeBadgeColor(item.type),
              border: `1px solid ${typeBadgeColor(item.type)}44`,
              padding: '1px 5px',
              borderRadius: '2px',
              textTransform: 'uppercase',
              background: `${typeBadgeColor(item.type)}10`,
            }}
          >
            {item.type}
          </span>
          {/* Label */}
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: isQuiet ? '#888888' : '#ffffff',
              letterSpacing: '0.05em',
            }}
          >
            {item.label}
          </span>
        </div>
        {/* Timestamp */}
        <span style={{ fontSize: '9px', color: '#555555', letterSpacing: '0.1em' }}>
          {item.lastChange}
        </span>
      </div>

      {/* Summary */}
      <p
        style={{
          fontSize: isQuiet ? '10px' : '11px',
          color: isQuiet ? '#666666' : '#aaaaaa',
          margin: '0 0 10px 0',
          lineHeight: 1.5,
          letterSpacing: '0.02em',
        }}
      >
        {item.summary}
      </p>

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Change indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isAttention && (
            <span style={{ fontSize: '9px', color: '#ff3b30', letterSpacing: '0.15em', fontWeight: 700 }}>
              ▲ HIGH IMPACT
            </span>
          )}
          {isUpdate && (
            <span style={{ fontSize: '9px', color: '#00d4ff', letterSpacing: '0.15em' }}>
              ● CHANGED
            </span>
          )}
          {isQuiet && (
            <span style={{ fontSize: '9px', color: '#444444', letterSpacing: '0.15em' }}>
              — NO CHANGE
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Action button (NEEDS_ATTENTION only) */}
          {item.action && isAttention && (
            <button
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: '#ff3b30',
                border: '1px solid rgba(255,59,48,0.5)',
                background: 'rgba(255,59,48,0.1)',
                padding: '3px 10px',
                borderRadius: '2px',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              }}
            >
              {item.action.toUpperCase()}
            </button>
          )}
          {/* Unfollow */}
          <button
            onClick={() => onUnfollow(item.id)}
            style={{
              fontSize: '9px',
              color: '#444444',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.1em',
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              padding: '3px 6px',
            }}
          >
            UNFOLLOW
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '10px',
        marginTop: '24px',
      }}
    >
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.2em',
          color,
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '9px',
          color: '#333333',
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        }}
      >
        ({count})
      </span>
      <div style={{ flex: 1, height: '1px', background: `${color}22` }} />
    </div>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { label: string; href: string; key: string }[] = [
  { label: 'TODAY',   href: '/',        key: 'today'   },
  { label: 'EXPLORE', href: '/map',     key: 'explore' },
  { label: 'WORLD',   href: '/map',     key: 'world'   },
  { label: 'FOLLOW',  href: '/following', key: 'follow'  },
  { label: 'STORE',   href: '/',        key: 'store'   },
  { label: 'DOSSIER', href: '/map',     key: 'dossier' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FollowingPage() {
  const [follows, setFollows] = useState<FollowItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setFollows(loadFollows());
    setMounted(true);
  }, []);

  // Merge real follows with DEMO_FOLLOWS for display
  // If user has no real follows, show DEMO_FOLLOWS
  // If user has real follows, show them merged with demo data for change info
  const hasRealFollows = follows.length > 0;

  const displayItems: DisplayFollow[] = hasRealFollows
    ? follows.map((f) => {
        const demo = DEMO_FOLLOWS.find((d) => d.id === f.id);
        if (demo) return demo;
        return {
          id: f.id,
          type: f.type,
          label: f.label,
          lastChange: 'recently',
          changeType: 'QUIET' as ChangeType,
          summary: 'No significant changes detected since you started following.',
        };
      })
    : DEMO_FOLLOWS;

  const attentionItems = displayItems.filter((d) => d.changeType === 'NEEDS_ATTENTION');
  const updateItems    = displayItems.filter((d) => d.changeType === 'UPDATE');
  const quietItems     = displayItems.filter((d) => d.changeType === 'QUIET');

  function handleUnfollow(id: string) {
    if (!hasRealFollows) return; // demo mode — nothing to remove
    const updated = follows.filter((f) => f.id !== id);
    setFollows(updated);
    saveFollows(updated);
  }

  function handleSuggestedFollow(item: typeof SUGGESTED[number]) {
    const existing = follows.find((f) => f.id === item.id);
    if (existing) return;
    const newFollow: FollowItem = {
      id: item.id,
      type: item.type,
      label: item.label,
      followedAt: new Date().toISOString(),
    };
    const updated = [...follows, newFollow];
    setFollows(updated);
    saveFollows(updated);
  }

  const isFollowing = (id: string) => follows.some((f) => f.id === id);

  if (!mounted) {
    return (
      <div
        style={{
          background: '#000000',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          color: '#333333',
          fontSize: '10px',
          letterSpacing: '0.2em',
        }}
      >
        LOADING...
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#000000',
        minHeight: '100vh',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '20px 20px 0 20px',
          borderBottom: '1px solid rgba(255,102,0,0.15)',
          paddingBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#ff6600',
              letterSpacing: '0.2em',
              margin: 0,
              textTransform: 'uppercase',
            }}
          >
            FOLLOWING
          </h1>
          {/* Demo mode badge */}
          {!hasRealFollows && (
            <span
              style={{
                fontSize: '8px',
                color: '#555555',
                letterSpacing: '0.15em',
                border: '1px solid #333333',
                padding: '2px 6px',
                borderRadius: '2px',
              }}
            >
              DEMO DATA
            </span>
          )}
        </div>
        <p
          style={{
            fontSize: '9px',
            color: '#555555',
            letterSpacing: '0.15em',
            margin: '4px 0 0 0',
            textTransform: 'uppercase',
          }}
        >
          Only what changed since your last visit
        </p>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 16px 80px 16px',
        }}
      >
        {/* ── Demo notice ─────────────────────────────────────────────────── */}
        {!hasRealFollows && (
          <div
            style={{
              margin: '16px 0 4px 0',
              padding: '10px 14px',
              background: 'rgba(255,102,0,0.06)',
              border: '1px solid rgba(255,102,0,0.2)',
              borderRadius: '2px',
            }}
          >
            <p style={{ margin: 0, fontSize: '10px', color: '#ff6600', letterSpacing: '0.1em' }}>
              Nothing followed yet.
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: '#666666', letterSpacing: '0.08em', lineHeight: 1.5 }}>
              Go to any signal, vendor, or technology and tap{' '}
              <span style={{ color: '#00d4ff' }}>FOLLOW</span> to track changes here.
              Showing demo data below.
            </p>
          </div>
        )}

        {/* ── NEEDS ATTENTION ─────────────────────────────────────────────── */}
        {attentionItems.length > 0 && (
          <>
            <SectionHeader label="NEEDS ATTENTION" count={attentionItems.length} color="#ff3b30" />
            {attentionItems.map((item) => (
              <FollowCard key={item.id} item={item} onUnfollow={handleUnfollow} />
            ))}
          </>
        )}

        {/* ── UPDATES ─────────────────────────────────────────────────────── */}
        {updateItems.length > 0 && (
          <>
            <SectionHeader label="UPDATES" count={updateItems.length} color="#00d4ff" />
            {updateItems.map((item) => (
              <FollowCard key={item.id} item={item} onUnfollow={handleUnfollow} />
            ))}
          </>
        )}

        {/* ── QUIET ───────────────────────────────────────────────────────── */}
        {quietItems.length > 0 && (
          <>
            <SectionHeader label="QUIET" count={quietItems.length} color="#444444" />
            {quietItems.map((item) => (
              <FollowCard key={item.id} item={item} onUnfollow={handleUnfollow} />
            ))}
          </>
        )}

        {/* ── Empty (all unfollowed in real mode) ─────────────────────────── */}
        {hasRealFollows && displayItems.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              marginTop: '60px',
              color: '#333333',
            }}
          >
            <p style={{ fontSize: '11px', letterSpacing: '0.15em' }}>NOTHING FOLLOWED YET</p>
            <p style={{ fontSize: '9px', color: '#444444', marginTop: '8px', letterSpacing: '0.1em' }}>
              Go to any signal, vendor, or technology and tap FOLLOW.
            </p>
          </div>
        )}

        {/* ── Suggested to follow ─────────────────────────────────────────── */}
        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: '#ffd700',
              }}
            >
              SUGGESTED TO FOLLOW
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,215,0,0.12)' }} />
          </div>

          {SUGGESTED.map((s) => {
            const followed = isFollowing(s.id);
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  border: '1px solid rgba(255,215,0,0.12)',
                  borderRadius: '2px',
                  marginBottom: '6px',
                  background: 'rgba(255,215,0,0.03)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '8px',
                        color: typeBadgeColor(s.type),
                        border: `1px solid ${typeBadgeColor(s.type)}44`,
                        padding: '1px 5px',
                        borderRadius: '2px',
                        letterSpacing: '0.12em',
                        background: `${typeBadgeColor(s.type)}10`,
                      }}
                    >
                      {s.type.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 600 }}>
                      {s.label}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '9px',
                      color: '#555555',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {s.hint}
                  </p>
                </div>
                <button
                  onClick={() => handleSuggestedFollow(s)}
                  disabled={followed}
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    color: followed ? '#444444' : '#ff6600',
                    border: `1px solid ${followed ? '#333333' : 'rgba(255,102,0,0.5)'}`,
                    background: followed ? 'transparent' : 'rgba(255,102,0,0.08)',
                    padding: '4px 12px',
                    borderRadius: '2px',
                    cursor: followed ? 'default' : 'pointer',
                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                    opacity: followed ? 0.5 : 1,
                  }}
                >
                  {followed ? 'FOLLOWING' : '+ FOLLOW'}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Last checked ────────────────────────────────────────────────── */}
        <p
          style={{
            fontSize: '8px',
            color: '#2a2a2a',
            letterSpacing: '0.15em',
            textAlign: 'center',
            marginTop: '28px',
          }}
        >
          LAST CHECKED — {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* ── Bottom NavBar ──────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '48px',
          background: '#000000',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'stretch',
          zIndex: 50,
        }}
      >
        {NAV_ITEMS.map((nav) => {
          const isActive = nav.key === 'follow';
          return (
            <Link
              key={nav.key}
              href={nav.href}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                fontSize: '8px',
                fontWeight: isActive ? 700 : 400,
                letterSpacing: '0.12em',
                color: isActive ? '#ff6600' : '#444444',
                borderTop: isActive ? '2px solid #ff6600' : '2px solid transparent',
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                transition: 'color 0.15s',
              }}
            >
              {nav.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
