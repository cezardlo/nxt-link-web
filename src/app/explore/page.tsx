/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, type BrainSignal } from '@/lib/brain';
import { BottomNav, TopBar, CardSkeleton, ErrorState } from '@/components/ui';
import { COLORS } from '@/lib/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type ExploreCard = {
  id: string;
  badge: 'URGENT' | 'NEW' | 'GROWING' | 'WATCH';
  badgeColor: string;
  headline: string;
  body: string;
  topic: string;
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

  const urgent = signals.find(s => s.importance >= 0.85);
  if (urgent) {
    cards.push({
      id: 'urgent', badge: 'URGENT', badgeColor: COLORS.red,
      headline: urgent.title.slice(0, 70),
      body: `High-priority activity in ${displayIndustry(urgent.industry)}. This is moving fast.`,
      topic: toSlug(urgent.industry), industry: urgent.industry, signal: urgent,
    });
  }

  const growing = movement.find(m => m.momentum === 'accelerating' || m.momentum === 'up');
  if (growing) {
    cards.push({
      id: 'growing', badge: 'GROWING', badgeColor: COLORS.green,
      headline: `${displayIndustry(growing.sector)} is accelerating`,
      body: `${growing.signal_count} signal${growing.signal_count !== 1 ? 's' : ''} this week — more than usual.`,
      topic: toSlug(growing.sector), industry: growing.sector,
    });
  }

  const newSig = signals.find(s =>
    s.importance >= 0.65 && s !== urgent &&
    (s.signal_type === 'company_detected' || s.signal_type === 'patent' || s.signal_type === 'funding')
  ) ?? signals.find(s => s !== urgent && s.importance >= 0.5);

  if (newSig) {
    cards.push({
      id: 'new', badge: 'NEW', badgeColor: COLORS.gold,
      headline: newSig.title.slice(0, 70),
      body: `New development in ${displayIndustry(newSig.industry)}. First time this appeared this week.`,
      topic: toSlug(newSig.industry), industry: newSig.industry, signal: newSig,
    });
  }

  const watch = movement.find(m => m.momentum === 'steady' && m.signal_count > 2 && !cards.find(c => c.industry === m.sector));
  if (watch && cards.length < 3) {
    cards.push({
      id: 'watch', badge: 'WATCH', badgeColor: COLORS.cyan,
      headline: `${displayIndustry(watch.sector)} — steady but active`,
      body: `${watch.signal_count} signals this week. Not urgent but worth knowing.`,
      topic: toSlug(watch.sector), industry: watch.sector,
    });
  }

  const fallbacks: ExploreCard[] = [
    { id: 'fb-defense', badge: 'URGENT', badgeColor: COLORS.red, headline: 'Defense contracts moving in Texas', body: 'Military spending is active. Local suppliers see more orders.', topic: 'defense', industry: 'defense' },
    { id: 'fb-ai', badge: 'GROWING', badgeColor: COLORS.green, headline: 'AI tools getting cheaper every month', body: 'Costs dropped 40% this year. Now accessible to small businesses.', topic: 'ai-ml', industry: 'ai-ml' },
    { id: 'fb-border', badge: 'NEW', badgeColor: COLORS.gold, headline: 'Border tech corridor forming in El Paso', body: 'New companies appearing along the border. First time detected this month.', topic: 'border-tech', industry: 'border-tech' },
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
    { id: 'vendors', label: `Who is doing this in El Paso`, description: `El Paso vendors active in ${indDisplay}. Ranked by trust score.`, href: `/dossier/${slug}` },
    { id: 'tech', label: `What technology exists`, description: `Products and tools available right now for ${indDisplay}.`, href: `/store?q=${encodeURIComponent(ind)}` },
    { id: 'trends', label: `Where this is heading`, description: `30-day and 90-day outlook for ${indDisplay} in Texas.`, href: `/intel` },
  ];
}

// ── Card components ───────────────────────────────────────────────────────────

function ExploreCardView({ card, onExplore, index }: { card: ExploreCard; onExplore: (card: ExploreCard) => void; index: number }) {
  return (
    <div
      className="flex flex-col gap-4 p-6 flex-1 min-w-[260px] animate-fade-up cursor-pointer
                 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '22px',
        borderTopColor: card.badgeColor,
        borderTopWidth: 3,
        animationDelay: `${index * 120}ms`,
        animationFillMode: 'both',
      }}
      onClick={() => onExplore(card)}
    >
      {/* Badge */}
      <span
        className="font-mono text-[9px] font-bold tracking-[0.2em] self-start px-3 py-1 rounded-full"
        style={{
          color: card.badgeColor,
          background: `${card.badgeColor}12`,
          border: `1px solid ${card.badgeColor}25`,
        }}
      >
        {card.badge}
      </span>

      {/* Headline */}
      <h3 className="font-grotesk text-[15px] font-bold leading-snug" style={{ color: COLORS.text }}>
        {card.headline}
      </h3>

      {/* Body */}
      <p className="font-mono text-[12px] leading-relaxed flex-1" style={{ color: COLORS.muted }}>
        {card.body}
      </p>

      {/* CTA */}
      <span
        className="font-mono text-[10px] font-semibold tracking-[0.15em] self-start mt-1
                   transition-colors duration-200 hover:brightness-125"
        style={{ color: COLORS.accent }}
      >
        EXPLORE
      </span>
    </div>
  );
}

function DrillCardView({ card, index }: { card: DrillCard; index: number }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(card.href)}
      className="flex flex-col gap-3 p-5 flex-1 min-w-[200px] text-left animate-fade-up cursor-pointer
                 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '20px',
        animationDelay: `${index * 120}ms`,
        animationFillMode: 'both',
      }}
    >
      <span className="font-grotesk text-[13px] font-bold leading-snug" style={{ color: COLORS.text }}>
        {card.label}
      </span>
      <span className="font-mono text-[12px] leading-relaxed flex-1" style={{ color: COLORS.muted }}>
        {card.description}
      </span>
      <span
        className="font-mono text-[10px] font-semibold tracking-[0.15em] mt-1"
        style={{ color: COLORS.cyan }}
      >
        GO
      </span>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [cards, setCards] = useState<ExploreCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<ExploreCard | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['EL PASO']);

  function load() {
    setLoading(true);
    setError(false);
    Brain.morning()
      .then((data) => {
        setCards(buildCards(
          data.top_signals,
          data.industry_movement.map(m => ({ sector: m.sector, momentum: m.momentum, signal_count: m.signal_count }))
        ));
      })
      .catch(() => { setCards(buildCards([], [])); setError(true); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function handleExplore(card: ExploreCard) {
    setSelected(card);
    setBreadcrumb(['EL PASO', displayIndustry(card.industry ?? card.topic)]);
  }

  function handleBack() {
    setSelected(null);
    setBreadcrumb(['EL PASO']);
  }

  const drillCards = selected ? buildDrillCards(selected.topic, selected.industry) : [];

  return (
    <div className="min-h-screen pb-24" style={{ background: COLORS.bg }}>
      <TopBar />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-6 pt-5 pb-2">
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && (
              <span className="font-mono text-[10px]" style={{ color: COLORS.dim }}>
                /
              </span>
            )}
            <span
              className={`font-mono text-[10px] tracking-[0.2em] uppercase ${
                i < breadcrumb.length - 1 ? 'cursor-pointer transition-colors duration-150' : ''
              }`}
              style={{
                color: i === breadcrumb.length - 1 ? COLORS.accent : COLORS.muted,
              }}
              onClick={i < breadcrumb.length - 1 ? handleBack : undefined}
            >
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="px-5 sm:px-8 pt-6">
        {!selected ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <span
                className="font-mono text-[10px] tracking-[0.2em] uppercase block mb-2"
                style={{ color: COLORS.dim }}
              >
                YOU ARE HERE
              </span>
              <h1
                className="font-grotesk text-[20px] sm:text-[24px] font-bold leading-snug"
                style={{ color: COLORS.text }}
              >
                Three things are happening right now.
              </h1>
              <p className="font-mono text-[12px] mt-2" style={{ color: COLORS.muted }}>
                Pick one to explore.
              </p>
            </div>

            {/* Cards */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <CardSkeleton /><CardSkeleton /><CardSkeleton />
              </div>
            ) : error && cards.length === 0 ? (
              <ErrorState message="Could not load intelligence." onRetry={load} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {cards.map((card, i) => (
                  <ExploreCardView key={card.id} card={card} onExplore={handleExplore} index={i} />
                ))}
              </div>
            )}
          </>
        ) : (
          /* Drill-down */
          <>
            {/* Back button */}
            <button
              onClick={handleBack}
              className="font-mono text-[11px] tracking-[0.1em] mb-6 px-4 py-2 rounded-full
                         transition-all duration-150 hover:brightness-125"
              style={{
                color: COLORS.accent,
                background: `${COLORS.accent}10`,
                border: `1px solid ${COLORS.accent}20`,
              }}
            >
              BACK
            </button>

            {/* Selected card recap */}
            <div
              className="p-6 mb-8 animate-fade-up"
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '22px',
                borderLeftColor: selected.badgeColor,
                borderLeftWidth: 3,
              }}
            >
              {/* Status dot + badge text */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: selected.badgeColor }}
                />
                <span
                  className="font-mono text-[9px] font-bold tracking-[0.2em]"
                  style={{ color: selected.badgeColor }}
                >
                  {selected.badge}
                </span>
              </div>
              <h2 className="font-grotesk text-[15px] font-bold mb-2" style={{ color: COLORS.text }}>
                {selected.headline}
              </h2>
              <p className="font-mono text-[12px] leading-relaxed" style={{ color: COLORS.muted }}>
                {selected.body}
              </p>
            </div>

            {/* Drill cards */}
            <div className="mb-5">
              <span
                className="font-mono text-[10px] tracking-[0.2em] uppercase block mb-2"
                style={{ color: COLORS.dim }}
              >
                WHAT DO YOU WANT TO KNOW?
              </span>
              <h2 className="font-grotesk text-[16px] font-bold" style={{ color: COLORS.text }}>
                Pick your next step.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {drillCards.map((card, i) => (
                <DrillCardView key={card.id} card={card} index={i} />
              ))}
            </div>

            {/* Signal source */}
            {selected.signal && (
              <div
                className="mt-8 p-6 animate-fade-up"
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '20px',
                  animationDelay: '360ms',
                  animationFillMode: 'both',
                }}
              >
                <span
                  className="font-mono text-[10px] tracking-[0.2em] uppercase block mb-3"
                  style={{ color: COLORS.dim }}
                >
                  THE SIGNAL THAT TRIGGERED THIS
                </span>
                <p className="font-mono text-[12px] leading-relaxed" style={{ color: COLORS.muted }}>
                  {selected.signal.title}
                </p>
                {selected.signal.url && (
                  <a
                    href={selected.signal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[10px] font-semibold tracking-[0.15em] mt-3 inline-block
                               transition-opacity duration-150 hover:opacity-80"
                    style={{ color: COLORS.cyan }}
                  >
                    READ SOURCE
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
