'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type {
  AgentRunOutput,
  AgentStepResult,
  DiscoveryOutput,
  VettingOutput,
  ComparisonOutput,
  PilotDesignOutput,
  MarketIntelOutput,
} from '@/lib/agents/types';

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

type AnalysisMode = 'quick' | 'deep';

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

function deepConfidenceColor(value: number): string {
  if (value >= 8) return '#00ff88';
  if (value >= 5) return '#ffb800';
  return '#ff3b30';
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

const DEEP_LOADING_STAGES = [
  'ORCHESTRATING AGENT PIPELINE...',
  'RUNNING DISCOVERY AGENT...',
  'RUNNING VETTING AGENT...',
  'RUNNING COMPARISON AGENT...',
  'RUNNING MARKET INTEL AGENT...',
  'SYNTHESIZING RESULTS...',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ProblemSolver({ industrySlug, industryLabel, accentColor, initialProblem, onProblemChange }: Props) {
  const [problem, setProblem] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('quick');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [response, setResponse] = useState<SolverResponse | null>(null);
  const [agentRun, setAgentRun] = useState<AgentRunOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [expandedEvidence, setExpandedEvidence] = useState<Record<number, boolean>>({});
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const prevInitialRef = useRef<string | undefined>(undefined);
  const loadingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // When initialProblem changes externally, auto-fill and auto-submit
  useEffect(() => {
    if (initialProblem && initialProblem !== prevInitialRef.current) {
      prevInitialRef.current = initialProblem;
      setProblem(initialProblem);
      // Auto-submit after state update
      const timer = setTimeout(() => {
        submitQuick(initialProblem);
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProblem]);

  function handleProblemChange(text: string) {
    setProblem(text);
    onProblemChange?.(text);
  }

  function clearResults() {
    setResponse(null);
    setAgentRun(null);
    setError(null);
    setProvider('');
    setExpandedEvidence({});
    setExpandedAgent(null);
  }

  function startLoadingStages() {
    setLoadingStage(0);
    loadingInterval.current = setInterval(() => {
      setLoadingStage((prev) => (prev + 1) % DEEP_LOADING_STAGES.length);
    }, 4000);
  }

  function stopLoadingStages() {
    if (loadingInterval.current) {
      clearInterval(loadingInterval.current);
      loadingInterval.current = null;
    }
  }

  async function submitQuick(text: string) {
    if (text.trim().length < 10) return;
    setLoading(true);
    clearResults();

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
      setError('Network error -- try again');
    } finally {
      setLoading(false);
    }
  }

  async function submitDeep(text: string) {
    if (text.trim().length < 40) {
      setError('Deep analysis requires at least 40 characters. Describe your problem in more detail.');
      return;
    }
    setLoading(true);
    clearResults();
    startLoadingStages();

    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: 'Problem Solver Query',
          industry: industrySlug,
          city: 'El Paso, Texas',
          problem_statement: text,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? 'Agent pipeline failed');
        return;
      }

      setAgentRun(data.run ?? null);
      setProvider(data.run?.providers_used?.join(', ') ?? '');
    } catch {
      setError('Network error -- try again');
    } finally {
      setLoading(false);
      stopLoadingStages();
    }
  }

  async function handleSubmit() {
    if (mode === 'quick') {
      await submitQuick(problem);
    } else {
      await submitDeep(problem);
    }
  }

  function toggleEvidence(index: number) {
    setExpandedEvidence((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function toggleAgent(name: string) {
    setExpandedAgent((prev) => (prev === name ? null : name));
  }

  const canSubmit = mode === 'quick' ? problem.trim().length >= 10 : problem.trim().length >= 40;

  return (
    <div className="flex flex-col gap-6">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setMode('quick'); clearResults(); }}
          className="font-mono text-[8px] tracking-[0.15em] px-3 py-1.5 rounded-sm border transition-all"
          style={{
            color: mode === 'quick' ? accentColor : 'rgba(255,255,255,0.25)',
            borderColor: mode === 'quick' ? `${accentColor}50` : 'rgba(255,255,255,0.08)',
            background: mode === 'quick' ? `${accentColor}10` : 'transparent',
          }}
        >
          QUICK ANALYSIS
        </button>
        <button
          onClick={() => { setMode('deep'); clearResults(); }}
          className="font-mono text-[8px] tracking-[0.15em] px-3 py-1.5 rounded-sm border transition-all"
          style={{
            color: mode === 'deep' ? '#00d4ff' : 'rgba(255,255,255,0.25)',
            borderColor: mode === 'deep' ? 'rgba(0,212,255,0.50)' : 'rgba(255,255,255,0.08)',
            background: mode === 'deep' ? 'rgba(0,212,255,0.10)' : 'transparent',
          }}
        >
          DEEP AGENT ANALYSIS
        </button>
        <span className="font-mono text-[7px] text-white/15 ml-2">
          {mode === 'quick' ? 'Single LLM pass' : '5 specialist agents + synthesis'}
        </span>
      </div>

      {/* Input */}
      <div className="flex flex-col gap-3">
        <label className="font-mono text-[8px] tracking-[0.2em] text-white/30">
          DESCRIBE YOUR {industryLabel.toUpperCase()} PROBLEM
        </label>
        <textarea
          value={problem}
          onChange={(e) => handleProblemChange(e.target.value)}
          placeholder={
            mode === 'quick'
              ? `Example: "Our warehouse picking accuracy is 94% but we need 99.5% for our biggest client..."`
              : `Describe your problem in detail (40+ characters). Example: "We need to modernize our border logistics tracking system to handle 3x volume increase while maintaining CBP compliance..."`
          }
          className="w-full h-32 bg-white/[0.03] border border-white/[0.08] rounded-sm p-3 font-mono text-[10px] text-white/70 placeholder:text-white/15 focus:border-white/20 focus:outline-none resize-none transition-colors"
        />
        <div className="flex items-center justify-between">
          <span className="font-mono text-[7px] text-white/15">
            {problem.length}/2000{mode === 'deep' && problem.trim().length < 40 ? ' (min 40 for deep)' : ''}
          </span>
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="font-mono text-[9px] tracking-wider px-5 py-2 rounded-sm border font-bold transition-all disabled:opacity-30"
            style={{
              color: loading ? 'rgba(255,255,255,0.3)' : mode === 'deep' ? '#00d4ff' : accentColor,
              borderColor: loading ? 'rgba(255,255,255,0.1)' : mode === 'deep' ? 'rgba(0,212,255,0.50)' : `${accentColor}50`,
              background: loading ? 'transparent' : mode === 'deep' ? 'rgba(0,212,255,0.10)' : `${accentColor}10`,
            }}
          >
            {loading
              ? mode === 'deep' ? 'RUNNING AGENTS...' : 'ANALYZING...'
              : mode === 'deep' ? 'RUN DEEP ANALYSIS' : 'ANALYZE PROBLEM'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: mode === 'deep' ? 'rgba(0,212,255,0.3)' : `${accentColor}30`,
              borderTopColor: mode === 'deep' ? '#00d4ff' : accentColor,
            }}
          />
          <span className="font-mono text-[8px] text-white/25 tracking-wider">
            {mode === 'deep' ? DEEP_LOADING_STAGES[loadingStage] : `CONSULTING ${industryLabel.toUpperCase()} INTELLIGENCE...`}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 border border-[#ff3b30]/30 bg-[#ff3b30]/[0.06] rounded-sm">
          <span className="font-mono text-[9px] text-[#ff3b30]/80">{error}</span>
        </div>
      )}

      {/* Quick Response */}
      {response && <QuickResponseView response={response} provider={provider} accentColor={accentColor} expandedEvidence={expandedEvidence} toggleEvidence={toggleEvidence} />}

      {/* Deep Agent Response */}
      {agentRun && <DeepResponseView agentRun={agentRun} provider={provider} expandedAgent={expandedAgent} toggleAgent={toggleAgent} />}
    </div>
  );
}

// ─── Quick Response View ─────────────────────────────────────────────────────

function QuickResponseView({
  response,
  provider,
  accentColor,
  expandedEvidence,
  toggleEvidence,
}: {
  response: SolverResponse;
  provider: string;
  accentColor: string;
  expandedEvidence: Record<number, boolean>;
  toggleEvidence: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
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
                  <button
                    onClick={() => toggleEvidence(i)}
                    className="font-mono text-[7px] tracking-wider text-white/25 hover:text-white/45 transition-colors"
                  >
                    {expandedEvidence[i] ? '- HIDE EVIDENCE' : '+ SHOW EVIDENCE'}
                  </button>
                </div>
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
  );
}

// ─── Deep Agent Response View ────────────────────────────────────────────────

function DeepResponseView({
  agentRun,
  provider,
  expandedAgent,
  toggleAgent,
}: {
  agentRun: AgentRunOutput;
  provider: string;
  expandedAgent: string | null;
  toggleAgent: (name: string) => void;
}) {
  const synthesis = agentRun.synthesis;
  const confColor = deepConfidenceColor(synthesis.confidence_score);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[7px] tracking-wider text-white/15">
          {agentRun.steps.length} AGENTS / {Math.round(agentRun.total_latency_ms / 1000)}s
        </span>
        {provider && (
          <span className="font-mono text-[7px] tracking-wider text-white/15">
            VIA {provider.toUpperCase()}
          </span>
        )}
      </div>

      {/* Synthesis */}
      <ResponseSection title="EXECUTIVE SUMMARY" color="#00d4ff">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[9px] text-white/60 leading-relaxed">
            {synthesis.executive_summary}
          </p>

          {/* Confidence gauge */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[7px] tracking-wider text-white/25">CONFIDENCE</span>
            <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(synthesis.confidence_score / 10) * 100}%`,
                  background: confColor,
                  boxShadow: `0 0 6px ${confColor}80`,
                }}
              />
            </div>
            <span
              className="font-mono text-[9px] font-bold"
              style={{ color: confColor }}
            >
              {synthesis.confidence_score}/10
            </span>
          </div>
        </div>
      </ResponseSection>

      {/* Top Vendors */}
      {synthesis.top_vendors.length > 0 && (
        <ResponseSection title="TOP VENDORS" color="#ffb800">
          <div className="flex flex-wrap gap-1.5">
            {synthesis.top_vendors.map((v) => (
              <span
                key={v}
                className="font-mono text-[8px] px-2 py-1 rounded-sm border border-[#ffb800]/20 bg-[#ffb800]/[0.06] text-[#ffb800]/80"
              >
                {v}
              </span>
            ))}
          </div>
        </ResponseSection>
      )}

      {/* Recommended Pilot Path */}
      <ResponseSection title="RECOMMENDED PILOT PATH" color="#00ff88">
        <p className="font-mono text-[9px] text-white/60 leading-relaxed">
          {synthesis.recommended_pilot_path}
        </p>
      </ResponseSection>

      {/* Next Actions */}
      {synthesis.next_actions.length > 0 && (
        <ResponseSection title="NEXT ACTIONS" color="#00d4ff">
          <div className="space-y-1">
            {synthesis.next_actions.map((action, i) => (
              <div key={i} className="flex items-start gap-2 px-2 py-1">
                <span className="font-mono text-[8px] text-[#00d4ff]/50 mt-px">{i + 1}.</span>
                <span className="font-mono text-[8px] text-white/50 leading-relaxed">{action}</span>
              </div>
            ))}
          </div>
        </ResponseSection>
      )}

      {/* Agent Steps (Accordion) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-3 rounded-full bg-white/10" />
          <span className="font-mono text-[8px] tracking-[0.2em] text-white/40">AGENT DETAILS</span>
        </div>
        {agentRun.steps.map((step) => (
          <AgentStepCard
            key={step.agent}
            step={step}
            isExpanded={expandedAgent === step.agent}
            onToggle={() => toggleAgent(step.agent)}
          />
        ))}
      </div>

      {/* Routing info */}
      <div className="p-3 bg-white/[0.015] border border-white/[0.04] rounded-sm">
        <span className="font-mono text-[7px] tracking-wider text-white/20 block mb-1">ROUTING DECISION</span>
        <p className="font-mono text-[7px] text-white/30 leading-relaxed">{agentRun.routing.routing_reasoning}</p>
      </div>
    </div>
  );
}

// ─── Agent Step Card ─────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  discovery: '#00d4ff',
  vetting: '#ffb800',
  comparison: '#00ff88',
  pilot_design: '#f97316',
  market_intel: '#a855f7',
};

const AGENT_LABELS: Record<string, string> = {
  discovery: 'VENDOR DISCOVERY',
  vetting: 'VENDOR VETTING',
  comparison: 'COMPARISON',
  pilot_design: 'PILOT DESIGN',
  market_intel: 'MARKET INTEL',
};

function AgentStepCard({ step, isExpanded, onToggle }: { step: AgentStepResult; isExpanded: boolean; onToggle: () => void }) {
  const color = AGENT_COLORS[step.agent] ?? '#00d4ff';
  const label = AGENT_LABELS[step.agent] ?? step.agent.toUpperCase();
  const isSuccess = step.status === 'success';

  return (
    <div className="border border-white/[0.04] rounded-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: isSuccess ? color : '#ff3b30' }} />
          <span className="font-mono text-[8px] tracking-wider" style={{ color: isSuccess ? color : '#ff3b30' }}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[7px] text-white/15">
            {Math.round(step.latency_ms / 1000)}s
          </span>
          <span className="font-mono text-[7px] text-white/25">
            {isExpanded ? '−' : '+'}
          </span>
        </div>
      </button>

      {isExpanded && isSuccess && (
        <div className="px-3 pb-3 border-t border-white/[0.04]">
          <AgentOutputDetail agent={step.agent} output={step.output} color={color} />
        </div>
      )}

      {isExpanded && !isSuccess && step.error && (
        <div className="px-3 pb-3 border-t border-white/[0.04]">
          <p className="font-mono text-[8px] text-[#ff3b30]/60 mt-2">{step.error}</p>
        </div>
      )}
    </div>
  );
}

// ─── Agent Output Detail Renderer ────────────────────────────────────────────

function AgentOutputDetail({ agent, output, color }: { agent: string; output: AgentStepResult['output']; color: string }) {
  if (agent === 'discovery') {
    const data = output as DiscoveryOutput;
    return (
      <div className="mt-2 space-y-2">
        <span className="font-mono text-[7px] text-white/20 block">{data.search_strategy}</span>
        {data.vendors_found.map((v, i) => (
          <div key={i} className="flex items-start gap-2 p-2 bg-white/[0.02] rounded-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8px] text-white/60 font-bold">{v.name}</span>
                <span className="font-mono text-[7px] px-1 py-0.5 rounded-sm" style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}25` }}>
                  {Math.round(v.confidence * 100)}%
                </span>
              </div>
              <span className="font-mono text-[7px] text-white/25 block">{v.category}</span>
              <p className="font-mono text-[7px] text-white/30 mt-0.5">{v.relevance_reasoning}</p>
            </div>
          </div>
        ))}
        {data.coverage_gaps.length > 0 && (
          <div className="pt-1">
            <span className="font-mono text-[7px] text-white/20 block mb-1">COVERAGE GAPS</span>
            {data.coverage_gaps.map((g, i) => (
              <span key={i} className="font-mono text-[7px] text-[#ff3b30]/40 block">- {g}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (agent === 'vetting') {
    const data = output as VettingOutput;
    return (
      <div className="mt-2 space-y-2">
        <span className="font-mono text-[7px] text-white/20 block">{data.vetting_methodology}</span>
        {data.vendor_scores.map((v, i) => (
          <div key={i} className="p-2 bg-white/[0.02] rounded-sm space-y-1.5">
            <span className="font-mono text-[8px] text-white/60 font-bold block">{v.vendor_name}</span>
            <div className="flex gap-3">
              <ScoreBadge label="SIGNAL" value={v.signal_score} max={10} color="#00d4ff" />
              <ScoreBadge label="READINESS" value={v.deployment_readiness_score} max={10} color="#00ff88" />
              <ScoreBadge label="FIT" value={v.fit_score} max={10} color="#ffb800" />
            </div>
            {v.green_flags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {v.green_flags.map((f, fi) => (
                  <span key={fi} className="font-mono text-[6px] px-1 py-0.5 rounded-sm bg-[#00ff88]/[0.06] text-[#00ff88]/50 border border-[#00ff88]/15">{f}</span>
                ))}
              </div>
            )}
            {v.red_flags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {v.red_flags.map((f, fi) => (
                  <span key={fi} className="font-mono text-[6px] px-1 py-0.5 rounded-sm bg-[#ff3b30]/[0.06] text-[#ff3b30]/50 border border-[#ff3b30]/15">{f}</span>
                ))}
              </div>
            )}
            <p className="font-mono text-[7px] text-white/25">{v.impartiality_notes}</p>
          </div>
        ))}
      </div>
    );
  }

  if (agent === 'comparison') {
    const data = output as ComparisonOutput;
    return (
      <div className="mt-2 space-y-2">
        <p className="font-mono text-[8px] text-white/50 leading-relaxed">{data.recommendation_narrative}</p>
        {data.clear_winner && (
          <span className="font-mono text-[7px] px-2 py-0.5 rounded-sm bg-[#00ff88]/[0.08] text-[#00ff88]/60 border border-[#00ff88]/20 inline-block">
            WINNER: {data.clear_winner}
          </span>
        )}
        {data.comparison_table.map((row, i) => (
          <div key={i} className="p-2 bg-white/[0.02] rounded-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[8px] text-white/60 font-bold">{row.vendor_name}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[6px] px-1 py-0.5 rounded-sm bg-white/[0.04] text-white/30">{row.cost_range}</span>
                <span className="font-mono text-[6px] px-1 py-0.5 rounded-sm bg-white/[0.04] text-white/30">{row.integration_complexity}</span>
                {row.smb_suitable && <span className="font-mono text-[6px] px-1 py-0.5 rounded-sm bg-[#00ff88]/[0.06] text-[#00ff88]/40">SMB OK</span>}
              </div>
            </div>
            <p className="font-mono text-[7px] text-white/25">{row.best_for}</p>
          </div>
        ))}
      </div>
    );
  }

  if (agent === 'pilot_design') {
    const data = output as PilotDesignOutput;
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-[7px] text-white/30">{data.pilot_duration_days} DAYS</span>
          <span className="font-mono text-[7px] text-white/30">{data.budget_estimate_usd}</span>
        </div>
        {data.phases.map((phase, i) => (
          <div key={i} className="p-2 bg-white/[0.02] rounded-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[8px] font-bold" style={{ color }}>{phase.phase}</span>
              <span className="font-mono text-[7px] text-white/20">{phase.days}</span>
            </div>
            {phase.objectives.map((o, oi) => (
              <span key={oi} className="font-mono text-[7px] text-white/40 block">- {o}</span>
            ))}
          </div>
        ))}
        {data.go_no_go_criteria.length > 0 && (
          <div className="pt-1">
            <span className="font-mono text-[7px] text-white/20 block mb-1">GO/NO-GO CRITERIA</span>
            {data.go_no_go_criteria.map((c, i) => (
              <span key={i} className="font-mono text-[7px] text-[#ffb800]/40 block">- {c}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (agent === 'market_intel') {
    const data = output as MarketIntelOutput;
    return (
      <div className="mt-2 space-y-2">
        <p className="font-mono text-[8px] text-white/40">{data.competitive_dynamics}</p>
        <p className="font-mono text-[7px] text-white/25">{data.market_size_signal}</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="font-mono text-[6px] tracking-wider text-[#00ff88]/40 block mb-1">LEADERS</span>
            {data.market_leaders.map((l, i) => (
              <span key={i} className="font-mono text-[7px] text-white/40 block">{l}</span>
            ))}
          </div>
          <div>
            <span className="font-mono text-[6px] tracking-wider text-[#00d4ff]/40 block mb-1">EMERGING</span>
            {data.emerging_players.map((e, i) => (
              <span key={i} className="font-mono text-[7px] text-white/40 block">{e}</span>
            ))}
          </div>
          <div>
            <span className="font-mono text-[6px] tracking-wider text-[#ff3b30]/40 block mb-1">DECLINING</span>
            {data.declining_players.map((d, i) => (
              <span key={i} className="font-mono text-[7px] text-white/40 block">{d}</span>
            ))}
          </div>
        </div>
        {data.key_trends.length > 0 && (
          <div>
            <span className="font-mono text-[6px] tracking-wider text-white/20 block mb-1">KEY TRENDS</span>
            {data.key_trends.map((t, i) => (
              <span key={i} className="font-mono text-[7px] text-white/35 block">- {t}</span>
            ))}
          </div>
        )}
        {data.opportunity_gaps.length > 0 && (
          <div>
            <span className="font-mono text-[6px] tracking-wider text-[#ffb800]/40 block mb-1">OPPORTUNITY GAPS</span>
            {data.opportunity_gaps.map((g, i) => (
              <span key={i} className="font-mono text-[7px] text-[#ffb800]/35 block">- {g}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Shared Sub-components ───────────────────────────────────────────────────

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

function ScoreBadge({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-mono text-[6px] tracking-wider text-white/20">{label}</span>
      <span className="font-mono text-[9px] font-bold" style={{ color }}>{value}/{max}</span>
    </div>
  );
}
