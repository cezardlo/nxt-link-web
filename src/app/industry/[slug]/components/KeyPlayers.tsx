'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';
import { IkerBadge } from '@/components/IkerBadge';

// ─── Types ──────────────────────────────────────────────────────────────────

type Vendor = {
  id: string;
  name: string;
  website?: string;
  category?: string;
  tags?: string[];
  ikerScore?: number;
  description?: string;
};

interface KeyPlayersProps {
  vendors: Vendor[];
  accentColor: string;
}

type Tier = 'LEADER' | 'CHALLENGER' | 'EMERGING';

function getTier(score: number | undefined): Tier {
  if (score == null) return 'EMERGING';
  if (score >= 75) return 'LEADER';
  if (score >= 50) return 'CHALLENGER';
  return 'EMERGING';
}

const TIER_CONFIG: Record<Tier, { label: string; color: string }> = {
  LEADER: { label: 'LEADER', color: COLORS.gold },
  CHALLENGER: { label: 'CHALLENGER', color: COLORS.cyan },
  EMERGING: { label: 'EMERGING', color: COLORS.muted },
};

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}



// ─── Component ──────────────────────────────────────────────────────────────

export function KeyPlayers({ vendors, accentColor }: KeyPlayersProps) {
  const grouped = useMemo(() => {
    const groups: Record<Tier, Vendor[]> = {
      LEADER: [],
      CHALLENGER: [],
      EMERGING: [],
    };
    for (const v of vendors) {
      groups[getTier(v.ikerScore)].push(v);
    }
    // Sort each tier by score descending
    for (const tier of Object.keys(groups) as Tier[]) {
      groups[tier].sort((a, b) => (b.ikerScore ?? 0) - (a.ikerScore ?? 0));
    }
    return groups;
  }, [vendors]);

  const tiers: Tier[] = ['LEADER', 'CHALLENGER', 'EMERGING'];
  const hasVendors = vendors.length > 0;

  return (
    <section>
      {/* ── Section header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6">
        <span
          className="block w-1.5 h-1.5 rounded-full"
          style={{ background: accentColor }}
        />
        <span
          className="font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color: `${COLORS.text}cc` }}
        >
          KEY PLAYERS
        </span>
      </div>

      {!hasVendors ? (
        /* ── Empty state ──────────────────────────────────────────────── */
        <div
          className="rounded-xl py-12 text-center"
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.text}0a`,
          }}
        >
          <div
            className="font-mono text-[10px] tracking-[0.15em] mb-2"
            style={{ color: `${COLORS.text}33` }}
          >
            No vendors tracked yet
          </div>
          <p
            className="font-mono text-[8px]"
            style={{ color: `${COLORS.text}1a` }}
          >
            Vendor intelligence will appear here as data is collected
          </p>
        </div>
      ) : (
        /* ── Tiered groups ────────────────────────────────────────────── */
        <div className="space-y-8">
          {tiers.map((tier) => {
            const vendors = grouped[tier];
            if (vendors.length === 0) return null;
            const config = TIER_CONFIG[tier];

            return (
              <div key={tier}>
                {/* Tier label */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="block w-1 h-1 rounded-full"
                    style={{ background: config.color }}
                  />
                  <span
                    className="font-mono text-[8px] tracking-[0.2em]"
                    style={{ color: `${config.color}99` }}
                  >
                    {config.label}
                  </span>
                  <span
                    className="font-mono text-[8px] tabular-nums"
                    style={{ color: `${COLORS.text}26` }}
                  >
                    ({vendors.length})
                  </span>
                </div>

                {/* Player cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {vendors.map((v) => {
                    const score = v.ikerScore ?? 0;
                    return (
                      <Link
                        key={v.id}
                        href={`/vendor/${v.id}`}
                        className="block rounded-xl p-4 font-mono transition-all group"
                        style={{
                          background: COLORS.card,
                          border: `1px solid ${COLORS.text}0a`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = `${accentColor}33`;
                          e.currentTarget.style.background = `${accentColor}08`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = `${COLORS.text}0a`;
                          e.currentTarget.style.background = COLORS.card;
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Company logo (favicon) or initial */}
                          {v.website ? (
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${new URL(v.website.startsWith('http') ? v.website : `https://${v.website}`).hostname}&sz=32`}
                              alt=""
                              className="w-9 h-9 rounded-full shrink-0 object-cover"
                              style={{ background: `${accentColor}1a` }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[13px] ${v.website ? 'hidden' : ''}`}
                            style={{
                              background: `${accentColor}1a`,
                              color: accentColor,
                            }}
                          >
                            {getInitial(v.name)}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Name */}
                            <span
                              className="text-[11px] block truncate group-hover:text-white transition-colors"
                              style={{ color: `${COLORS.text}b3` }}
                            >
                              {v.name}
                            </span>

                            {/* Category tag */}
                            {v.category && (
                              <span
                                className="text-[7px] mt-1 inline-block"
                                style={{ color: `${COLORS.text}40` }}
                              >
                                {v.category}
                              </span>
                            )}
                          </div>

                          {/* IKER Score badge — progressive disclosure */}
                          {score > 0 && (
                            <IkerBadge score={score} size="sm" />
                          )}
                        </div>

                        {/* Tags */}
                        {v.tags && v.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {v.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-[7px] px-2 py-0.5 rounded-full"
                                style={{
                                  background: `${COLORS.text}08`,
                                  color: `${COLORS.text}40`,
                                  border: `1px solid ${COLORS.text}0a`,
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
