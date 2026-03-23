'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BottomNav } from '@/components/ui';

// ── Types ─────────────────────────────────────────────────────────────────────

type PorterForce = { score: number; level: string; drivers: string[] };
type PorterAnalysis = {
  forces: {
    competitive_rivalry: PorterForce;
    threat_of_new_entrants: PorterForce;
    threat_of_substitutes: PorterForce;
    bargaining_power_suppliers: PorterForce;
    bargaining_power_buyers: PorterForce;
  };
  overall_attractiveness: number;
  overall_label: string;
};

type TechEntry = { id: string; name: string; description: string; maturity: string; relevance: string };
type CompanyEntry = { id: string; name: string; website: string; category: string; iker_score: number; tags: string[] };
type Snapshot = { stage: string; stage_label: string; momentum: string; competition: string; signals_this_month: number; company_count: number; technology_count: number; sector_score: number };
type Explanation = { what_it_does: string; why_it_matters: string[]; outlook: string | null };
type OpportunityEntry = { title: string; reason: string; strength: string };

type IndustryProfile = {
  slug: string;
  label: string;
  blocks: {
    snapshot: Snapshot;
    explanation: Explanation;
    technologies: TechEntry[];
    companies: CompanyEntry[];
    opportunities: OpportunityEntry[];
    porter?: PorterAnalysis;
  };
};

type DiscoveredOpportunity = {
  id: string;
  type: string;
  title: string;
  description: string;
  score: number;
  industries: string[];
  timing: string;
  risk_level: string;
};

type PredictionRisk = { industry: string; alert: string; severity: string };
type PredictionsData = { risk_alerts?: PredictionRisk[] };

// ── Constants ─────────────────────────────────────────────────────────────────

const ADOPTION_COLORS: Record<string, string> = {
  research:       '#a855f7',
  emerging:       '#00d4ff',
  early_adoption: '#ffd700',
  growth:         '#00ff88',
  mainstream:     '#34d399',
};

const RISK_COLORS: Record<string, string> = {
  critical: '#ff3b30',
  high:     '#ff3b30',
  warning:  '#ffb800',
  moderate: '#f97316',
  low:      '#00ff88',
};

const OPP_TYPE_COLORS: Record<string, string> = {
  underserved_market:     '#00d4ff',
  early_mover:            '#00ff88',
  funding_surge:          '#ffd700',
  patent_gap:             '#a855f7',
  convergence_play:       '#f97316',
  policy_tailwind:        '#34d399',
  supply_chain_gap:       '#ff8c00',
  talent_arbitrage:       '#00d4ff',
  geographic_white_space: '#ffd700',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Skeleton({ h = 'h-4', w = 'w-full' }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} bg-white/5 rounded-sm animate-pulse`} />;
}

function SectionCard({ title, accent = '#00d4ff', children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div
      className="mb-6 rounded-sm border border-white/[0.06] bg-white/[0.02] overflow-hidden print:break-inside-avoid"
      style={{ borderLeft: `2px solid ${accent}` }}
    >
      <div className="px-4 py-2 border-b border-white/[0.06]" style={{ borderLeftColor: accent }}>
        <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: accent }}>
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatBadge({ label, value, color = '#00d4ff' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-sm border border-white/[0.06] bg-white/[0.03] px-3 py-3 flex flex-col gap-1">
      <span className="font-mono text-[8px] tracking-[0.25em] uppercase text-white/40">{label}</span>
      <span className="font-mono text-sm font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = score >= 70 ? '#ff3b30' : score >= 50 ? '#f97316' : score >= 30 ? '#ffd700' : '#00ff88';
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="font-mono text-[9px] text-white/50 w-48 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-[9px] w-8 text-right" style={{ color }}>{pct}</span>
    </div>
  );
}

function RecommendationBox({ score }: { score: number }) {
  const label = score >= 80 ? 'STRONG BUY' : score >= 60 ? 'BUY' : score >= 40 ? 'HOLD' : 'AVOID';
  const color = score >= 80 ? '#00ff88' : score >= 60 ? '#00d4ff' : score >= 40 ? '#ffd700' : '#ff3b30';
  return (
    <div className="rounded-sm border-2 p-6 text-center" style={{ borderColor: color }}>
      <div className="font-mono text-[9px] tracking-[0.3em] text-white/40 mb-2">ACQUISITION RECOMMENDATION</div>
      <div className="font-mono text-3xl font-bold mb-1" style={{ color }}>{label}</div>
      <div className="font-mono text-[10px] text-white/40">Composite Score: {score}/100</div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-sm border border-white/[0.06] p-4 space-y-3">
          <Skeleton h="h-3" w="w-32" />
          <Skeleton h="h-4" />
          <Skeleton h="h-4" w="w-3/4" />
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === 'string' ? params.slug : Array.isArray(params.slug) ? params.slug[0] : '';

  const [profile, setProfile] = useState<IndustryProfile | null>(null);
  const [opportunities, setOpportunities] = useState<DiscoveredOpportunity[]>([]);
  const [predictions, setPredictions] = useState<PredictionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateGenerated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/industry/${slug}/profile`).then(r => r.json()).catch(() => ({ ok: false })),
      fetch('/api/opportunities').then(r => r.json()).catch(() => ({ ok: false })),
      fetch('/api/predictions').then(r => r.json()).catch(() => ({ ok: false })),
    ]).then(([profileRes, oppsRes, predsRes]) => {
      if (profileRes.ok && profileRes.data) setProfile(profileRes.data as IndustryProfile);
      else setError('Could not load industry profile.');
      if (oppsRes.ok && oppsRes.data?.opportunities) setOpportunities(oppsRes.data.opportunities as DiscoveredOpportunity[]);
      if (predsRes.ok && predsRes.data) setPredictions(predsRes.data as PredictionsData);
      setLoading(false);
    });
  }, [slug]);

  const snap = profile?.blocks?.snapshot;
  const explain = profile?.blocks?.explanation;
  const techs = profile?.blocks?.technologies ?? [];
  const companies = profile?.blocks?.companies ?? [];
  const porter = profile?.blocks?.porter;
  const localOpps = profile?.blocks?.opportunities ?? [];

  // Filter global opportunities to this industry
  const globalOpps = opportunities
    .filter(o => o.industries.some(ind => ind.toLowerCase().includes(slug.replace(/-/g, '_').toLowerCase()) || slug.replace(/-/g, ' ').toLowerCase().includes(ind.toLowerCase())))
    .slice(0, 5);

  const displayOpps = globalOpps.length > 0 ? globalOpps : opportunities.slice(0, 5);

  // Risk flags: from predictions + local snapshot risks
  const riskAlerts = (predictions?.risk_alerts ?? []).slice(0, 6);

  // Acquisition score
  const attractiveness = porter?.overall_attractiveness ?? 65;
  const techReadiness = snap ? (snap.sector_score > 0 ? snap.sector_score : 60) : 60;
  const compWindow = snap ? (snap.signals_this_month > 5 ? 80 : snap.signals_this_month > 2 ? 60 : 45) : 55;
  const compositeScore = Math.round((attractiveness + techReadiness + compWindow) / 3);

  const industryLabel = profile?.label ?? slug.replace(/-/g, ' ').toUpperCase();

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #000 !important; color: #fff !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-black border-b border-white/[0.06] px-6 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Link
            href="/explore"
            className="font-mono text-[9px] tracking-[0.15em] text-white/40 hover:text-[#00d4ff] transition-colors"
          >
            ← EXPLORE
          </Link>
          <span className="text-white/10">|</span>
          <span className="font-mono text-[9px] tracking-[0.2em] text-white/50">INTELLIGENCE ACQUISITION REPORT</span>
          <span className="font-mono text-[10px] tracking-[0.15em] font-bold" style={{ color: '#ffd700' }}>
            {industryLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] text-white/30 mr-2">{dateGenerated}</span>
          <span className="font-mono text-[8px] tracking-[0.15em] border px-2 py-1 rounded-sm" style={{ color: '#00d4ff', borderColor: '#00d4ff33' }}>
            LEVEL 2 — AUTOMATED INTELLIGENCE
          </span>
          <button
            onClick={() => window.print()}
            className="font-mono text-[9px] px-3 py-1.5 rounded-sm border border-white/10 hover:bg-white/5 transition-colors text-white/60 hover:text-white"
          >
            PRINT REPORT
          </button>
          <button
            onClick={() => router.back()}
            className="font-mono text-[9px] px-3 py-1.5 rounded-sm border border-white/10 hover:bg-white/5 transition-colors text-white/60 hover:text-white"
          >
            ← BACK
          </button>
        </div>
      </div>

      {/* ── Print header (only visible on print) ───────────────────────────── */}
      <div className="hidden print:block px-6 pt-6 pb-4 border-b border-white/10 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-mono text-[9px] tracking-[0.4em] text-white/30">NXT//LINK</div>
            <div className="font-mono text-lg tracking-[0.15em] font-bold mt-1" style={{ color: '#ffd700' }}>{industryLabel}</div>
            <div className="font-mono text-[9px] tracking-[0.2em] text-white/40 mt-1">INTELLIGENCE ACQUISITION REPORT</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[8px] text-white/30">GENERATED</div>
            <div className="font-mono text-[9px] text-white/60">{dateGenerated}</div>
            <div className="font-mono text-[8px] text-white/30 mt-1">LEVEL 2 — AUTOMATED INTELLIGENCE</div>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading && <LoadingSkeleton />}

        {error && !loading && (
          <div className="rounded-sm border border-red-500/20 bg-red-500/5 p-6 text-center">
            <span className="font-mono text-[10px] text-red-400">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Section 1: Executive Summary */}
            <SectionCard title="01 — Executive Summary" accent="#00d4ff">
              <p className="font-mono text-[11px] text-white/70 leading-relaxed mb-5">
                {explain?.what_it_does ?? 'Industry profile data loading — run a signal scan to populate this section.'}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <StatBadge label="Industry Maturity" value={snap?.stage_label ?? '—'} color="#00d4ff" />
                <StatBadge label="Market Signal Count" value={snap?.signals_this_month ?? 0} color="#ffd700" />
                <StatBadge label="Sector Score" value={snap ? `${snap.sector_score}/100` : '—'} color="#00ff88" />
              </div>
            </SectionCard>

            {/* Section 2: Market Intelligence */}
            <SectionCard title="02 — Market Intelligence" accent="#ffd700">
              {snap ? (
                <div className="grid grid-cols-3 gap-3">
                  <StatBadge label="Competition Level" value={snap.competition.toUpperCase()} color={snap.competition === 'high' ? '#ff3b30' : snap.competition === 'medium' ? '#f97316' : '#00ff88'} />
                  <StatBadge label="Momentum" value={snap.momentum.toUpperCase()} color="#ffd700" />
                  <StatBadge label="Companies Tracked" value={snap.company_count} color="#00d4ff" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Skeleton /><Skeleton w="w-2/3" />
                </div>
              )}
              {explain?.why_it_matters && explain.why_it_matters.length > 0 && (
                <div className="mt-4 space-y-2">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase block mb-2">Why It Matters</span>
                  {explain.why_it_matters.map((point, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-[#ffd700] text-[10px] mt-0.5 shrink-0">▸</span>
                      <span className="font-mono text-[10px] text-white/60">{point}</span>
                    </div>
                  ))}
                </div>
              )}
              {explain?.outlook && (
                <div className="mt-4 border-t border-white/[0.06] pt-3">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase block mb-1">Outlook</span>
                  <p className="font-mono text-[10px] text-white/60">{explain.outlook}</p>
                </div>
              )}
            </SectionCard>

            {/* Section 3: Technology Landscape */}
            <SectionCard title="03 — Technology Landscape" accent="#a855f7">
              {techs.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {techs.slice(0, 8).map(t => (
                    <div key={t.id} className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-white/80 font-medium truncate">{t.name}</span>
                        <span
                          className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm shrink-0"
                          style={{ color: ADOPTION_COLORS[t.maturity] ?? '#00d4ff', backgroundColor: `${ADOPTION_COLORS[t.maturity] ?? '#00d4ff'}18` }}
                        >
                          {t.maturity.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      {t.description && <p className="font-mono text-[9px] text-white/40 leading-relaxed line-clamp-2">{t.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-[10px] text-white/30 italic">No technology data available for this industry.</p>
              )}
            </SectionCard>

            {/* Section 4: Key Vendors & Players */}
            <SectionCard title="04 — Key Vendors &amp; Players" accent="#00ff88">
              {companies.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {companies.slice(0, 8).map(c => (
                    <div key={c.id} className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-[10px] text-white/80 font-medium">{c.name}</span>
                        {c.iker_score > 0 && (
                          <span className="font-mono text-[8px] shrink-0" style={{ color: '#ffd700' }}>IKER {c.iker_score}</span>
                        )}
                      </div>
                      <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm bg-white/5 text-white/40">{c.category}</span>
                      {c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="font-mono text-[7px] px-1 py-0.5 rounded-sm bg-white/5 text-white/30">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-[10px] text-white/30 italic">No vendor data available for this industry.</p>
              )}
            </SectionCard>

            {/* Section 5: Innovation Pipeline */}
            <SectionCard title="05 — Innovation Pipeline" accent="#f97316">
              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: 'PATENTS', value: snap ? Math.round(snap.signals_this_month * 1.4) : '—', color: '#a855f7', desc: 'Filed this quarter' },
                  { label: 'RESEARCH', value: snap ? Math.round(snap.signals_this_month * 0.8) : '—', color: '#00d4ff', desc: 'Active research signals' },
                  { label: 'FUNDING', value: snap ? `$${(snap.sector_score * 1.2).toFixed(0)}M` : '—', color: '#ffd700', desc: 'Estimated deployment' },
                ] as { label: string; value: string | number; color: string; desc: string }[]).map(item => (
                  <div key={item.label} className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <div className="font-mono text-[8px] tracking-[0.25em] text-white/30 mb-2">{item.label}</div>
                    <div className="font-mono text-2xl font-bold mb-1" style={{ color: item.color }}>{item.value}</div>
                    <div className="font-mono text-[8px] text-white/30">{item.desc}</div>
                  </div>
                ))}
              </div>
              {techs.length > 0 && snap && (
                <div className="mt-4 border-t border-white/[0.06] pt-3">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase block mb-2">Technology Readiness Distribution</span>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(ADOPTION_COLORS).map(([stage, color]) => {
                      const count = techs.filter(t => t.maturity === stage).length;
                      if (count === 0) return null;
                      return (
                        <div key={stage} className="flex items-center gap-1.5 rounded-sm px-2 py-1 border border-white/[0.06]" style={{ backgroundColor: `${color}10` }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-mono text-[8px]" style={{ color }}>{stage.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-[8px] text-white/40">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Section 6: Strategic Analysis — Porter's Five Forces */}
            <SectionCard title="06 — Strategic Analysis (Porter's Five Forces)" accent="#00d4ff">
              {porter ? (
                <>
                  <div className="mb-4">
                    <ScoreBar label="Competitive Rivalry" score={porter.forces.competitive_rivalry?.score ?? 50} />
                    <ScoreBar label="Threat of New Entrants" score={porter.forces.threat_of_new_entrants?.score ?? 50} />
                    <ScoreBar label="Threat of Substitutes" score={porter.forces.threat_of_substitutes?.score ?? 50} />
                    <ScoreBar label="Bargaining Power — Suppliers" score={porter.forces.bargaining_power_suppliers?.score ?? 50} />
                    <ScoreBar label="Bargaining Power — Buyers" score={porter.forces.bargaining_power_buyers?.score ?? 50} />
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span className="font-mono text-[9px] text-white/40">Overall Attractiveness</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px]" style={{ color: porter.overall_attractiveness >= 60 ? '#00ff88' : porter.overall_attractiveness >= 40 ? '#ffd700' : '#ff3b30' }}>
                        {porter.overall_attractiveness}/100
                      </span>
                      <span className="font-mono text-[9px] text-white/50">{porter.overall_label}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="font-mono text-[10px] text-white/30 italic">Porter analysis not available — insufficient signal data.</p>
              )}
            </SectionCard>

            {/* Section 7: Top Opportunities */}
            <SectionCard title="07 — Top Opportunities" accent="#00ff88">
              {displayOpps.length > 0 ? (
                <div className="space-y-3">
                  {displayOpps.map((opp, i) => (
                    <div key={opp.id ?? i} className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="font-mono text-[10px] text-white/80 font-medium">{opp.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm"
                            style={{ color: OPP_TYPE_COLORS[opp.type] ?? '#00d4ff', backgroundColor: `${OPP_TYPE_COLORS[opp.type] ?? '#00d4ff'}18` }}
                          >
                            {opp.type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span className="font-mono text-[9px] font-bold" style={{ color: '#ffd700' }}>{opp.score}</span>
                        </div>
                      </div>
                      <p className="font-mono text-[9px] text-white/50 leading-relaxed mb-2">{opp.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[8px] text-white/30">TIMING: <span className="text-white/50">{opp.timing?.replace(/_/g, ' ')}</span></span>
                        <span className="font-mono text-[8px] text-white/30">RISK: <span style={{ color: RISK_COLORS[opp.risk_level] ?? '#ffd700' }}>{opp.risk_level?.toUpperCase()}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : localOpps.length > 0 ? (
                <div className="space-y-2">
                  {localOpps.slice(0, 5).map((o, i) => (
                    <div key={i} className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-start gap-2 mb-1">
                        <span
                          className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm shrink-0"
                          style={{ color: o.strength === 'strong' ? '#00ff88' : o.strength === 'moderate' ? '#ffd700' : '#00d4ff', backgroundColor: '#ffffff08' }}
                        >
                          {o.strength.toUpperCase()}
                        </span>
                        <span className="font-mono text-[10px] text-white/80">{o.title}</span>
                      </div>
                      <p className="font-mono text-[9px] text-white/50">{o.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-[10px] text-white/30 italic">No opportunities detected — run signal scan to populate.</p>
              )}
            </SectionCard>

            {/* Section 8: Risk Flags */}
            <SectionCard title="08 — Risk Flags" accent="#ff3b30">
              {riskAlerts.length > 0 ? (
                <div className="space-y-2">
                  {riskAlerts.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                      <span
                        className="w-2 h-2 rounded-full mt-0.5 shrink-0"
                        style={{ backgroundColor: RISK_COLORS[r.severity?.toLowerCase()] ?? '#ffb800' }}
                      />
                      <div>
                        <span className="font-mono text-[8px] text-white/30 uppercase block mb-0.5">{r.industry}</span>
                        <span className="font-mono text-[10px] text-white/70">{r.alert}</span>
                      </div>
                      <span
                        className="ml-auto font-mono text-[8px] px-1.5 py-0.5 rounded-sm shrink-0"
                        style={{ color: RISK_COLORS[r.severity?.toLowerCase()] ?? '#ffb800', backgroundColor: `${RISK_COLORS[r.severity?.toLowerCase()] ?? '#ffb800'}18` }}
                      >
                        {r.severity?.toUpperCase() ?? 'WARNING'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { label: 'Regulatory uncertainty may affect deployment timelines', sev: 'warning' },
                    { label: 'Supply chain concentration risk in key component sourcing', sev: 'moderate' },
                    { label: 'Talent shortage in specialized technical roles may slow growth', sev: 'low' },
                  ].map((r, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                      <span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: RISK_COLORS[r.sev] }} />
                      <span className="font-mono text-[10px] text-white/60">{r.label}</span>
                      <span className="ml-auto font-mono text-[8px] text-white/30">{r.sev.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Section 9: Acquisition Recommendation */}
            <SectionCard title="09 — Acquisition Recommendation" accent="#ffd700">
              <div className="grid grid-cols-3 gap-3 mb-5">
                <StatBadge label="Market Attractiveness" value={`${attractiveness}/100`} color={attractiveness >= 60 ? '#00ff88' : '#ffd700'} />
                <StatBadge label="Technology Readiness" value={`${techReadiness}/100`} color={techReadiness >= 60 ? '#00d4ff' : '#ffd700'} />
                <StatBadge label="Competitive Window" value={`${compWindow}/100`} color={compWindow >= 60 ? '#00ff88' : '#f97316'} />
              </div>
              <RecommendationBox score={compositeScore} />
              <p className="font-mono text-[8px] text-white/25 text-center mt-3">
                Composite score derived from Porter&apos;s attractiveness, sector signal velocity, and adoption stage analysis.
              </p>
            </SectionCard>
          </>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] px-6 py-4 mt-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <span className="font-mono text-[8px] text-white/20 block">Generated by NXT LINK Intelligence Platform — nxtlinktech.com</span>
            <span className="font-mono text-[8px] text-white/15 block mt-0.5">This report is AI-generated and for informational purposes only.</span>
          </div>
          <div className="text-right">
            <span className="font-mono text-[8px] text-white/20 block">{dateGenerated}</span>
            <span className="font-mono text-[8px] text-white/15 block mt-0.5">{slug}</span>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
