'use client';

import { useState, useMemo } from 'react';
import { COLORS } from '@/lib/tokens';
import { ConferenceDrawer } from './ConferenceDrawer';

// ─── Types ──────────────────────────────────────────────────────────────────

type Conference = {
  id: string;
  name: string;
  category: string;
  location: string;
  month: string;
  description: string;
  estimatedExhibitors: number;
  relevanceScore: number;
  website: string;
  lat: number;
  lon: number;
};

interface ConferencesSectionProps {
  conferences: Conference[];
  accentColor: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthIndex(month: string): number {
  const idx = MONTHS_ORDER.findIndex(
    (m) => m.toLowerCase().startsWith(month.toLowerCase().slice(0, 3)),
  );
  return idx >= 0 ? idx : 12;
}

function isUpcoming(month: string): boolean {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-based
  return getMonthIndex(month) >= currentMonth;
}

type Filter = 'UPCOMING' | 'ALL';

// ─── Component ──────────────────────────────────────────────────────────────

export function ConferencesSection({
  conferences,
  accentColor,
}: ConferencesSectionProps) {
  const [filter, setFilter] = useState<Filter>('UPCOMING');
  const [showAll, setShowAll] = useState(false);
  const [selectedConference, setSelectedConference] = useState<Conference | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sort by relevanceScore descending
  const sorted = useMemo(() => {
    const filtered =
      filter === 'UPCOMING'
        ? conferences.filter((c) => isUpcoming(c.month))
        : conferences;
    return [...filtered].sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [conferences, filter]);

  const maxRelevance = useMemo(
    () => Math.max(...sorted.map((c) => c.relevanceScore), 1),
    [sorted],
  );

  const visible = showAll ? sorted : sorted.slice(0, 8);

  function openDrawer(conf: Conference) {
    setSelectedConference(conf);
    setDrawerOpen(true);
  }

  const filters: Filter[] = ['UPCOMING', 'ALL'];

  return (
    <section>
      {/* ── Section header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-1">
        <span
          className="block w-1.5 h-1.5 rounded-full"
          style={{ background: accentColor }}
        />
        <span
          className="font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color: `${COLORS.text}cc` }}
        >
          CONFERENCES
        </span>
      </div>

      {/* ── Filter pills ─────────────────────────────────────────────── */}
      <div className="flex gap-2 mt-3 mb-5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setShowAll(false);
            }}
            className="font-mono text-[8px] tracking-[0.15em] px-3 py-1.5 rounded-full transition-all cursor-pointer"
            style={{
              background: filter === f ? `${accentColor}1a` : `${COLORS.text}08`,
              color: filter === f ? accentColor : `${COLORS.text}40`,
              border: `1px solid ${filter === f ? `${accentColor}33` : COLORS.border}`,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Conference rows ──────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div
          className="font-mono text-[9px] text-center py-8"
          style={{ color: `${COLORS.text}33` }}
        >
          No conferences found
        </div>
      ) : (
        <div className="space-y-1">
          {visible.map((conf) => {
            const barWidth = (conf.relevanceScore / maxRelevance) * 100;
            return (
              <button
                key={conf.id}
                onClick={() => openDrawer(conf)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono transition-colors cursor-pointer text-left"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = `${COLORS.text}06`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                {/* Month tag */}
                <span
                  className="text-[8px] tracking-[0.1em] uppercase shrink-0 tabular-nums"
                  style={{
                    color: `${COLORS.text}33`,
                    minWidth: 36,
                  }}
                >
                  {conf.month.slice(0, 3).toUpperCase()}
                </span>

                {/* Conference name */}
                <span
                  className="text-[11px] truncate flex-1 min-w-0"
                  style={{ color: `${COLORS.text}b3` }}
                >
                  {conf.name}
                </span>

                {/* Location */}
                <span
                  className="text-[9px] shrink-0 hidden sm:block"
                  style={{ color: `${COLORS.text}40`, minWidth: 80 }}
                >
                  {conf.location}
                </span>

                {/* Category badge */}
                <span
                  className="text-[7px] px-2 py-0.5 rounded-full shrink-0 hidden md:block"
                  style={{
                    background: `${accentColor}14`,
                    color: `${accentColor}80`,
                    border: `1px solid ${accentColor}22`,
                  }}
                >
                  {conf.category}
                </span>

                {/* Relevance bar */}
                <div
                  className="shrink-0 hidden sm:block"
                  style={{ width: 60 }}
                >
                  <div
                    className="h-[3px] rounded-full overflow-hidden"
                    style={{ background: `${COLORS.text}0d` }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${barWidth}%`,
                        background: accentColor,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>

                {/* Exhibitors */}
                <span
                  className="text-[8px] tabular-nums shrink-0"
                  style={{ color: `${COLORS.text}26`, minWidth: 40, textAlign: 'right' }}
                >
                  {conf.estimatedExhibitors.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Show all toggle ──────────────────────────────────────────── */}
      {sorted.length > 8 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="font-mono text-[9px] tracking-[0.15em] px-4 py-2 rounded-full transition-colors cursor-pointer"
            style={{
              color: `${COLORS.text}66`,
              background: `${COLORS.text}08`,
              border: `1px solid ${COLORS.border}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${COLORS.text}14`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${COLORS.text}08`;
            }}
          >
            {showAll ? 'Show fewer' : `Show all ${sorted.length} conferences`}
          </button>
        </div>
      )}

      {/* ── Conference Drawer ────────────────────────────────────────── */}
      <ConferenceDrawer
        conference={selectedConference}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedConference(null);
        }}
        accentColor={accentColor}
      />
    </section>
  );
}
