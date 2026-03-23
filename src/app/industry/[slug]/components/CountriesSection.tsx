'use client';

import { useState, useMemo } from 'react';
import { COLORS } from '@/lib/tokens';
import { CountryDrawer } from './CountryDrawer';
import { Component as InteractiveGlobe } from '@/components/ui/interactive-globe';

// ─── Types ──────────────────────────────────────────────────────────────────

type CountryTechProfile = {
  code: string;
  name: string;
  primarySectors: string[];
  keyCompanies: string[];
  signalKeywords: string[];
  techScore: number;
  color: string;
  lat: number;
  lon: number;
};

type IndustryMeta = {
  slug: string;
  label: string;
  category: string;
  color: string;
  description: string;
};

interface CountriesSectionProps {
  countries: CountryTechProfile[];
  industry: IndustryMeta;
  accentColor: string;
  highlightedTechIds?: string[];
  onCountrySelect: (countryCode: string | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signals?: Record<string, any>[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

/**
 * Generate deterministic intelligence-style activity sentences
 * from country data. Uses company + sector combos to produce
 * consistent, non-random summaries.
 */
function generateActivitySentences(country: CountryTechProfile): string[] {
  const sentences: string[] = [];
  const { keyCompanies, primarySectors } = country;

  if (keyCompanies.length === 0 || primarySectors.length === 0) {
    return [`${country.name} active in ${primarySectors[0] ?? 'emerging technology'} sector.`];
  }

  // Sentence 1: Top two companies + primary sector
  const topTwo = keyCompanies.slice(0, 2);
  const sector0 = primarySectors[0];
  if (topTwo.length >= 2) {
    sentences.push(
      `${topTwo[0]} and ${topTwo[1]} expanding ${sector0} capabilities across government and commercial programs.`,
    );
  } else if (topTwo.length === 1) {
    sentences.push(
      `${topTwo[0]} driving ${sector0} innovation with new contract deployments.`,
    );
  }

  // Sentence 2: Secondary sector + next company
  if (primarySectors.length >= 2 && keyCompanies.length >= 3) {
    sentences.push(
      `${keyCompanies[2]} investing in ${primarySectors[1]} infrastructure, signaling strategic pivot.`,
    );
  } else if (primarySectors.length >= 2) {
    sentences.push(
      `Growing ${primarySectors[1]} adoption observed across ${country.name}'s defense and industrial base.`,
    );
  }

  // Sentence 3: Keyword-driven if available
  if (primarySectors.length >= 3) {
    sentences.push(
      `${primarySectors[2]} sector seeing accelerated development in ${country.name}, new procurement cycles opening.`,
    );
  }

  return sentences.slice(0, 3);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CountriesSection({
  countries,
  industry,
  accentColor,
  highlightedTechIds = [],
  onCountrySelect,
  signals = [],
}: CountriesSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryTechProfile | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sort by techScore descending
  const sorted = useMemo(
    () => [...countries].sort((a, b) => b.techScore - a.techScore),
    [countries],
  );

  // Determine which countries are highlighted via tech overlap
  const highlightedCodes = useMemo(() => {
    if (highlightedTechIds.length === 0) return new Set<string>();
    // highlightedTechIds come from trajectory matrix — these are tech category IDs.
    // We highlight countries whose primarySectors overlap with those categories.
    // Since we receive IDs (not raw category strings), we match loosely.
    const lowerIds = new Set(highlightedTechIds.map((id) => id.toLowerCase()));
    return new Set(
      countries
        .filter((c) =>
          c.primarySectors.some((s) => lowerIds.has(s.toLowerCase())),
        )
        .map((c) => c.code),
    );
  }, [countries, highlightedTechIds]);

  const visibleCards = showAll ? sorted : sorted.slice(0, 6);

  function openDrawer(country: CountryTechProfile) {
    setSelectedCountry(country);
    setDrawerOpen(true);
    onCountrySelect(country.code);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedCountry(null);
    onCountrySelect(null);
  }

  return (
    <section>
      {/* ── Section header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-1">
        <span
          className="block w-1.5 h-1.5 rounded-full"
          style={{ background: accentColor }}
        />
        <span
          className="font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color: `${COLORS.text}cc` }}
        >
          COUNTRIES
        </span>
      </div>
      <p
        className="font-mono text-[9px] mb-6"
        style={{ color: `${COLORS.text}40` }}
      >
        What the world is building in {industry.label}
      </p>

      {/* ── Globe ─────────────────────────────────────────────────────── */}
      <div className="mb-8 flex justify-center">
        <InteractiveGlobe
          size={400}
          dotColor={`rgba(100, 180, 255, ALPHA)`}
          arcColor={`${accentColor}80`}
          markerColor={accentColor}
          markers={countries.filter(c => {
            const catLower = industry.category.toLowerCase();
            return c.primarySectors.some(s => s.toLowerCase().includes(catLower) || catLower.includes(s.toLowerCase()));
          }).map(c => ({
            lat: c.lat,
            lng: c.lon,
            label: c.name,
          }))}
          connections={(() => {
            const relevant = countries.filter(c => {
              const catLower = industry.category.toLowerCase();
              return c.primarySectors.some(s => s.toLowerCase().includes(catLower) || catLower.includes(s.toLowerCase()));
            });
            const conns: [number, number][] = [];
            for (let i = 0; i < Math.min(relevant.length, 6); i++) {
              for (let j = i + 1; j < Math.min(relevant.length, 6); j++) {
                conns.push([i, j]);
              }
            }
            return conns;
          })()}
        />
      </div>

      {/* ── Top movers pill row ──────────────────────────────────────────── */}
      <div
        className="flex gap-2 overflow-x-auto pb-3 mb-6"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${COLORS.dim} transparent` }}
      >
        {sorted.map((c) => {
          const isHighlighted =
            highlightedCodes.size === 0 || highlightedCodes.has(c.code);
          return (
            <button
              key={c.code}
              onClick={() => openDrawer(c)}
              className="shrink-0 flex items-center gap-2 px-3 font-mono transition-all"
              style={{
                width: 120,
                height: 48,
                background: COLORS.card,
                border: `1px solid ${c.color}26`,
                borderRadius: 12,
                opacity: isHighlighted ? 1 : 0.35,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${c.color}66`;
                e.currentTarget.style.background = `${c.color}0d`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${c.color}26`;
                e.currentTarget.style.background = COLORS.card;
              }}
            >
              <span className="text-[14px] leading-none">{countryFlag(c.code)}</span>
              <span
                className="text-[9px] tracking-[0.1em] uppercase"
                style={{ color: `${COLORS.text}99` }}
              >
                {c.code}
              </span>
              <span
                className="ml-auto text-[10px] tabular-nums"
                style={{ color: c.color }}
              >
                {c.techScore}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Activity summary cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleCards.map((c) => {
          const isHighlighted =
            highlightedCodes.size === 0 || highlightedCodes.has(c.code);
          const activities = generateActivitySentences(c);

          return (
            <div
              key={c.code}
              className="font-mono transition-opacity"
              style={{
                background: COLORS.card,
                borderRadius: 16,
                border: `1px solid ${COLORS.text}0a`,
                padding: 24,
                opacity: isHighlighted ? 1 : 0.35,
              }}
            >
              {/* Header: flag + name + score */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[18px] leading-none">
                  {countryFlag(c.code)}
                </span>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-[11px] tracking-[0.05em]"
                    style={{ color: `${COLORS.text}cc` }}
                  >
                    {c.name}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                  style={{
                    background: `${c.color}14`,
                    border: `1px solid ${c.color}33`,
                  }}
                >
                  <span className="text-[9px]" style={{ color: c.color }}>
                    {c.techScore}
                  </span>
                </div>
              </div>

              {/* PRIMARY FOCUS */}
              <div className="mb-3">
                <span
                  className="text-[7px] tracking-[0.2em] uppercase block mb-1.5"
                  style={{ color: `${COLORS.text}33` }}
                >
                  PRIMARY FOCUS
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {c.primarySectors.map((sector) => (
                    <span
                      key={sector}
                      className="text-[8px] px-2 py-0.5 rounded-full"
                      style={{
                        background: `${accentColor}14`,
                        color: `${accentColor}cc`,
                        border: `1px solid ${accentColor}22`,
                      }}
                    >
                      {sector}
                    </span>
                  ))}
                </div>
              </div>

              {/* KEY PLAYERS */}
              <div className="mb-3">
                <span
                  className="text-[7px] tracking-[0.2em] uppercase block mb-1.5"
                  style={{ color: `${COLORS.text}33` }}
                >
                  KEY PLAYERS
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {c.keyCompanies.slice(0, 4).map((company) => (
                    <span
                      key={company}
                      className="text-[8px] px-2 py-0.5 rounded-full"
                      style={{
                        background: `${COLORS.text}08`,
                        color: `${COLORS.text}66`,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {company}
                    </span>
                  ))}
                </div>
              </div>

              {/* RECENT ACTIVITY */}
              <div className="mb-4">
                <span
                  className="text-[7px] tracking-[0.2em] uppercase block mb-1.5"
                  style={{ color: `${COLORS.text}33` }}
                >
                  RECENT ACTIVITY
                </span>
                <div className="space-y-1.5">
                  {activities.map((sentence, i) => (
                    <p
                      key={i}
                      className="text-[8px] leading-relaxed"
                      style={{ color: `${COLORS.text}4d` }}
                    >
                      {sentence}
                    </p>
                  ))}
                </div>
              </div>

              {/* View Full Profile link */}
              <button
                onClick={() => openDrawer(c)}
                className="text-[8px] tracking-[0.15em] uppercase transition-colors cursor-pointer"
                style={{ color: `${accentColor}80` }}
                onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
                onMouseLeave={(e) => (e.currentTarget.style.color = `${accentColor}80`)}
              >
                View Full Profile &rarr;
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Show all toggle ──────────────────────────────────────────────── */}
      {sorted.length > 6 && (
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
              e.currentTarget.style.color = `${COLORS.text}99`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${COLORS.text}08`;
              e.currentTarget.style.color = `${COLORS.text}66`;
            }}
          >
            {showAll ? 'Show fewer' : `Show all ${sorted.length} countries`}
          </button>
        </div>
      )}

      {/* ── Country Drawer ───────────────────────────────────────────────── */}
      <CountryDrawer
        country={selectedCountry}
        open={drawerOpen}
        onClose={closeDrawer}
        accentColor={accentColor}
      />
    </section>
  );
}
