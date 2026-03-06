'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageTopBar } from '@/components/PageTopBar';
import { ProblemSolver } from '@/components/ProblemSolver';
import { INDUSTRIES, type IndustryMeta } from '@/lib/data/technology-catalog';

// ─── Common Problems ──────────────────────────────────────────────────────────

const COMMON_PROBLEMS: Array<{ problem: string; industry: string; icon: string }> = [
  { problem: 'High warehouse labor costs', industry: 'Logistics', icon: '\u{1F3ED}' },
  { problem: 'Border crossing delays', industry: 'Border/Gov', icon: '\u{1F6C3}' },
  { problem: 'Manufacturing quality defects', industry: 'Manufacturing', icon: '\u2699' },
  { problem: 'Cybersecurity threats to critical infrastructure', industry: 'Cybersecurity', icon: '\u{1F6E1}' },
  { problem: 'Water scarcity in arid regions', industry: 'Energy', icon: '\u{1F4A7}' },
  { problem: 'Military base network security', industry: 'Defense', icon: '\u2694' },
  { problem: 'Healthcare data interoperability', industry: 'Healthcare', icon: '\u{1F3E5}' },
  { problem: 'Last-mile delivery optimization', industry: 'Logistics', icon: '\u{1F4E6}' },
  { problem: 'Energy grid reliability', industry: 'Energy', icon: '\u26A1' },
  { problem: 'Predictive maintenance for equipment', industry: 'Manufacturing', icon: '\u{1F527}' },
  { problem: 'Document processing automation', industry: 'Enterprise', icon: '\u{1F4C4}' },
  { problem: 'Supply chain visibility gaps', industry: 'Logistics', icon: '\u{1F6A2}' },
];

// ─── Recent Solutions ─────────────────────────────────────────────────────────

const RECENT_SOLUTIONS: Array<{ problem: string; solution: string; techs: string[]; color: string }> = [
  {
    problem: 'Reduce warehouse picking errors',
    solution: 'Computer Vision QA + Locus Robotics AMR',
    techs: ['Computer Vision', 'Autonomous Mobile Robots'],
    color: '#00d4ff',
  },
  {
    problem: 'Secure border communications',
    solution: 'Zero Trust Architecture + Private 5G',
    techs: ['Zero Trust', 'Private 5G Networks'],
    color: '#f97316',
  },
  {
    problem: 'Predict equipment failures',
    solution: 'Digital Twin + IoT Edge Sensors',
    techs: ['Digital Twin', 'Edge Computing'],
    color: '#00ff88',
  },
  {
    problem: 'Bilingual document processing backlog',
    solution: 'NLP Pipeline + Generative AI Summarization',
    techs: ['NLP', 'Generative AI'],
    color: '#ffb800',
  },
];

// ─── How It Works Steps ───────────────────────────────────────────────────────

const STEPS: Array<{ num: string; title: string; desc: string; color: string }> = [
  { num: '01', title: 'DESCRIBE YOUR PROBLEM', desc: 'Enter any technology challenge in plain language', color: '#00d4ff' },
  { num: '02', title: 'AI ANALYZES 45+ TECHNOLOGIES', desc: 'Matched against our catalog of tracked technologies', color: '#ffb800' },
  { num: '03', title: 'GET MATCHED SOLUTIONS', desc: 'Ranked results with confidence scores and evidence', color: '#00ff88' },
  { num: '04', title: 'CONNECT WITH VENDORS', desc: 'Direct links to qualified El Paso region vendors', color: '#f97316' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SolvePage() {
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryMeta>(INDUSTRIES[0]);
  const [problemText, setProblemText] = useState('');

  function handleQuickProblem(problem: string) {
    setProblemText(problem);
    // Scroll to solver area
    const el = document.getElementById('solver-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-black grid-pattern">
      <PageTopBar
        backHref="/"
        backLabel="HOME"
        breadcrumbs={[{ label: 'PROBLEM SOLVER' }]}
      />

      <main className="max-w-4xl mx-auto px-6 py-8 pb-20">

        {/* Header */}
        <div className="mb-8">
          <div className="font-mono text-[14px] tracking-[0.3em] text-white/60 uppercase">
            DECISION INTELLIGENCE ENGINE
          </div>
          <p className="font-mono text-[10px] text-white/35 mt-2 leading-relaxed max-w-xl">
            Describe any technology problem. AI analyzes against 45+ technologies and 98 vendors
            to recommend solutions with confidence scores, readiness levels, and pilot plans.
          </p>
        </div>

        {/* ─── HOW IT WORKS ──────────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="font-mono text-[8px] tracking-[0.2em] text-white/20 uppercase mb-3">
            HOW IT WORKS
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="border border-white/[0.06] rounded-sm p-3 bg-white/[0.01]"
              >
                <div
                  className="font-mono text-[18px] font-bold leading-none mb-2"
                  style={{ color: step.color, opacity: 0.25 }}
                >
                  {step.num}
                </div>
                <div className="font-mono text-[8px] tracking-wider text-white/50 font-bold mb-1">
                  {step.title}
                </div>
                <p className="font-mono text-[7px] text-white/25 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── COMMON PROBLEMS ───────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="font-mono text-[8px] tracking-[0.2em] text-white/20 uppercase mb-1">
            COMMON PROBLEMS
          </div>
          <p className="font-mono text-[7px] text-white/15 mb-3">
            Click any problem to auto-analyze it
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {COMMON_PROBLEMS.map((cp) => (
              <button
                key={cp.problem}
                onClick={() => handleQuickProblem(cp.problem)}
                className="text-left border border-white/[0.08] rounded-sm p-3 hover:border-white/20 hover:bg-white/[0.02] transition-all group"
              >
                <div className="text-[16px] mb-1.5 grayscale group-hover:grayscale-0 transition-all">
                  {cp.icon}
                </div>
                <div className="font-mono text-[8px] text-white/50 leading-relaxed mb-1.5">
                  {cp.problem}
                </div>
                <span className="font-mono text-[6px] tracking-wider px-1.5 py-0.5 rounded-sm bg-white/[0.04] text-white/25 uppercase">
                  {cp.industry}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── SOLVER SECTION ────────────────────────────────────────────────── */}
        <div id="solver-section">
          {/* Industry selector */}
          <div className="mb-6">
            <div className="font-mono text-[8px] tracking-[0.2em] text-white/20 uppercase mb-1.5">
              SECTOR
            </div>
            <div className="flex flex-wrap gap-1">
              {INDUSTRIES.map((ind) => {
                const isActive = selectedIndustry.slug === ind.slug;
                return (
                  <button
                    key={ind.slug}
                    onClick={() => setSelectedIndustry(ind)}
                    className="font-mono text-[8px] tracking-[0.15em] px-3 py-1.5 border transition-colors uppercase"
                    style={{
                      borderColor: isActive ? `${ind.color}66` : 'rgba(255,255,255,0.06)',
                      backgroundColor: isActive ? `${ind.color}20` : 'transparent',
                      color: isActive ? ind.color : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {ind.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Problem Solver component */}
          <ProblemSolver
            industrySlug={selectedIndustry.slug}
            industryLabel={selectedIndustry.label}
            accentColor={selectedIndustry.color}
            initialProblem={problemText}
            onProblemChange={setProblemText}
          />
        </div>

        {/* ─── RECENT SOLUTIONS ──────────────────────────────────────────────── */}
        <div className="mt-14 mb-10">
          <div className="font-mono text-[8px] tracking-[0.2em] text-white/20 uppercase mb-1">
            RECENT SOLUTIONS
          </div>
          <p className="font-mono text-[7px] text-white/15 mb-3">
            Examples of problems solved through this engine
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {RECENT_SOLUTIONS.map((rs) => (
              <div
                key={rs.problem}
                className="border border-white/[0.08] rounded-sm p-4 bg-white/[0.01]"
              >
                <div className="font-mono text-[7px] tracking-wider text-white/20 uppercase mb-1.5">
                  PROBLEM
                </div>
                <p className="font-mono text-[9px] text-white/50 mb-3">
                  {rs.problem}
                </p>
                <div className="flex items-center gap-1.5 mb-2">
                  <div
                    className="w-4 h-[1px]"
                    style={{ background: rs.color }}
                  />
                  <span
                    className="font-mono text-[7px] tracking-wider uppercase"
                    style={{ color: rs.color, opacity: 0.6 }}
                  >
                    SOLUTION
                  </span>
                </div>
                <p className="font-mono text-[9px] text-white/60 font-bold mb-2">
                  {rs.solution}
                </p>
                <div className="flex flex-wrap gap-1">
                  {rs.techs.map((t) => (
                    <span
                      key={t}
                      className="font-mono text-[6px] tracking-wider px-1.5 py-0.5 rounded-sm uppercase"
                      style={{
                        color: rs.color,
                        backgroundColor: `${rs.color}10`,
                        border: `1px solid ${rs.color}25`,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-10 pt-5 border-t border-white/[0.06]">
          <div className="font-mono text-[7px] tracking-[0.2em] text-white/25 uppercase mb-2">
            EXPLORE BY INDUSTRY
          </div>
          <div className="flex flex-wrap gap-1">
            {INDUSTRIES.map((ind) => (
              <Link
                key={ind.slug}
                href={`/industry/${ind.slug}`}
                className="font-mono text-[7px] tracking-[0.15em] px-2.5 py-1 border border-white/[0.06] text-white/25 hover:text-white/45 hover:border-white/[0.12] transition-colors uppercase"
              >
                {ind.label}
              </Link>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
