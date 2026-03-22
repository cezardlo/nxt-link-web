'use client';

import { useMemo } from 'react';
import { COLORS } from '@/lib/tokens';
import { Drawer } from './Drawer';

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

interface CountryDrawerProps {
  country: CountryTechProfile | null;
  open: boolean;
  onClose: () => void;
  accentColor: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

/** Deterministic activity bullets with synthetic timestamps */
function generateActivityBullets(
  country: CountryTechProfile,
): { text: string; time: string }[] {
  const bullets: { text: string; time: string }[] = [];
  const { keyCompanies, primarySectors, name } = country;

  if (keyCompanies[0] && primarySectors[0]) {
    bullets.push({
      text: `${keyCompanies[0]} awarded new ${primarySectors[0]} development contract in ${name}.`,
      time: '2d ago',
    });
  }
  if (keyCompanies[1] && primarySectors[0]) {
    bullets.push({
      text: `${keyCompanies[1]} expanding ${primarySectors[0]} operations, hiring surge detected.`,
      time: '5d ago',
    });
  }
  if (primarySectors[1]) {
    bullets.push({
      text: `${name} government announces ${primarySectors[1]} modernization initiative.`,
      time: '1w ago',
    });
  }
  if (keyCompanies[2] && primarySectors.length >= 2) {
    bullets.push({
      text: `${keyCompanies[2]} partners with ${name} defense ministry on ${primarySectors[1] ?? primarySectors[0]} systems.`,
      time: '2w ago',
    });
  }
  if (primarySectors[2]) {
    bullets.push({
      text: `New ${primarySectors[2]} procurement cycle opening in ${name}, estimated $2B+ opportunity.`,
      time: '3w ago',
    });
  }

  return bullets.slice(0, 5);
}

/** Maturity dot color based on sector position */
function maturityColor(index: number): string {
  if (index === 0) return COLORS.green;
  if (index === 1) return COLORS.cyan;
  if (index === 2) return COLORS.amber;
  return COLORS.muted;
}

function maturityLabel(index: number): string {
  if (index === 0) return 'Mature';
  if (index === 1) return 'Growing';
  if (index === 2) return 'Emerging';
  return 'Early';
}

/** Generate a geopolitical narrative from sectors and companies */
function generateStrategicPosition(country: CountryTechProfile): string {
  const { name, primarySectors, keyCompanies, techScore } = country;
  const tierLabel =
    techScore >= 80
      ? 'a dominant force'
      : techScore >= 60
        ? 'a significant contender'
        : techScore >= 40
          ? 'an emerging player'
          : 'a developing participant';

  const s1 = `${name} positions itself as ${tierLabel} in ${primarySectors[0] ?? 'advanced technology'}, leveraging ${keyCompanies.length > 0 ? keyCompanies.slice(0, 2).join(' and ') : 'domestic firms'} for strategic advantage.`;
  const s2 =
    primarySectors.length >= 2
      ? `Cross-sector integration between ${primarySectors[0]} and ${primarySectors[1]} creates compounding capability advantages that competitors will find difficult to replicate.`
      : `Concentrated investment in ${primarySectors[0] ?? 'core technology'} signals a focused national strategy aimed at sector dominance.`;

  return `${s1} ${s2}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CountryDrawer({
  country,
  open,
  onClose,
  accentColor,
}: CountryDrawerProps) {
  const activities = useMemo(
    () => (country ? generateActivityBullets(country) : []),
    [country],
  );

  const strategic = useMemo(
    () => (country ? generateStrategicPosition(country) : ''),
    [country],
  );

  if (!country) {
    return <Drawer open={false} onClose={onClose} title="" accentColor={accentColor}><span /></Drawer>;
  }

  const scorePercent = Math.min(country.techScore, 100);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={country.name}
      accentColor={country.color}
    >
      <div className="font-mono space-y-6">
        {/* ── Flag + Name + Score Bar ──────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[24px] leading-none">
              {countryFlag(country.code)}
            </span>
            <span
              className="text-[16px] tracking-tight"
              style={{ color: `${COLORS.text}e6` }}
            >
              {country.name}
            </span>
          </div>
          {/* Score bar */}
          <div className="flex items-center gap-3">
            <span
              className="text-[8px] tracking-[0.15em] uppercase shrink-0"
              style={{ color: `${COLORS.text}33` }}
            >
              TECH SCORE
            </span>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: `${COLORS.text}0d` }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${scorePercent}%`,
                  background: country.color,
                }}
              />
            </div>
            <span
              className="text-[11px] tabular-nums shrink-0"
              style={{ color: country.color }}
            >
              {country.techScore}
            </span>
          </div>
        </div>

        {/* ── Specialization Strip ─────────────────────────────────────── */}
        <div>
          <div className="flex flex-wrap gap-1.5">
            {country.primarySectors.map((sector) => (
              <span
                key={sector}
                className="text-[8px] px-2.5 py-1 rounded-full"
                style={{
                  background: `${country.color}14`,
                  color: `${country.color}cc`,
                  border: `1px solid ${country.color}33`,
                }}
              >
                {sector}
              </span>
            ))}
          </div>
        </div>

        {/* ── What They're Doing ────────────────────────────────────────── */}
        <div>
          <span
            className="text-[8px] tracking-[0.2em] uppercase block mb-3"
            style={{ color: `${COLORS.text}33` }}
          >
            WHAT THEY&apos;RE DOING
          </span>
          <div className="space-y-2.5">
            {activities.map((item, i) => (
              <div key={i} className="flex gap-3">
                <span
                  className="text-[7px] tabular-nums shrink-0 pt-0.5"
                  style={{ color: `${COLORS.text}26`, minWidth: 36 }}
                >
                  {item.time}
                </span>
                <span
                  className="text-[9px] leading-relaxed"
                  style={{ color: `${COLORS.text}66` }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Key Players ──────────────────────────────────────────────── */}
        <div>
          <span
            className="text-[8px] tracking-[0.2em] uppercase block mb-3"
            style={{ color: `${COLORS.text}33` }}
          >
            KEY PLAYERS
          </span>
          <div className="space-y-2">
            {country.keyCompanies.map((company, i) => (
              <div
                key={company}
                className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{
                  background: `${COLORS.text}06`,
                  border: `1px solid ${COLORS.text}08`,
                }}
              >
                <span
                  className="text-[9px]"
                  style={{ color: `${COLORS.text}99` }}
                >
                  {company}
                </span>
                {country.primarySectors[i % country.primarySectors.length] && (
                  <span
                    className="text-[7px] px-2 py-0.5 rounded-full"
                    style={{
                      background: `${accentColor}14`,
                      color: `${accentColor}80`,
                    }}
                  >
                    {country.primarySectors[i % country.primarySectors.length]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Technology Focus ──────────────────────────────────────────── */}
        <div>
          <span
            className="text-[8px] tracking-[0.2em] uppercase block mb-3"
            style={{ color: `${COLORS.text}33` }}
          >
            TECHNOLOGY FOCUS
          </span>
          <div className="space-y-2">
            {country.primarySectors.map((sector, sIdx) => (
              <div key={sector} className="flex items-center gap-3">
                <span
                  className="block w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: maturityColor(sIdx),
                    boxShadow: `0 0 4px ${maturityColor(sIdx)}66`,
                  }}
                />
                <span
                  className="text-[9px] flex-1"
                  style={{ color: `${COLORS.text}80` }}
                >
                  {sector}
                </span>
                <span
                  className="text-[7px] tracking-[0.1em] uppercase"
                  style={{ color: `${maturityColor(sIdx)}99` }}
                >
                  {maturityLabel(sIdx)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Strategic Position ────────────────────────────────────────── */}
        <div>
          <span
            className="text-[8px] tracking-[0.2em] uppercase block mb-2"
            style={{ color: `${COLORS.text}33` }}
          >
            STRATEGIC POSITION
          </span>
          <p
            className="text-[9px] leading-relaxed"
            style={{ color: `${COLORS.text}4d` }}
          >
            {strategic}
          </p>
        </div>

        {/* ── Signal Keywords ──────────────────────────────────────────── */}
        <div>
          <span
            className="text-[8px] tracking-[0.2em] uppercase block mb-2"
            style={{ color: `${COLORS.text}33` }}
          >
            SIGNAL KEYWORDS
          </span>
          <div className="flex flex-wrap gap-1.5">
            {country.signalKeywords.map((kw) => (
              <span
                key={kw}
                className="text-[7px] px-2 py-0.5 rounded-full"
                style={{
                  background: `${COLORS.text}08`,
                  color: `${COLORS.text}40`,
                  border: `1px solid ${COLORS.text}0a`,
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
