'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type Solution = {
  name: string;
  description: string;
  maturity: string;
  estimated_timeline: string;
  confidence: number;
};

type RecommendedProduct = {
  technology: string;
  why_it_fits: string;
  vendors_offering_it: string[];
};

type CompanyUsing = {
  company: string;
  technology: string;
  evidence: string;
};

type PilotPlan = {
  phase1: string;
  phase2: string;
  phase3: string;
  estimated_cost_range: string;
  timeline: string;
};

type SolverResponse = {
  diagnosis: string;
  solutions: Solution[];
  recommended_products: RecommendedProduct[];
  companies_using_it: CompanyUsing[];
  pilot_plan: PilotPlan;
};

type Props = {
  industrySlug: string;
  industryLabel: string;
  accentColor: string;
  initialProblem?: string;
  onProblemChange?: (text: string) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceColor(value: number): string {
  if (value >= 0.8) return '#00ff88';
  if (value >= 0.6) return '#ffb800';
  return 'rgba(255,255,255,0.30)';
}

function maturityScale(label: string): { level: number; text: string; color: string } {
  const lower = label.toLowerCase();
  if (lower.includes('widespread') || lower.includes('mature') || lower === '5')
    return { level: 5, text: 'Widespread', color: '#00ff88' };
  if (lower.includes('commercial') || lower === '4')
    return { level: 4, text: 'Commercial', color: '#00ff88' };
  if (lower.includes('early') || lower.includes('growing') || lower === '3')
    return { level: 3, text: 'Early Product', color: '#ffb800' };
  if (lower.includes('prototype') || lower === '2')
    return { level: 2, text: 'Prototype', color: '#00d4ff' };
  if (lower.includes('research') || lower.includes('emerging') || lower === '1')
    return { level: 1, text: 'Research', color: '#00d4ff' };
  // default to level 3
  return { level: 3, text: label, color: '#ffb800' };
}

function techSlug(name: string): string {
  return 'tech-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProblemSolver({ industrySlug, industryLabel, accentColor, initialProblem, onProblemChange }: Props) {
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SolverResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [expandedEvidence, setExpandedEvidence] = useState<Record<number, boolean>>({});

  const prevInitialRef = useRef<string | undefined>(undefined);

  // When initialProblem changes externally, auto-fill and auto-submit
  useEffect(() => {
    if (initialProblem && initialProblem !== prevInitialRef.current) {
      prevInitialRef.current = initialProblem;
      setProblem(initialProblem);
      // Auto-submit after state update
      const timer = setTimeout(() => {
        submitProblem(initialProblem);
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProblem]);

  function handleProblemChange(text: string) {
    setProblem(text);
    onProblemChange?.(text);
  }

  async function submitProblem(text: string) {
    if (text.trim().length < 10) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setExpandedEvidence({});

    try {
      const res = await fetch('/api/industry/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: industrySlug, problem_text: text }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Analysis failed');
        return;
      }

      setResponse(data.response);
      setProvider(data._provider ?? '');
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    await submitProblem(problem);
  }

  function toggleEvidence(index: number) {
    setExpandedEvidence((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Input */}
      <div className="flex flex-col gap-3">
        <label className="font-mono text-[8px] tracking-[0.2em] text-white/30">
          DESCRIBE YOUR {industryLabel.toUpperCase()} PROBLEM
        </label>
        <textarea
          value={problem}
          onChange={(e) => handleProblemChange(e.target.value)}
          placeholder={`Example: "Our warehouse picking accuracy is 94% but we need 99.5% for our biggest client..."`}
          className="w-full h-32 bg-white/[0.03] border border-white/[0.08] rounded-sm p-3 font-mono text-[10px] text-white/70 placeholder:text-white/15 focus:border-white/20 focus:outline-none resize-none transition-colors"
        />
        <div className="flex items-center justify-between">
          <span className="font-mono text-[7px] text-white/15">
            {problem.length}/2000
          </span>
          <button
            onClick={handleSubmit}
            disabled={loading || problem.trim().length < 10}
            className="font-mono text-[9px] tracking-wider px-5 py-2 rounded-sm border font-bold transition-all disabled:opacity-30"
            style={{
              color: loading ? 'rgba(255,255,255,0.3)' : accentColor,
              borderColor: loading ? 'rgba(255,255,255,0.1)' : `${accentColor}50`,
              background: loading ? 'transparent' : `${accentColor}10`,
            }}
          >
            {loading ? 'ANALYZING...' : 'ANALYZE PROBLEM'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${accentColor}30`, borderTopColor: accentColor }} />
          <span className="font-mono text-[8px] text-white/25 tracking-wider">
            CONSULTING {industryLabel.toUpperCase()} INTELLIGENCE...
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 border border-[#ff3b30]/30 bg-[#ff3b30]/[0.06] rounded-sm">
          <span className="font-mono text-[9px] text-[#ff3b30]/80">{error}</span>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="flex flex-col gap-5">
          {/* Provider badge */}
          {provider && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[7px] tracking-wider text-white/15">
                ANALYZED BY {provider.toUpperCase()}
              </span>
            </div>
          )}

          {/* Diagnosis */}
          <ResponseSection title="DIAGNOSIS" color="#ff6400">
            <p className="font-mono text-[9px] text-white/60 leading-relaxed">
              {response.diagnosis}
            </p>
          </ResponseSection>

          {/* Solutions */}
          <ResponseSection title="RECOMMENDED SOLUTIONS" color={accentColor}>
            <div className="space-y-2">
              {response.solutions.map((sol, i) => {
                const readiness = maturityScale(sol.maturity);
                const confColor = confidenceColor(sol.confidence);
                return (
                  <div key={i} className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-sm">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[9px] text-white/70 font-bold">{sol.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Confidence badge */}
                        <span
                          className="font-mono text-[7px] tracking-wider px-1.5 py-0.5 rounded-sm"
                          style={{
                            color: confColor,
                            backgroundColor: `${confColor}15`,
                            border: `1px solid ${confColor}30`,
                          }}
                        >
                          {Math.round(sol.confidence * 100)}% CONF
                        </span>
                        {/* Readiness badge */}
                        <span
                          className="font-mono text-[7px] tracking-wider px-1.5 py-0.5 rounded-sm"
                          style={{
                            color: readiness.color,
                            backgroundColor: `${readiness.color}15`,
                            border: `1px solid ${readiness.color}30`,
                          }}
                        >
                          TRL {readiness.level} {readiness.text.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p className="font-mono text-[8px] text-white/40 leading-relaxed mb-1.5">{sol.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[7px] text-white/20">{sol.estimated_timeline}</span>
                      {/* Evidence toggle */}
                      <button
                        onClick={() => toggleEvidence(i)}
                        className="font-mono text-[7px] tracking-wider text-white/25 hover:text-white/45 transition-colors"
                      >
                        {expandedEvidence[i] ? '- HIDE EVIDENCE' : '+ SHOW EVIDENCE'}
                      </button>
                    </div>
                    {/* Evidence section */}
                    {expandedEvidence[i] && (
                      <div className="mt-2 pt-2 border-t border-white/[0.04]">
                        <p className="font-mono text-[7px] text-white/30 leading-relaxed">
                          Matched based on problem keywords against technology capability profiles.
                          Confidence derived from keyword overlap ({Math.round(sol.confidence * 100)}%)
                          and maturity assessment ({readiness.text}).
                          Technology readiness level {readiness.level}/5 indicates {readiness.level >= 4 ? 'production-ready deployment' : readiness.level >= 3 ? 'early production viability' : 'continued R&D investment needed'}.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ResponseSection>

          {/* Products */}
          {response.recommended_products.length > 0 && (
            <ResponseSection title="MATCHING PRODUCTS" color="#00d4ff">
              <div className="space-y-2">
                {response.recommended_products.map((p, i) => (
                  <div key={i} className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[9px] text-white/70 font-bold">{p.technology}</span>
                      <Link
                        href={`/technology/${techSlug(p.technology)}`}
                        className="font-mono text-[7px] tracking-wider px-2 py-0.5 rounded-sm border transition-colors"
                        style={{
                          color: '#00d4ff',
                          borderColor: 'rgba(0,212,255,0.25)',
                          background: 'rgba(0,212,255,0.06)',
                        }}
                      >
                        VIEW TECHNOLOGY &rarr;
                      </Link>
                    </div>
                    <p className="font-mono text-[8px] text-white/40 leading-relaxed mt-1">{p.why_it_fits}</p>
                    {p.vendors_offering_it.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.vendors_offering_it.map((v) => (
                          <span key={v} className="font-mono text-[7px] px-1.5 py-0.5 rounded-sm bg-white/[0.04] text-white/40">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ResponseSection>
          )}

          {/* Companies Using It */}
          {response.companies_using_it.length > 0 && (
            <ResponseSection title="WHO&apos;S USING IT" color="#ffb800">
              <div className="space-y-1">
                {response.companies_using_it.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 px-2 py-1.5">
                    <span className="font-mono text-[7px] mt-px" style={{ color: '#ffb800' }}>&#8250;</span>
                    <div>
                      <span className="font-mono text-[8px] text-white/60 font-bold">{c.company}</span>
                      <span className="font-mono text-[8px] text-white/25"> &mdash; {c.technology}</span>
                      <p className="font-mono text-[7px] text-white/20 mt-0.5">{c.evidence}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ResponseSection>
          )}

          {/* Pilot Plan */}
          {response.pilot_plan && (
            <ResponseSection title="90-DAY PILOT PLAN" color="#00ff88">
              <div className="space-y-2">
                <PilotPhase phase="PHASE 1" text={response.pilot_plan.phase1} color="#00ff88" />
                <PilotPhase phase="PHASE 2" text={response.pilot_plan.phase2} color="#00d4ff" />
                <PilotPhase phase="PHASE 3" text={response.pilot_plan.phase3} color="#ffb800" />
                <div className="flex items-center gap-4 pt-2 border-t border-white/[0.04]">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[7px] tracking-wider text-white/20">EST. COST</span>
                    <span className="font-mono text-[9px] text-white/50">{response.pilot_plan.estimated_cost_range}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[7px] tracking-wider text-white/20">TIMELINE</span>
                    <span className="font-mono text-[9px] text-white/50">{response.pilot_plan.timeline}</span>
                  </div>
                </div>
              </div>
            </ResponseSection>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResponseSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-1 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}80` }} />
        <span className="font-mono text-[8px] tracking-[0.2em] text-white/40">{title}</span>
      </div>
      {children}
    </div>
  );
}

function PilotPhase({ phase, text, color }: { phase: string; text: string; color: string }) {
  return (
    <div className="flex items-start gap-2 p-2 bg-white/[0.02] border border-white/[0.04] rounded-sm">
      <span className="font-mono text-[7px] tracking-wider shrink-0 mt-0.5" style={{ color }}>{phase}</span>
      <p className="font-mono text-[8px] text-white/45 leading-relaxed">{text}</p>
    </div>
  );
}
