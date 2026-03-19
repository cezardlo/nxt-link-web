/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brain, type BrainSignal } from '@/lib/brain';

// ── Design tokens ─────────────────────────────────────────────────────────────
const ORANGE = '#ff6600';
const CYAN   = '#00d4ff';
const GREEN  = '#00ff88';
const GOLD   = '#ffd700';
const RED    = '#ff3b30';
const FONT   = "'JetBrains Mono', 'Courier New', monospace";
const BG     = '#0f0f0f';
const CARD   = '#161616';
const BORDER = '#222222';

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV_TABS = [
  { label: 'TODAY',   href: '/' },
  { label: 'EXPLORE', href: '/explore' },
  { label: 'WORLD',   href: '/world' },
  { label: 'FOLLOW',  href: '/following' },
  { label: 'STORE',   href: '/store' },
  { label: 'DOSSIER', href: '/dossier' },
];

function NavBar() {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 48,
      background: BG, borderTop: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'stretch', zIndex: 100, fontFamily: FONT,
    }}>
      {NAV_TABS.map(t => {
        const active = t.label === 'EXPLORE';
        return (
          <Link key={t.label} href={t.href} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: active ? ORANGE : '#444', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.1em', textDecoration: 'none',
            borderTop: active ? `2px solid ${ORANGE}` : '2px solid transparent',
          }}>{t.label}</Link>
        );
      })}
    </nav>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ExploreCard = {
  id: string;
  badge: 'URGENT' | 'NEW' | 'GROWING' | 'WATCH';
  badgeColor: string;
  headline: string;
  body: string;
  topic: string;       // slug for dossier link
  industry?: string;
  signal?: BrainSignal;
};

type DrillCard = {
  id: string;
  label: string;
  description: string;
  href: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function displayIndustry(raw: string): string {
  const map: Record<string, string> = {
    'ai-ml': 'AI/ML', 'ai/ml': 'AI/ML', 'border-tech': 'Border Tech',
    'fintech': 'FinTech', 'iot': 'IoT',
  };
  return map[raw.toLowerCase()] ?? raw.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildCards(signals: BrainSignal[], movement: Array<{ sector: string; momentum: string; signal_count: number }>): ExploreCard[] {
  const cards: ExploreCard[] = [];

  // URGENT — top P0 signal
  const urgent = signals.find(s => s.importance >= 0.85);
  if (urgent) {
    cards.push({
      id: 'urgent',
      badge: 'URGENT',
      badgeColor: RED,
      headline: urgent.title.slice(0, 70),
      body: `High-priority activity in ${displayIndustry(urgent.industry)}. This is moving fast.`,
      topic: toSlug(urgent.industry),
      industry: urgent.industry,
      signal: urgent,
    });
  }

  // GROWING — top accelerating sector
  const growing = movement.find(m => m.momentum === 'accelerating' || m.momentum === 'up');
  if (growing) {
    const count = growing.signal_count;
    cards.push({
      id: 'growing',
      badge: 'GROWING',
      badgeColor: GREEN,
      headline: `${displayIndustry(growing.sector)} is accelerating`,
      body: `${count} signal${count !== 1 ? 's' : ''} this week — more than usual. Good time to look closer.`,
      topic: toSlug(growing.sector),
      industry: growing.sector,
    });
  }

  // NEW — a signal from a lesser-known sector or new signal type
  const newSig = signals.find(s =>
    s.importance >= 0.65 &&
    s !== urgent &&
    (s.signal_type === 'company_detected' || s.signal_type === 'patent' || s.signal_type === 'funding')
  ) ?? signals.find(s => s !== urgent && s.importance >= 0.5);

  if (newSig) {
    cards.push({
      id: 'new',
      badge: 'NEW',
      badgeColor: GOLD,
      headline: newSig.title.slice(0, 70),
      body: `New development in ${displayIndustry(newSig.industry)}. First time this appeared this week.`,
      topic: toSlug(newSig.industry),
      industry: newSig.industry,
      signal: newSig,
    });
  }

  // WATCH — steady sector with recent activity
  const watch = movement.find(m => m.momentum === 'steady' && m.signal_count > 2 && !cards.find(c => c.industry === m.sector));
  if (watch && cards.length < 3) {
    cards.push({
      id: 'watch',
      badge: 'WATCH',
      badgeColor: CYAN,
      headline: `${displayIndustry(watch.sector)} — steady but active`,
      body: `${watch.signal_count} signals this week. Not urgent but worth knowing.`,
      topic: toSlug(watch.sector),
      industry: watch.sector,
    });
  }

  // Pad with fallbacks if we don't have 3 cards
  const fallbacks: ExploreCard[] = [
    { id: 'fb-defense', badge: 'URGENT', badgeColor: RED, headline: 'Defense contracts moving in Texas', body: 'Military spending is active. Local suppliers see more orders.', topic: 'defense', industry: 'defense' },
    { id: 'fb-ai', badge: 'GROWING', badgeColor: GREEN, headline: 'AI tools getting cheaper every month', body: 'Costs dropped 40% this year. Now accessible to small businesses.', topic: 'ai-ml', industry: 'ai-ml' },
    { id: 'fb-border', badge: 'NEW', badgeColor: GOLD, headline: 'Border tech corridor forming in El Paso', body: 'New companies appearing along the border. First time detected this month.', topic: 'border-tech', industry: 'border-tech' },
  ];

  while (cards.length < 3) {
    const fb = fallbacks[cards.length];
    if (!cards.find(c => c.id === fb.id)) cards.push(fb);
    else break;
  }

  return cards.slice(0, 3);
}

function buildDrillCards(topic: string, industry: string | undefined): DrillCard[] {
  const ind = industry ?? topic;
  const indDisplay = displayIndustry(ind);
  const slug = toSlug(ind);
  return [
    {
      id: 'vendors',
      label: `Who is doing this in El Paso`,
      description: `El Paso vendors active in ${indDisplay}. Ranked by trust score.`,
      href: `/dossier/${slug}`,
    },
    {
      id: 'tech',
      label: `What technology exists`,
      description: `Products and tools available right now for ${indDisplay}.`,
      href: `/store?q=${encodeURIComponent(ind)}`,
    },
    {
      id: 'trends',
      label: `Where this is heading`,
      description: `30-day and 90-day outlook for ${indDisplay} in Texas.`,
      href: `/intel`,
    },
  ];
}

// ── Card components ───────────────────────────────────────────────────────────

function ExploreCardView({ card, onExplore }: { card: ExploreCard; onExplore: (card: ExploreCard) => void }) {
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderTop: `3px solid ${card.badgeColor}`,
      borderRadius: 4,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      flex: 1,
      minWidth: 220,
    }}>
      {/* Badge */}
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
        color: card.badgeColor,
        background: `${card.badgeColor}18`,
        border: `1px solid ${card.badgeColor}40`,
        borderRadius: 2, padding: '2px 8px',
        alignSelf: 'flex-start',
      }}>{card.badge}</span>

      {/* Headline */}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', lineHeight: 1.4 }}>
        {card.headline}
      </div>

      {/* Body */}
      <div style={{ fontSize: 12, color: '#888888', lineHeight: 1.6, flex: 1 }}>
        {card.body}
      </div>

      {/* CTA */}
      <button
        onClick={() => onExplore(card)}
        style={{
          background: ORANGE, color: '#000', border: 'none',
          borderRadius: 2, padding: '10px 16px',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
          cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
        }}
      >
        EXPLORE →
      </button>
    </div>
  );
}

function DrillCardView({ card }: { card: DrillCard }) {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(card.href)}
      style={{
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: 4, padding: 18,
        display: 'flex', flexDirection: 'column', gap: 8,
        cursor: 'pointer', flex: 1, minWidth: 200,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', lineHeight: 1.4 }}>
        {card.label}
      </div>
      <div style={{ fontSize: 12, color: '#888888', lineHeight: 1.5, flex: 1 }}>
        {card.description}
      </div>
      <div style={{ fontSize: 10, color: CYAN, letterSpacing: '0.1em', marginTop: 4 }}>
        GO →
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [cards, setCards] = useState<ExploreCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExploreCard | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['EL PASO']);

  useEffect(() => {
    Brain.morning()
      .then((data) => {
        const built = buildCards(
          data.top_signals,
          data.industry_movement.map(m => ({ sector: m.sector, momentum: m.momentum, signal_count: m.signal_count }))
        );
        setCards(built);
      })
      .catch(() => {
        setCards(buildCards([], []));
      })
      .finally(() => setLoading(false));
  }, []);

  function handleExplore(card: ExploreCard) {
    setSelected(card);
    setBreadcrumb(['EL PASO', displayIndustry(card.industry ?? card.topic)]);
  }

  function handleBack() {
    setSelected(null);
    setBreadcrumb(['EL PASO']);
  }

  const drillCards = selected
    ? buildDrillCards(selected.topic, selected.industry)
    : [];

  return (
    <div style={{
      background: BG, minHeight: '100dvh', color: '#fff',
      fontFamily: FONT, paddingBottom: 64,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ color: ORANGE, fontSize: 13, letterSpacing: '0.15em', textDecoration: 'none', fontWeight: 700 }}>
          NXT{'//'}<span style={{ color: 'rgba(255,102,0,0.4)' }}>LINK</span>
        </Link>
        <span style={{ color: '#444', fontSize: 10, letterSpacing: '0.2em' }}>EXPLORE</span>
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        {breadcrumb.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ color: '#333', fontSize: 10 }}>→</span>}
            <span style={{
              fontSize: 10, letterSpacing: '0.2em',
              color: i === breadcrumb.length - 1 ? CYAN : '#555',
              cursor: i < breadcrumb.length - 1 ? 'pointer' : 'default',
            }}
              onClick={i < breadcrumb.length - 1 ? handleBack : undefined}
            >{crumb}</span>
          </span>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 20px 0' }}>
        {!selected ? (
          /* Level 0 — three intelligence cards */
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.2em', marginBottom: 4 }}>
                YOU ARE HERE
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                Three things are happening right now.
              </div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
                Pick one to explore.
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    flex: 1, minWidth: 220, height: 220,
                    background: CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {cards.map(card => (
                  <ExploreCardView key={card.id} card={card} onExplore={handleExplore} />
                ))}
              </div>
            )}
          </>
        ) : (
          /* Level 1 — drill-down into selected topic */
          <>
            <button
              onClick={handleBack}
              style={{
                background: 'none', border: `1px solid ${BORDER}`,
                color: '#555', fontSize: 10, letterSpacing: '0.15em',
                padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
                fontFamily: FONT, marginBottom: 20,
              }}
            >
              ← BACK
            </button>

            {/* Selected card recap */}
            <div style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderLeft: `4px solid ${selected.badgeColor}`,
              borderRadius: 4, padding: 16, marginBottom: 24,
            }}>
              <span style={{
                fontSize: 9, letterSpacing: '0.2em', color: selected.badgeColor,
                fontWeight: 700, display: 'block', marginBottom: 6,
              }}>{selected.badge}</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                {selected.headline}
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>{selected.body}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.2em', marginBottom: 4 }}>
                WHAT DO YOU WANT TO KNOW?
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                Pick your next step.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {drillCards.map(card => (
                <DrillCardView key={card.id} card={card} />
              ))}
            </div>

            {/* Signal detail if available */}
            {selected.signal && (
              <div style={{
                marginTop: 24, padding: 16,
                background: '#0a0a0a', border: `1px solid ${BORDER}`,
                borderRadius: 4,
              }}>
                <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.2em', marginBottom: 8 }}>
                  THE SIGNAL THAT TRIGGERED THIS
                </div>
                <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.6 }}>
                  {selected.signal.title}
                </div>
                {selected.signal.url && (
                  <a
                    href={selected.signal.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 10, color: CYAN, display: 'block', marginTop: 8, letterSpacing: '0.1em' }}
                  >
                    READ SOURCE →
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <NavBar />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
