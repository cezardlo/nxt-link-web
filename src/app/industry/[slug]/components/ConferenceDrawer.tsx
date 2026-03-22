'use client';

import { COLORS } from '@/lib/tokens';
import { Drawer } from './Drawer';

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

interface ConferenceDrawerProps {
  conference: Conference | null;
  open: boolean;
  onClose: () => void;
  accentColor: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Derive a "why it matters" blurb from the conference description */
function deriveWhyItMatters(conf: Conference): string {
  const { name, category, estimatedExhibitors, location, description } = conf;

  // Extract key insight from description
  const descSentences = description.split(/[.!]\s+/).filter(Boolean);
  const coreSentence = descSentences[0] ?? '';

  const scale =
    estimatedExhibitors > 500
      ? 'a major gathering'
      : estimatedExhibitors > 100
        ? 'a focused industry event'
        : 'an emerging forum';

  return `${name} represents ${scale} for the ${category} ecosystem in ${location}. ${coreSentence ? coreSentence + '.' : ''} With ${estimatedExhibitors.toLocaleString()} expected exhibitors, this event offers high-density access to decision-makers, emerging technologies, and partnership opportunities that can accelerate market entry and competitive positioning.`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ConferenceDrawer({
  conference,
  open,
  onClose,
  accentColor,
}: ConferenceDrawerProps) {
  if (!conference) {
    return (
      <Drawer open={false} onClose={onClose} title="" accentColor={accentColor}>
        <span />
      </Drawer>
    );
  }

  const scorePercent = Math.min(conference.relevanceScore, 100);
  const whyItMatters = deriveWhyItMatters(conference);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={conference.name}
      accentColor={accentColor}
    >
      <div className="font-mono space-y-6">
        {/* ── Name + Category ──────────────────────────────────────────── */}
        <div>
          <h2
            className="text-[14px] tracking-tight mb-2"
            style={{ color: `${COLORS.text}e6` }}
          >
            {conference.name}
          </h2>
          <span
            className="text-[8px] px-2.5 py-1 rounded-full"
            style={{
              background: `${accentColor}14`,
              color: `${accentColor}cc`,
              border: `1px solid ${accentColor}33`,
            }}
          >
            {conference.category}
          </span>
        </div>

        {/* ── Location + Month ─────────────────────────────────────────── */}
        <div className="flex gap-6">
          <div>
            <span
              className="text-[7px] tracking-[0.2em] uppercase block mb-1"
              style={{ color: `${COLORS.text}33` }}
            >
              LOCATION
            </span>
            <span
              className="text-[10px]"
              style={{ color: `${COLORS.text}80` }}
            >
              {conference.location}
            </span>
          </div>
          <div>
            <span
              className="text-[7px] tracking-[0.2em] uppercase block mb-1"
              style={{ color: `${COLORS.text}33` }}
            >
              MONTH
            </span>
            <span
              className="text-[10px]"
              style={{ color: `${COLORS.text}80` }}
            >
              {conference.month}
            </span>
          </div>
        </div>

        {/* ── Description ──────────────────────────────────────────────── */}
        <div>
          <span
            className="text-[7px] tracking-[0.2em] uppercase block mb-2"
            style={{ color: `${COLORS.text}33` }}
          >
            DESCRIPTION
          </span>
          <p
            className="text-[9px] leading-relaxed"
            style={{ color: `${COLORS.text}66` }}
          >
            {conference.description}
          </p>
        </div>

        {/* ── Estimated Exhibitors ──────────────────────────────────────── */}
        <div>
          <span
            className="text-[7px] tracking-[0.2em] uppercase block mb-1"
            style={{ color: `${COLORS.text}33` }}
          >
            ESTIMATED EXHIBITORS
          </span>
          <span
            className="text-[16px] tabular-nums"
            style={{ color: `${COLORS.text}cc` }}
          >
            {conference.estimatedExhibitors.toLocaleString()}
          </span>
        </div>

        {/* ── Relevance Score ──────────────────────────────────────────── */}
        <div>
          <span
            className="text-[7px] tracking-[0.2em] uppercase block mb-2"
            style={{ color: `${COLORS.text}33` }}
          >
            RELEVANCE SCORE
          </span>
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: `${COLORS.text}0d` }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${scorePercent}%`,
                  background: accentColor,
                }}
              />
            </div>
            <span
              className="text-[11px] tabular-nums shrink-0"
              style={{ color: accentColor }}
            >
              {conference.relevanceScore}
            </span>
          </div>
        </div>

        {/* ── Website ──────────────────────────────────────────────────── */}
        {conference.website && (
          <div>
            <span
              className="text-[7px] tracking-[0.2em] uppercase block mb-2"
              style={{ color: `${COLORS.text}33` }}
            >
              WEBSITE
            </span>
            <a
              href={conference.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] inline-flex items-center gap-1.5 transition-colors"
              style={{ color: `${accentColor}cc` }}
              onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = `${accentColor}cc`)
              }
            >
              {conference.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 1h7v7" />
                <path d="M11 1L1 11" />
              </svg>
            </a>
          </div>
        )}

        {/* ── Why It Matters ───────────────────────────────────────────── */}
        <div
          className="rounded-lg p-4"
          style={{
            background: `${accentColor}08`,
            border: `1px solid ${accentColor}1a`,
          }}
        >
          <span
            className="text-[8px] tracking-[0.2em] uppercase block mb-2"
            style={{ color: `${accentColor}80` }}
          >
            WHY IT MATTERS
          </span>
          <p
            className="text-[9px] leading-relaxed"
            style={{ color: `${COLORS.text}66` }}
          >
            {whyItMatters}
          </p>
        </div>
      </div>
    </Drawer>
  );
}
