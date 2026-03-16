'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PageTopBar } from '@/components/PageTopBar';
import { getRecommendations } from '@/lib/engines/recommendation-engine';
import type { IndustryRecommendation } from '@/lib/engines/recommendation-engine';
import type { DiscoveredOpportunity, OpportunityReport } from '@/lib/engines/opportunity-engine';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

type Severity = 'critical' | 'high' | 'medium';

interface Problem {
  id: string;
  title: string;
  description: string;
  industries: string[];
  technologies: string[];
  severity: Severity;
  solutionCount: number;
  solutions: string[]; // product IDs from product-catalog.ts
}

const PROBLEMS: Problem[] = [
  {
    id: 'labor-shortage',
    title: 'Labor Shortage',
    description: 'Aging workforce and recruitment difficulties across manufacturing, logistics, and construction.',
    industries: ['Manufacturing', 'Logistics', 'Construction'],
    technologies: ['Robotics', 'Automation Software', 'Computer Vision'],
    severity: 'critical',
    solutionCount: 8,
    solutions: ['fanuc-crx', 'keyence-cv-x', 'rockwell-factorytalk', 'siemens-mindsphere'],
  },
  {
    id: 'quality-inspection',
    title: 'Quality Inspection',
    description: 'Manual inspection is slow, inconsistent, and cannot scale. Defects slip through to customers.',
    industries: ['Manufacturing', 'Energy', 'Aerospace'],
    technologies: ['Computer Vision', 'AI Inspection', 'IoT Sensors'],
    severity: 'high',
    solutionCount: 6,
    solutions: ['keyence-cv-x', 'siemens-mindsphere', 'honeywell-forge'],
  },
  {
    id: 'supply-chain-visibility',
    title: 'Supply Chain Visibility',
    description: 'Lack of real-time tracking across multi-tier supply chains causes delays and excess inventory.',
    industries: ['Logistics', 'Manufacturing', 'Retail'],
    technologies: ['IoT', 'Blockchain', 'Digital Twin'],
    severity: 'critical',
    solutionCount: 11,
    solutions: ['zebra-rfid-fx', 'palantir-foundry', 'siemens-mindsphere', 'rockwell-factorytalk'],
  },
  {
    id: 'cybersecurity-threats',
    title: 'Cybersecurity Threats',
    description: 'Increasing ransomware, zero-day exploits, and state-sponsored attacks targeting critical infrastructure.',
    industries: ['Cybersecurity', 'Defense', 'Energy', 'Healthcare'],
    technologies: ['Zero Trust', 'AI Threat Detection', 'SIEM'],
    severity: 'critical',
    solutionCount: 14,
    solutions: ['crowdstrike-falcon', 'palo-alto-prisma', 'fortinet-fortigate', 'okta-identity', 'sentinelone-singularity'],
  },
  {
    id: 'energy-transition',
    title: 'Energy Transition',
    description: 'Moving from fossil fuels to renewables requires massive infrastructure changes and grid modernization.',
    industries: ['Energy', 'Manufacturing', 'Construction'],
    technologies: ['Smart Grid', 'Battery Storage', 'Solar/Wind'],
    severity: 'high',
    solutionCount: 7,
    solutions: ['schneider-ecostruxure', 'enphase-iq8', 'siemens-gamesa-sg14', 'fluence-gridstack', 'honeywell-forge'],
  },
  {
    id: 'border-processing',
    title: 'Border Processing Delays',
    description: 'Long wait times at ports of entry slow trade, tourism, and economic activity in border regions.',
    industries: ['Border Tech', 'Logistics', 'Government'],
    technologies: ['Biometrics', 'Automated Screening', 'AI Scheduling'],
    severity: 'high',
    solutionCount: 5,
    solutions: ['palantir-foundry', 'anduril-lattice'],
  },
  {
    id: 'data-overload',
    title: 'Data Overload',
    description: 'Organizations collect vast amounts of data but lack tools to extract actionable intelligence.',
    industries: ['AI/ML', 'Healthcare', 'Defense'],
    technologies: ['Generative AI', 'NLP', 'Data Analytics'],
    severity: 'medium',
    solutionCount: 9,
    solutions: ['palantir-foundry', 'databricks-lakehouse', 'openai-api', 'google-vertex-ai'],
  },
  {
    id: 'infrastructure-aging',
    title: 'Aging Infrastructure',
    description: 'Bridges, pipelines, and buildings deteriorating faster than they can be inspected and maintained.',
    industries: ['Construction', 'Energy', 'Government'],
    technologies: ['Drone Inspection', 'Digital Twin', 'Predictive Maintenance'],
    severity: 'high',
    solutionCount: 6,
    solutions: ['siemens-mindsphere', 'honeywell-forge', 'schneider-ecostruxure'],
  },
  {
    id: 'water-scarcity',
    title: 'Water Scarcity',
    description: 'Desert regions face critical water supply challenges requiring desalination and conservation technology.',
    industries: ['Water Tech', 'Agriculture', 'Government'],
    technologies: ['Desalination', 'Smart Irrigation', 'Water Recycling'],
    severity: 'critical',
    solutionCount: 4,
    solutions: ['honeywell-forge', 'schneider-ecostruxure'],
  },
  {
    id: 'talent-gap',
    title: 'Technical Talent Gap',
    description: 'Shortage of skilled workers in AI, cybersecurity, and advanced manufacturing across all sectors.',
    industries: ['AI/ML', 'Cybersecurity', 'Manufacturing'],
    technologies: ['Training Platforms', 'Low-Code/No-Code', 'AI Assistants'],
    severity: 'medium',
    solutionCount: 5,
    solutions: ['openai-api', 'huggingface-hub', 'google-vertex-ai'],
  },
  {
    id: 'predictive-maintenance',
    title: 'Equipment Downtime',
    description: 'Unplanned equipment failures cause costly production stops and safety hazards.',
    industries: ['Manufacturing', 'Energy', 'Logistics'],
    technologies: ['IoT Sensors', 'Predictive Analytics', 'Digital Twin'],
    severity: 'high',
    solutionCount: 7,
    solutions: ['siemens-mindsphere', 'rockwell-factorytalk', 'honeywell-forge', 'schneider-ecostruxure'],
  },
  {
    id: 'regulatory-compliance',
    title: 'Regulatory Compliance',
    description: 'Complex and evolving regulations require constant monitoring and adaptation across industries.',
    industries: ['Healthcare', 'FinTech', 'Defense', 'Energy'],
    technologies: ['RegTech', 'AI Compliance', 'Blockchain'],
    severity: 'medium',
    solutionCount: 6,
    solutions: ['palantir-foundry', 'databricks-lakehouse', 'okta-identity'],
  },
];

/* ------------------------------------------------------------------ */
/*  Product label lookup (display names for solution chips)            */
/* ------------------------------------------------------------------ */

const PRODUCT_LABELS: Record<string, { name: string; company: string }> = {
  'crowdstrike-falcon':     { name: 'Falcon',          company: 'CrowdStrike' },
  'palo-alto-prisma':       { name: 'Prisma',           company: 'Palo Alto' },
  'fortinet-fortigate':     { name: 'FortiGate',        company: 'Fortinet' },
  'okta-identity':          { name: 'Identity',         company: 'Okta' },
  'sentinelone-singularity':{ name: 'Singularity',      company: 'SentinelOne' },
  'openai-api':             { name: 'API Platform',     company: 'OpenAI' },
  'nvidia-dgx':             { name: 'DGX System',       company: 'NVIDIA' },
  'databricks-lakehouse':   { name: 'Lakehouse',        company: 'Databricks' },
  'google-vertex-ai':       { name: 'Vertex AI',        company: 'Google' },
  'huggingface-hub':        { name: 'Hub',              company: 'HuggingFace' },
  'keyence-cv-x':           { name: 'CV-X Series',      company: 'KEYENCE' },
  'siemens-mindsphere':     { name: 'MindSphere',       company: 'Siemens' },
  'fanuc-crx':              { name: 'CRX Cobot',        company: 'FANUC' },
  'rockwell-factorytalk':   { name: 'FactoryTalk',      company: 'Rockwell' },
  'zebra-rfid-fx':          { name: 'FX RFID',          company: 'Zebra' },
  'palantir-foundry':       { name: 'Foundry',          company: 'Palantir' },
  'l3harris-falcon-iii':    { name: 'Falcon III',       company: 'L3Harris' },
  'anduril-lattice':        { name: 'Lattice',          company: 'Anduril' },
  'shield-ai-hivemind':     { name: 'Hivemind',         company: 'Shield AI' },
  'northrop-ibcs':          { name: 'IBCS',             company: 'Northrop' },
  'schneider-ecostruxure':  { name: 'EcoStruxure',      company: 'Schneider' },
  'enphase-iq8':            { name: 'IQ8 System',       company: 'Enphase' },
  'siemens-gamesa-sg14':    { name: 'SG 14-236 DD',     company: 'Siemens Gamesa' },
  'honeywell-forge':        { name: 'Forge',            company: 'Honeywell' },
  'fluence-gridstack':      { name: 'Gridstack',        company: 'Fluence' },
  'intuitive-davinci':      { name: 'da Vinci',         company: 'Intuitive' },
  'tempus-lens':            { name: 'Lens',             company: 'Tempus' },
  'illumina-novaseq':       { name: 'NovaSeq X',        company: 'Illumina' },
  'medtronic-hugo':         { name: 'Hugo',             company: 'Medtronic' },
  'google-deepmind-alphafold': { name: 'AlphaFold',     company: 'DeepMind' },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SEVERITY_META: Record<Severity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'CRITICAL', color: '#ff3b30', bg: 'rgba(255,59,48,0.10)', border: 'rgba(255,59,48,0.25)' },
  high:     { label: 'HIGH',     color: '#f97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.25)' },
  medium:   { label: 'MEDIUM',   color: '#ffb800', bg: 'rgba(255,184,0,0.10)',  border: 'rgba(255,184,0,0.25)' },
};

const SEVERITY_OPTIONS: Array<{ key: Severity | 'all'; label: string }> = [
  { key: 'all', label: 'ALL' },
  { key: 'critical', label: 'CRITICAL' },
  { key: 'high', label: 'HIGH' },
  { key: 'medium', label: 'MEDIUM' },
];

const OPPORTUNITY_TYPE_LABELS: Record<string, string> = {
  underserved_market:     'UNDERSERVED',
  early_mover:            'EARLY MOVER',
  funding_surge:          'FUNDING SURGE',
  patent_gap:             'PATENT GAP',
  convergence_play:       'CONVERGENCE',
  policy_tailwind:        'POLICY',
  supply_chain_gap:       'SUPPLY GAP',
  talent_arbitrage:       'TALENT ARBI',
  geographic_white_space: 'GEO WHITE SPACE',
};

const TIMING_META: Record<string, { label: string; color: string }> = {
  immediate:   { label: 'IMMEDIATE',   color: '#ff3b30' },
  short_term:  { label: 'SHORT TERM',  color: '#f97316' },
  medium_term: { label: 'MID TERM',    color: '#ffb800' },
  long_term:   { label: 'LONG TERM',   color: '#60a5fa' },
};

const RISK_COLOR: Record<string, string> = {
  low:    '#00ff88',
  medium: '#ffb800',
  high:   '#ff3b30',
};

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function ikerColor(score: number): string {
  if (score >= 70) return '#00ff88';
  if (score >= 45) return '#ffd700';
  return '#ff3b30';
}

/* ------------------------------------------------------------------ */
/*  Solution chip sub-component                                        */
/* ------------------------------------------------------------------ */

function SolutionChip({ productId }: { productId: string }) {
  const label = PRODUCT_LABELS[productId];
  const displayName = label ? `${label.company} ${label.name}` : productId;

  return (
    <Link
      href={`/product/${productId}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[8px] tracking-wide rounded-sm border
                 transition-all duration-150 hover:border-[#00d4ff]/40 hover:text-[#00d4ff] group/chip"
      style={{
        color: 'rgba(0,212,255,0.55)',
        background: 'rgba(0,212,255,0.04)',
        borderColor: 'rgba(0,212,255,0.15)',
      }}
    >
      <span
        className="w-1 h-1 rounded-full shrink-0"
        style={{ backgroundColor: '#00ff88', boxShadow: '0 0 4px #00ff8880' }}
      />
      {displayName}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Recommendations section sub-component                              */
/* ------------------------------------------------------------------ */

function RecommendationsPanel({
  recs,
  onClose,
}: {
  recs: IndustryRecommendation;
  onClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="mb-4 rounded-sm border overflow-hidden"
      style={{ borderColor: 'rgba(0,212,255,0.25)', background: 'rgba(0,212,255,0.03)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: 'rgba(0,212,255,0.12)', borderLeft: '2px solid #00d4ff' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[9px] tracking-[0.22em] uppercase"
            style={{ color: '#00d4ff' }}
          >
            RECOMMENDATIONS
          </span>
          <span
            className="font-mono text-[8px] tracking-wide px-1.5 py-0.5 rounded-sm border"
            style={{ color: '#00d4ff', borderColor: 'rgba(0,212,255,0.30)', background: 'rgba(0,212,255,0.08)' }}
          >
            {recs.industry.toUpperCase()}
          </span>
          <span
            className="font-mono text-[8px] tracking-wide px-1.5 py-0.5 rounded-sm border"
            style={{ color: '#00ff88', borderColor: 'rgba(0,255,136,0.25)', background: 'rgba(0,255,136,0.06)' }}
          >
            {recs.confidence}% CONF
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="font-mono text-[8px] tracking-widest transition-colors"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            {collapsed ? 'EXPAND' : 'COLLAPSE'}
          </button>
          <button
            onClick={onClose}
            className="font-mono text-[8px] tracking-widest transition-colors hover:text-white/50"
            style={{ color: 'rgba(255,255,255,0.20)' }}
          >
            DISMISS
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Problems column */}
          {recs.problems.length > 0 && (
            <div>
              <span className="font-mono text-[8px] tracking-[0.18em] text-white/30 uppercase block mb-2">
                Matched Problems
              </span>
              <div className="flex flex-col gap-1.5">
                {recs.problems.map((p, i) => {
                  const sev = SEVERITY_META[p.severity];
                  return (
                    <div
                      key={i}
                      className="px-2.5 py-2 rounded-sm border"
                      style={{ borderColor: sev.border, background: sev.bg }}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="font-mono text-[7px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm border"
                          style={{ color: sev.color, borderColor: sev.border, background: 'rgba(0,0,0,0.4)' }}
                        >
                          {sev.label}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-white/70 leading-snug">{p.problem}</p>
                      <p className="font-mono text-[8px] text-white/30 mt-0.5 leading-relaxed line-clamp-2">
                        {p.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Technologies column */}
          {recs.technologies.length > 0 && (
            <div>
              <span className="font-mono text-[8px] tracking-[0.18em] text-white/30 uppercase block mb-2">
                Technology Fit
              </span>
              <div className="flex flex-col gap-2">
                {recs.technologies.slice(0, 6).map((t, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-[9px] text-white/65 truncate pr-2">{t.name}</span>
                      <span
                        className="font-mono text-[8px] shrink-0"
                        style={{ color: t.fitScore >= 60 ? '#00ff88' : t.fitScore >= 30 ? '#ffb800' : '#60a5fa' }}
                      >
                        {t.fitScore}
                      </span>
                    </div>
                    {/* Fit bar */}
                    <div
                      className="w-full h-px rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.07)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${t.fitScore}%`,
                          background: t.fitScore >= 60 ? '#00ff88' : t.fitScore >= 30 ? '#ffb800' : '#60a5fa',
                          boxShadow: `0 0 4px ${t.fitScore >= 60 ? '#00ff8860' : t.fitScore >= 30 ? '#ffb80060' : '#60a5fa60'}`,
                        }}
                      />
                    </div>
                    <p className="font-mono text-[7px] text-white/20 mt-0.5 tracking-wide">{t.maturity}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Companies + Direction column */}
          <div className="flex flex-col gap-3">
            {/* Companies */}
            {recs.companies.length > 0 && (
              <div>
                <span className="font-mono text-[8px] tracking-[0.18em] text-white/30 uppercase block mb-2">
                  Matched Companies
                </span>
                <div className="flex flex-col gap-1">
                  {recs.companies.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: ikerColor(c.ikerScore),
                          boxShadow: `0 0 5px ${ikerColor(c.ikerScore)}80`,
                        }}
                      />
                      <span className="font-mono text-[9px] text-white/55 flex-1 truncate">{c.name}</span>
                      <span
                        className="font-mono text-[8px] shrink-0"
                        style={{ color: ikerColor(c.ikerScore) }}
                      >
                        {c.ikerScore}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direction */}
            <div
              className="p-2.5 rounded-sm border"
              style={{ borderColor: 'rgba(0,212,255,0.12)', background: 'rgba(0,0,0,0.3)' }}
            >
              <span className="font-mono text-[8px] tracking-[0.18em] text-white/25 uppercase block mb-1.5">
                So What
              </span>
              <p className="font-mono text-[9px] text-white/55 leading-relaxed">
                {recs.direction}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <Link
                  href={`/industry/${recs.slug}`}
                  className="font-mono text-[8px] tracking-widest transition-colors hover:text-[#00d4ff]"
                  style={{ color: 'rgba(0,212,255,0.50)' }}
                >
                  VIEW INDUSTRY PROFILE →
                </Link>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live Opportunities section sub-component                          */
/* ------------------------------------------------------------------ */

function LiveOpportunitiesSection({ opportunities }: { opportunities: DiscoveredOpportunity[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? opportunities : opportunities.slice(0, 6);

  if (opportunities.length === 0) return null;

  return (
    <div className="mt-8 mb-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff8880' }}
          />
          <span className="font-mono text-[9px] tracking-[0.22em] text-white/50 uppercase">
            Live Opportunities
          </span>
          <span
            className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm border"
            style={{ color: '#00ff88', borderColor: 'rgba(0,255,136,0.25)', background: 'rgba(0,255,136,0.06)' }}
          >
            {opportunities.length} DETECTED
          </span>
        </div>
        <span className="font-mono text-[8px] text-white/20 tracking-wide">ALGORITHMIC · LIVE ENGINE</span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {visible.map((opp) => {
          const timing = TIMING_META[opp.timing] ?? { label: opp.timing.toUpperCase(), color: '#60a5fa' };
          const typeLabel = OPPORTUNITY_TYPE_LABELS[opp.type] ?? opp.type.toUpperCase().replace(/_/g, ' ');
          const riskCol = RISK_COLOR[opp.risk_level] ?? '#60a5fa';

          return (
            <div
              key={opp.id}
              className="bg-black border border-white/[0.07] rounded-sm p-3.5 flex flex-col gap-2.5
                         hover:border-white/[0.16] transition-all duration-200"
            >
              {/* Score bar */}
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 h-0.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${opp.score}%`,
                      background: opp.score >= 75 ? '#00ff88' : opp.score >= 50 ? '#ffb800' : '#60a5fa',
                      boxShadow: `0 0 4px ${opp.score >= 75 ? '#00ff8860' : opp.score >= 50 ? '#ffb80060' : '#60a5fa60'}`,
                    }}
                  />
                </div>
                <span
                  className="font-mono text-[9px] shrink-0 tabular-nums"
                  style={{ color: opp.score >= 75 ? '#00ff88' : opp.score >= 50 ? '#ffb800' : '#60a5fa' }}
                >
                  {opp.score}
                </span>
              </div>

              {/* Type + timing badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border"
                  style={{ color: '#a855f7', borderColor: 'rgba(168,85,247,0.30)', background: 'rgba(168,85,247,0.08)' }}
                >
                  {typeLabel}
                </span>
                <span
                  className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border"
                  style={{ color: timing.color, borderColor: `${timing.color}40`, background: `${timing.color}0d` }}
                >
                  {timing.label}
                </span>
                <span
                  className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border ml-auto"
                  style={{ color: riskCol, borderColor: `${riskCol}40`, background: `${riskCol}0d` }}
                >
                  {opp.risk_level.toUpperCase()} RISK
                </span>
              </div>

              {/* Title */}
              <p
                className="text-[12px] text-white/80 font-medium leading-snug"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {opp.title}
              </p>

              {/* Description */}
              <p className="font-mono text-[9px] text-white/35 leading-relaxed line-clamp-2">
                {opp.description}
              </p>

              {/* Industries */}
              {opp.industries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {opp.industries.slice(0, 3).map((ind) => (
                    <span
                      key={ind}
                      className="font-mono text-[7px] tracking-wide px-1.5 py-0.5 rounded-sm border"
                      style={{ color: '#60a5fa', borderColor: 'rgba(96,165,250,0.18)', background: 'rgba(96,165,250,0.06)' }}
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              )}

              {/* Evidence count */}
              {opp.evidence.length > 0 && (
                <div className="pt-1.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span className="font-mono text-[8px] text-white/20">
                    <span style={{ color: '#00d4ff' }}>{opp.evidence.length}</span> evidence signals
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expand / collapse */}
      {opportunities.length > 6 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="px-6 py-2 font-mono text-[10px] tracking-widest uppercase rounded-sm border transition-all duration-200"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            {expanded ? 'SHOW LESS' : `VIEW ALL ${opportunities.length} OPPORTUNITIES`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProblemsPage() {
  const [filter, setFilter]               = useState<Severity | 'all'>('all');
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [showAll, setShowAll]             = useState(false);
  const [showRecs, setShowRecs]           = useState(true);

  // Live opportunities state
  const [opportunities, setOpportunities] = useState<DiscoveredOpportunity[]>([]);
  const [oppsLoading, setOppsLoading]     = useState(true);

  // Fetch live opportunities once on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/opportunities')
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: OpportunityReport }) => {
        if (!cancelled && json.ok && json.data?.opportunities) {
          const sorted = [...json.data.opportunities].sort((a, b) => b.score - a.score);
          setOpportunities(sorted);
        }
      })
      .catch(() => {/* silent — live data is best-effort */})
      .finally(() => { if (!cancelled) setOppsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const allIndustries = useMemo(() => {
    const set = new Set<string>();
    PROBLEMS.forEach((p) => p.industries.forEach((i) => set.add(i)));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return PROBLEMS.filter((p) => {
      if (filter !== 'all' && p.severity !== filter) return false;
      if (industryFilter && !p.industries.includes(industryFilter)) return false;
      if (q) {
        const haystack = [p.title, p.description, ...p.industries, ...p.technologies].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [filter, industryFilter, search]);

  const visible = showAll ? filtered : filtered.slice(0, 9);
  const hasMore = filtered.length > 9 && !showAll;

  const severityCounts = useMemo(() => ({
    critical: PROBLEMS.filter((p) => p.severity === 'critical').length,
    high:     PROBLEMS.filter((p) => p.severity === 'high').length,
    medium:   PROBLEMS.filter((p) => p.severity === 'medium').length,
  }), []);

  // Recommendation engine — fires when search >= 3 chars
  const recommendations = useMemo<IndustryRecommendation | null>(() => {
    if (search.trim().length < 3) return null;
    return getRecommendations(search.trim());
  }, [search]);

  // Only show rec panel if engine returned at least one match and user hasn't dismissed
  const showRecsPanel = showRecs
    && recommendations !== null
    && (recommendations.problems.length > 0 || recommendations.technologies.length > 0 || recommendations.companies.length > 0);

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <PageTopBar
        backHref="/"
        backLabel="HOME"
        breadcrumbs={[{ label: 'PROBLEMS' }]}
        rightSlot={
          <span className="font-mono text-[8px] tracking-[0.2em] text-white/30">
            {PROBLEMS.length} TRACKED
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Hero */}
          <div className="pt-10 pb-6">
            <h1
              className="text-[28px] md:text-[34px] tracking-[0.04em] text-white/90 font-light uppercase"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Problem Intelligence
            </h1>
            <p className="font-mono text-[11px] text-white/35 mt-2 tracking-wide max-w-xl">
              Challenges driving technology adoption across industries
            </p>

            {/* Severity stat row */}
            <div className="flex items-center gap-6 mt-5">
              {(['critical', 'high', 'medium'] as Severity[]).map((sev) => (
                <div key={sev} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: SEVERITY_META[sev].color, boxShadow: `0 0 6px ${SEVERITY_META[sev].color}80` }}
                  />
                  <span className="font-mono text-[10px] text-white/40 tracking-wide uppercase">
                    {severityCounts[sev]} {SEVERITY_META[sev].label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="pb-3">
            <div className="relative max-w-2xl">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowAll(false); setShowRecs(true); }}
                placeholder="Search problems by keyword, industry, or technology..."
                className="w-full bg-white/[0.03] font-mono text-[12px] text-white/70 placeholder-white/20
                           pl-10 pr-10 py-3 outline-none border border-white/[0.08] rounded-sm
                           focus:border-[#00d4ff]/30 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-widest text-white/25
                             hover:text-white/50 transition-colors"
                >
                  CLEAR
                </button>
              )}
            </div>
            {/* Hint */}
            {search.length > 0 && search.length < 3 && (
              <p className="font-mono text-[8px] text-white/20 mt-1.5 ml-1 tracking-wide">
                Type {3 - search.length} more character{3 - search.length !== 1 ? 's' : ''} to unlock recommendations
              </p>
            )}
          </div>

          {/* Recommendations panel */}
          {showRecsPanel && recommendations && (
            <RecommendationsPanel
              recs={recommendations}
              onClose={() => setShowRecs(false)}
            />
          )}

          {/* Severity filters */}
          <div className="flex flex-wrap gap-1.5 pb-2">
            {SEVERITY_OPTIONS.map((opt) => {
              const active = filter === opt.key;
              const meta = opt.key !== 'all' ? SEVERITY_META[opt.key] : null;
              return (
                <button
                  key={opt.key}
                  onClick={() => { setFilter(opt.key); setShowAll(false); }}
                  className="px-3 py-1 text-[10px] tracking-widest uppercase rounded-sm border transition-all duration-150"
                  style={{
                    background: active ? (meta?.bg ?? 'rgba(0,212,255,0.10)') : 'transparent',
                    borderColor: active ? (meta?.border ?? '#00d4ff44') : 'rgba(255,255,255,0.07)',
                    color: active ? (meta?.color ?? '#00d4ff') : 'rgba(255,255,255,0.30)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Industry filters */}
          <div className="flex flex-wrap gap-1.5 pb-4 border-b border-white/[0.06]">
            <button
              onClick={() => { setIndustryFilter(null); setShowAll(false); }}
              className="px-2.5 py-0.5 text-[9px] tracking-widest uppercase rounded-sm border transition-all duration-150"
              style={{
                background: !industryFilter ? 'rgba(0,212,255,0.10)' : 'transparent',
                borderColor: !industryFilter ? '#00d4ff44' : 'rgba(255,255,255,0.05)',
                color: !industryFilter ? '#00d4ff' : 'rgba(255,255,255,0.22)',
              }}
            >
              ALL INDUSTRIES
            </button>
            {allIndustries.map((ind) => (
              <button
                key={ind}
                onClick={() => { setIndustryFilter(industryFilter === ind ? null : ind); setShowAll(false); }}
                className="px-2.5 py-0.5 text-[9px] tracking-widest uppercase rounded-sm border transition-all duration-150"
                style={{
                  background: industryFilter === ind ? 'rgba(96,165,250,0.10)' : 'transparent',
                  borderColor: industryFilter === ind ? 'rgba(96,165,250,0.30)' : 'rgba(255,255,255,0.05)',
                  color: industryFilter === ind ? '#60a5fa' : 'rgba(255,255,255,0.22)',
                }}
              >
                {ind}
              </button>
            ))}
          </div>

          {/* Count */}
          <div className="flex items-center justify-between py-3">
            <span className="font-mono text-[11px] tracking-[0.15em] text-white/40">
              <span className="text-[#00d4ff]">{filtered.length}</span> problems
            </span>
            {(search || filter !== 'all' || industryFilter) && (
              <button
                onClick={() => { setSearch(''); setFilter('all'); setIndustryFilter(null); setShowAll(false); }}
                className="font-mono text-[10px] tracking-widest text-white/25 hover:text-[#00d4ff]/70 transition-colors uppercase"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <svg className="w-8 h-8 mx-auto mb-4 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="font-mono text-[11px] text-white/30 tracking-wide">No problems match your filters</p>
            </div>
          )}

          {/* Grid */}
          {filtered.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {visible.map((p) => {
                  const sev = SEVERITY_META[p.severity];
                  const industrySlug = toSlug(p.industries[0]);
                  return (
                    <div
                      key={p.id}
                      className="bg-black border border-white/[0.08] rounded-sm p-5 flex flex-col gap-3
                                 hover:border-white/[0.20] transition-all duration-200 group relative"
                    >
                      {/* Severity dot */}
                      <div
                        className="absolute top-4 right-4 w-2 h-2 rounded-full"
                        style={{ backgroundColor: sev.color, boxShadow: `0 0 6px ${sev.color}80` }}
                      />

                      {/* Severity badge + Title */}
                      <div className="flex items-start gap-2.5 pr-6">
                        <span
                          className="mt-0.5 shrink-0 px-2 py-0.5 text-[8px] tracking-widest rounded-sm border"
                          style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}
                        >
                          {sev.label}
                        </span>
                        <h2
                          className="text-[15px] text-white/85 font-medium leading-snug"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {p.title}
                        </h2>
                      </div>

                      {/* Description */}
                      <p className="text-[12px] text-white/40 leading-relaxed line-clamp-2">{p.description}</p>

                      {/* Industries */}
                      <div className="flex flex-wrap gap-1.5">
                        {p.industries.map((ind) => (
                          <span
                            key={ind}
                            className="px-2 py-0.5 text-[8px] tracking-wide rounded-sm border"
                            style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.08)', borderColor: 'rgba(96,165,250,0.20)' }}
                          >
                            {ind}
                          </span>
                        ))}
                      </div>

                      {/* Technologies */}
                      <div className="flex flex-wrap gap-1.5">
                        {p.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="px-2 py-0.5 text-[8px] tracking-wide rounded-sm border"
                            style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.20)' }}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>

                      {/* Solutions */}
                      {p.solutions.length > 0 && (
                        <div className="pt-2 border-t border-white/[0.05]">
                          <span className="font-mono text-[8px] tracking-[0.18em] text-white/20 uppercase block mb-1.5">
                            Linked Solutions
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {p.solutions.map((pid) => (
                              <SolutionChip key={pid} productId={pid} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-auto pt-3 border-t border-white/[0.06] flex items-center justify-between">
                        <span className="font-mono text-[10px] text-white/30">
                          <span style={{ color: '#00ff88' }}>{p.solutionCount}</span> solutions tracked
                        </span>
                        <Link
                          href={`/industry/${industrySlug}`}
                          className="font-mono text-[9px] tracking-widest text-white/20 hover:text-[#00d4ff] transition-colors uppercase"
                        >
                          EXPLORE →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View More */}
              {hasMore && (
                <div className="flex justify-center py-8">
                  <button
                    onClick={() => setShowAll(true)}
                    className="px-8 py-2.5 font-mono text-[11px] tracking-widest uppercase rounded-sm
                               border border-white/[0.08] text-white/40
                               hover:border-[#00d4ff]/30 hover:text-[#00d4ff] transition-all duration-200"
                  >
                    View All {filtered.length} Problems
                  </button>
                </div>
              )}
            </>
          )}

          {/* Live Opportunities */}
          {oppsLoading ? (
            <div className="mt-8 mb-4">
              <div
                className="flex items-center gap-3 pb-2 border-b mb-3"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(0,255,136,0.30)' }}
                />
                <span className="font-mono text-[9px] tracking-[0.22em] text-white/25 uppercase">
                  Live Opportunities
                </span>
                <span className="loading-dots font-mono text-[8px] text-white/20">loading</span>
              </div>
            </div>
          ) : (
            <LiveOpportunitiesSection opportunities={opportunities} />
          )}

          {/* Footer */}
          <div className="py-4 border-t border-white/[0.05] mb-4">
            <span className="font-mono text-[9px] text-white/15">
              {PROBLEMS.length} problems tracked — NXT//LINK Intelligence
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
