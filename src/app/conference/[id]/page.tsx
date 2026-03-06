import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CONFERENCES } from '@/lib/data/conference-intel';
import type { ConferenceRecord } from '@/lib/data/conference-intel';
import { PageTopBar } from '@/components/PageTopBar';
import { CONFERENCE_CATEGORY_HEX } from '@/lib/utils/design-tokens';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTierInfo(score: number): { label: string; color: string; tier: 1 | 2 | 3 } {
  if (score >= 75) return { label: 'TIER-1 FLAGSHIP', color: '#00ff88', tier: 1 };
  if (score >= 50) return { label: 'TIER-2 MAJOR', color: '#ffd700', tier: 2 };
  return { label: 'TIER-3', color: 'rgba(255,255,255,0.30)', tier: 3 };
}

function getCategoryColor(category: string): string {
  return CONFERENCE_CATEGORY_HEX[category] ?? '#6b7280';
}

const MONTH_ABBR: Record<string, string> = {
  January: 'JAN', February: 'FEB', March: 'MAR', April: 'APR',
  May: 'MAY', June: 'JUN', July: 'JUL', August: 'AUG',
  September: 'SEP', October: 'OCT', November: 'NOV', December: 'DEC',
};

// ─── Static generation ───────────────────────────────────────────────────────

export function generateStaticParams() {
  return CONFERENCES.map((c: ConferenceRecord) => ({ id: c.id }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ id: string }> };

export default async function ConferenceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const conf = CONFERENCES.find((c: ConferenceRecord) => c.id === id);
  if (!conf) notFound();

  const tierInfo = getTierInfo(conf.relevanceScore);
  const catColor = getCategoryColor(conf.category);
  const mapHref = `/map?lat=${conf.lat}&lon=${conf.lon}&zoom=10`;

  return (
    <div className="bg-black min-h-screen grid-pattern">

      <PageTopBar
        backHref="/conferences"
        backLabel="CONFERENCES"
        breadcrumbs={[
          { label: 'CONFERENCES', href: '/conferences' },
          { label: conf.name },
        ]}
      />

      <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">

        {/* ── Header ── */}
        <div className="border-b border-white/[0.04] pb-6 mb-8">

          {/* Tier badge + category */}
          <div className="flex items-center gap-3 mb-3">
            <span
              className="font-mono text-[8px] tracking-[0.15em] px-2.5 py-0.5 border"
              style={{
                color: tierInfo.color,
                borderColor: `${tierInfo.color}40`,
                backgroundColor: `${tierInfo.color}10`,
              }}
            >
              {tierInfo.label}
            </span>
            <span
              className="font-mono text-[8px] tracking-[0.1em] uppercase"
              style={{ color: `${catColor}b3` }}
            >
              {conf.category}
            </span>
          </div>

          {/* Name */}
          <h1 className="font-mono text-[20px] tracking-[0.15em] text-white/80 mb-2 leading-tight">
            {conf.name}
          </h1>

          {/* Location + date */}
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] text-white/40 tracking-wide">
              {conf.location}
            </span>
            <span className="font-mono text-[10px] text-white/25 tracking-wide">
              {MONTH_ABBR[conf.month] ?? conf.month.slice(0, 3).toUpperCase()} 2026
            </span>
          </div>

          {/* Description */}
          {conf.description && (
            <p className="font-mono text-[10px] text-white/30 mt-4 leading-relaxed max-w-2xl">
              {conf.description}
            </p>
          )}
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="RELEVANCE SCORE"
            value={conf.relevanceScore.toString()}
            color={tierInfo.color}
          />
          <StatCard
            label="EST. EXHIBITORS"
            value={conf.estimatedExhibitors.toLocaleString()}
            color="#00d4ff"
          />
          <StatCard
            label="TIER"
            value={`TIER-${tierInfo.tier}`}
            color={tierInfo.color}
          />
          <StatCard
            label="CATEGORY"
            value={conf.category.toUpperCase()}
            color={catColor}
          />
        </div>

        {/* ── Links ── */}
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <Link
            href={mapHref}
            className="font-mono text-[9px] tracking-[0.15em] text-white/40 hover:text-[#00d4ff] transition-colors border border-white/[0.08] hover:border-[#00d4ff]/30 px-4 py-2"
          >
            VIEW ON MAP
          </Link>
          {conf.website && (
            <a
              href={conf.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[9px] tracking-[0.15em] text-white/40 hover:text-[#00d4ff] transition-colors border border-white/[0.08] hover:border-[#00d4ff]/30 px-4 py-2"
            >
              WEBSITE
            </a>
          )}
        </div>

        {/* ── Location section ── */}
        <Section title="LOCATION INTELLIGENCE">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-mono text-[8px] text-white/25 tracking-[0.1em] block mb-1">VENUE / CITY</span>
              <span className="font-mono text-[10px] text-white/60">{conf.location}</span>
            </div>
            <div>
              <span className="font-mono text-[8px] text-white/25 tracking-[0.1em] block mb-1">COORDINATES</span>
              <span className="font-mono text-[10px] text-white/40">
                {conf.lat.toFixed(4)}, {conf.lon.toFixed(4)}
              </span>
            </div>
          </div>
        </Section>

        {/* ── Score breakdown ── */}
        <Section title="RELEVANCE BREAKDOWN">
          <div className="space-y-3">
            <ScoreBar label="RELEVANCE SCORE" value={conf.relevanceScore} max={100} color={tierInfo.color} />
            <ScoreBar label="EXHIBITOR SCALE" value={Math.min(100, Math.round((conf.estimatedExhibitors / 3000) * 100))} max={100} color="#00d4ff" />
          </div>
        </Section>

        {/* ── Related conferences in same category ── */}
        <Section title={`OTHER ${conf.category.toUpperCase()} CONFERENCES`}>
          <div className="space-y-1">
            {CONFERENCES
              .filter((c: ConferenceRecord) => c.category === conf.category && c.id !== conf.id)
              .sort((a: ConferenceRecord, b: ConferenceRecord) => b.relevanceScore - a.relevanceScore)
              .slice(0, 8)
              .map((c: ConferenceRecord) => {
                const t = getTierInfo(c.relevanceScore);
                return (
                  <Link
                    key={c.id}
                    href={`/conference/${c.id}`}
                    className="flex items-center gap-3 py-1.5 hover:bg-white/[0.03] transition-colors group"
                  >
                    <span
                      className="font-mono text-[7px] tracking-[0.1em] px-1.5 py-0.5 border shrink-0"
                      style={{
                        color: t.color,
                        borderColor: `${t.color}30`,
                      }}
                    >
                      {t.label.split(' ')[0]}
                    </span>
                    <span className="font-mono text-[9px] text-white/50 group-hover:text-white/70 transition-colors flex-1 truncate">
                      {c.name}
                    </span>
                    <span className="font-mono text-[8px] text-white/20 shrink-0">
                      {c.relevanceScore}
                    </span>
                  </Link>
                );
              })}
          </div>
        </Section>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] p-4">
      <span className="font-mono text-[7px] tracking-[0.15em] text-white/25 block mb-2">
        {label}
      </span>
      <span
        className="font-mono text-[16px] font-bold block"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4 border-b border-white/[0.04] pb-2">
        <span className="font-mono text-[9px] tracking-[0.25em] text-white/30 uppercase">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[8px] text-white/25 tracking-[0.1em] w-36 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-[3px] bg-white/[0.04] overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 4px ${color}66`,
          }}
        />
      </div>
      <span className="font-mono text-[9px] shrink-0 w-8 text-right" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
