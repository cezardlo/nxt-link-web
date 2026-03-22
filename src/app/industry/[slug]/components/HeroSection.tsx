'use client';

import { useState, useEffect } from 'react';
import { COLORS } from '@/lib/tokens';
import type { IndustryMeta } from '@/lib/data/technology-catalog';
import type { IndustryStory } from '@/lib/data/industry-stories';
import type { IndustryTrajectory } from '@/lib/data/industry-trajectory-timeline';
import {
  getDirectionColor,
  getDirectionArrow,
} from '@/lib/data/industry-trajectory-timeline';

// ─── Props ──────────────────────────────────────────────────────────────────

interface HeroSectionProps {
  industry: IndustryMeta;
  story: IndustryStory | null;
  trajectory: IndustryTrajectory | null;
  accentColor: string;
  isFirstVisit: boolean;
}

// ─── Boot sequence keyframes (injected once) ────────────────────────────────

const BOOT_STYLES = `
@keyframes nxtlink-type-in {
  0%   { opacity: 0; transform: translateX(-6px); }
  30%  { opacity: 1; transform: translateX(0); }
  80%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes nxtlink-boot-fade {
  0%   { opacity: 1; }
  100% { opacity: 0; pointer-events: none; }
}
`;

const BOOT_LINES = [
  { text: 'SYSTEM ONLINE', delay: 0 },
  { text: 'SCANNING TRAJECTORIES', delay: 400 },
  { text: 'SIGNALS LOCKED', delay: 800 },
] as const;

const BOOT_TOTAL_DURATION = 1800;

// ─── Component ──────────────────────────────────────────────────────────────

export function HeroSection({
  industry,
  story,
  trajectory,
  accentColor,
  isFirstVisit,
}: HeroSectionProps) {
  const [bootDone, setBootDone] = useState(!isFirstVisit);

  useEffect(() => {
    if (!isFirstVisit) return;
    const timer = setTimeout(() => setBootDone(true), BOOT_TOTAL_DURATION + 400);
    return () => clearTimeout(timer);
  }, [isFirstVisit]);

  const direction = trajectory?.direction ?? 'steady';
  const dirColor = getDirectionColor(direction);
  const dirArrow = getDirectionArrow(direction);

  const firstSentence =
    story?.summary?.split(/(?<=\.)\s/)[0] ?? industry.description;

  const techCount = trajectory?.milestones?.length ?? 0;
  const keywordCount =
    story?.problems?.length ?? 0;

  return (
    <section className="relative" style={{ maxHeight: 200, overflow: 'hidden' }}>
      {/* Inject boot keyframes */}
      {isFirstVisit && <style>{BOOT_STYLES}</style>}

      {/* ── Boot sequence overlay ──────────────────────────────────────── */}
      {isFirstVisit && !bootDone && (
        <div
          className="absolute inset-0 z-10 flex flex-col justify-center gap-2 pl-6"
          style={{
            background: COLORS.bg,
            animation: `nxtlink-boot-fade 400ms ease-out ${BOOT_TOTAL_DURATION}ms forwards`,
          }}
        >
          {BOOT_LINES.map(({ text, delay }) => (
            <span
              key={text}
              className="font-mono text-[10px] tracking-[0.3em]"
              style={{
                color: accentColor,
                opacity: 0,
                animation: `nxtlink-type-in 1200ms ease-out ${delay}ms forwards`,
              }}
            >
              {text}
            </span>
          ))}
        </div>
      )}

      {/* ── Real content ───────────────────────────────────────────────── */}
      <div
        className="relative pl-5"
        style={{
          borderLeft: `2px solid ${accentColor}`,
          opacity: isFirstVisit && !bootDone ? 0 : 1,
          transition: 'opacity 400ms ease-out',
        }}
      >
        {/* Title */}
        <h1
          className="font-mono text-[24px] tracking-tight leading-tight"
          style={{ color: `${COLORS.text}e6` }}
        >
          {industry.label}
        </h1>

        {/* Headline subtitle */}
        {story?.headline && (
          <p
            className="font-mono text-[10px] mt-1.5 leading-relaxed"
            style={{ color: `${COLORS.text}66` }}
          >
            {story.headline}
          </p>
        )}

        {/* First sentence summary */}
        <p
          className="font-mono text-[9px] mt-1 leading-relaxed max-w-2xl"
          style={{ color: `${COLORS.text}4d` }}
        >
          {firstSentence}
        </p>

        {/* ── Stat chips ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {/* Direction badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: `${dirColor}14`,
              border: `1px solid ${dirColor}33`,
            }}
          >
            {/* Glowing dot */}
            <span
              className="block w-1.5 h-1.5 rounded-full"
              style={{
                background: dirColor,
                boxShadow: `0 0 6px ${dirColor}88`,
              }}
            />
            <span
              className="font-mono text-[9px] tracking-[0.15em] uppercase"
              style={{ color: dirColor }}
            >
              {dirArrow} {direction}
            </span>
          </div>

          {/* Tech count chip */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: `${COLORS.text}08`,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <span
              className="font-mono text-[9px] tracking-[0.1em]"
              style={{ color: COLORS.muted }}
            >
              {techCount} milestones
            </span>
          </div>

          {/* Keywords chip */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: `${COLORS.text}08`,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <span
              className="font-mono text-[9px] tracking-[0.1em]"
              style={{ color: COLORS.muted }}
            >
              {keywordCount} key problems
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
