// @ts-nocheck
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

  // Fetch real exhibitors from DB
  let exhibitors: Array<{
    id: string; company_name: string; logo_url: string | null;
    company_url: string | null; description: string | null;
    sector: string | null; iker_score: number | null;
    technologies: string[]; match_confidence: number; has_vendor_profile: boolean;
    products?: Array<{ id: string; product_name: string; category: string | null; description: string | null; maturity: string | null; price_range: string | null }>;
    source?: string;
  }> = [];
  let exhibitorSource = 'no_data';
  let exhibitorMessage = '';
  let exhibitorTotal = 0;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nxt-link-web.vercel.app';
    const res = await fetch(`${baseUrl}/api/conferences/${id}/exhibitors`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      exhibitors = data.exhibitors ?? [];
      exhibitorTotal = data.total ?? 0;
      exhibitorSource = data.source ?? 'no_data';
      exhibitorMessage = data.message ?? '';
    }
  } catch {
    // exhibitors will be empty — page still works
  }

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

        {/* ── Exhibitors ── */}
        {exhibitorTotal > 0 && (
          <Section title={`EXHIBITORS (${exhibitorTotal} COMPANIES TRACKED)`}>
            {/* Source label */}
            {exhibitorSource === 'sector_match' && exhibitorMessage && (
              <div className="mb-4 px-3 py-2 rounded-lg border border-[#00d4ff]/10 bg-[#00d4ff]/5">
                <p className="font-mono text-[9px] text-[#00d4ff]/60">{exhibitorMessage}</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              {exhibitors.slice(0, 12).map((exh) => {
                const initials = exh.company_name.split(' ').slice(0,2).map(w => w[0] || '').join('').toUpperCase();
                return (
                  <div key={exh.id} className="border border-white/[0.06] hover:border-white/[0.12] transition-colors p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                      {/* Logo */}
                      <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg overflow-hidden"
                        style={{ background: 'rgba(0,212,255,0.08)' }}>
                        {exh.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={exh.logo_url} alt={exh.company_name} width={40} height={40}
                            className="w-full h-full object-contain p-1" />
                        ) : null}
                        <span className="font-mono text-[10px] font-bold text-[#00d4ff]"
                          style={{ display: exh.logo_url ? 'none' : 'block' }}>{initials}</span>
                      </div>
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[13px] text-white">{exh.company_name}</div>
                        {exh.sector && <div className="text-[10px] text-[#00d4ff]/70 mt-0.5">{exh.sector}</div>}
                        {exh.description && <p className="text-[11px] text-white/40 mt-1 line-clamp-2">{exh.description}</p>}
                      </div>
                      {/* Score + CTA */}
                      <div className="shrink-0 text-right">
                        {exh.iker_score && (
                          <div className="font-mono text-[13px] font-bold" style={{ color: exh.iker_score >= 85 ? '#00ff88' : exh.iker_score >= 65 ? '#ffd700' : '#6b7280' }}>
                            {exh.iker_score}
                          </div>
                        )}
                        {exh.company_url && (
                          <a href={exh.company_url} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[9px] text-[#00d4ff] hover:text-white transition-colors mt-1 block border border-[#00d4ff]/20 px-2 py-0.5">
                            VISIT →
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Products this company sells */}
                    {exh.products && exh.products.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.04]">
                        <div className="font-mono text-[8px] text-white/30 mb-2 tracking-widest">PRODUCTS</div>
                        <div className="flex flex-wrap gap-2">
                          {exh.products.map(p => (
                            <div key={p.id} className="text-[10px] px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                              <span className="text-white/70 font-medium">{p.product_name}</span>
                              {p.category && <span className="text-[#00d4ff]/50 ml-1.5">· {p.category}</span>}
                              {p.price_range && <span className="text-white/30 ml-1.5">{p.price_range}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {exhibitorTotal > 12 && (
              <p className="font-mono text-[9px] text-white/30 mt-4 text-center">
                +{exhibitorTotal - 12} more companies tracked at this conference
              </p>
            )}
          </Section>
        )}

        {exhibitorTotal === 0 && (
          <Section title="EXHIBITORS">
            <div className="text-center py-8">
              <div className="font-mono text-[9px] text-white/30 tracking-[0.1em] mb-2">NO EXHIBITOR DATA YET</div>
              <p className="font-mono text-[8px] text-white/20">
                Estimated {conf.estimatedExhibitors.toLocaleString()} exhibitors · Data scraped after conference runs
              </p>
            </div>
          </Section>
        )}

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
