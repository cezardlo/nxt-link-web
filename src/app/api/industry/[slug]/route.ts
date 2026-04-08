export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getKgIndustryBySlug } from '@/db/queries/kg-industries';

import { getKgTechnologies } from '@/db/queries/kg-technologies';
import { getKgCompanies } from '@/db/queries/kg-companies';
import { getKgSignals } from '@/db/queries/kg-signals';
import { getKgDiscoveries } from '@/db/queries/kg-discoveries';
import { getVendors } from '@/db/queries/vendors';
import { getProducts } from '@/db/queries/products';
import { getConferences } from '@/db/queries/conferences';
import { getIntelSignals } from '@/db/queries/intel-signals';
import type { KgTechnologyRow } from '@/db/queries/kg-technologies';
import type { KgSignalRow } from '@/db/queries/kg-signals';
import type { VendorRecord } from '@/db/queries/vendors';
import type { ConferenceRecord } from '@/db/queries/conferences';
import { loadUnifiedBrainReport } from '@/lib/intelligence/brain-orchestrator';

// ── Industry → vendor primary_category mapping ──────────────────────────────

const SLUG_TO_VENDOR_CATS: Record<string, string[]> = {
  'ai-ml': ['AI / ML', 'Analytics', 'IoT', 'Robotics'],
  'cybersecurity': ['Cybersecurity', 'Fraud Detection'],
  'defense': ['Defense', 'Defense IT', 'Border Tech'],
  'manufacturing': ['Manufacturing', 'Fabrication', 'Robotics', 'Engineering'],
  'energy': ['Energy', 'Water Tech', 'HVAC'],
  'healthcare': ['Health Tech'],
  'logistics': ['Logistics', 'Trucking', 'Warehousing', 'Route Optimization'],
  'border-tech': ['Border Tech', 'Defense', 'Government'],
};

// ── Industry → conference category mapping ──────────────────────────────────

const SLUG_TO_CONF_CATS: Record<string, string[]> = {
  'ai-ml': ['AI/ML', 'Robotics', 'IoT', 'Quantum Computing', 'Software', 'Cloud Computing', 'Data Centers'],
  'cybersecurity': ['Cybersecurity', 'Intelligence'],
  'defense': ['Defense', 'Homeland Security', 'Intelligence', 'Aerospace', 'Border/Gov'],
  'manufacturing': ['Manufacturing', 'Fabrication', '3D Printing', 'Robotics', 'Quality/Testing', 'Plastics', 'Textiles'],
  'energy': ['Energy', 'Solar', 'Wind', 'Nuclear', 'Oil & Gas', 'Environmental'],
  'healthcare': ['Healthcare', 'Medical Devices', 'Pharma', 'Biotech', 'Dental', 'Veterinary'],
  'logistics': ['Logistics', 'Trucking', 'Warehousing', 'Supply Chain', 'Fleet Management', 'Maritime', 'Rail', 'Aviation'],
  'border-tech': ['Border/Gov', 'Homeland Security', 'Intelligence', 'Government IT', 'Defense'],
};

// ── Industry → product industry values ──────────────────────────────────────

const SLUG_TO_PROD_INDUSTRIES: Record<string, string[]> = {
  'ai-ml': ['ai_ml', 'general'],
  'cybersecurity': ['cybersecurity'],
  'defense': ['aerospace_defense'],
  'manufacturing': ['manufacturing'],
  'energy': ['energy'],
  'healthcare': ['healthcare', 'health_biotech'],
  'logistics': ['supply_chain'],
  'border-tech': ['aerospace_defense'],
};

// ── Industry → intel_signals industry values ────────────────────────────────

const SLUG_TO_SIGNAL_INDUSTRY: Record<string, string[]> = {
  'ai-ml': ['ai-ml'],
  'cybersecurity': ['cybersecurity'],
  'defense': ['defense'],
  'manufacturing': ['manufacturing'],
  'energy': ['energy'],
  'healthcare': ['healthcare'],
  'logistics': ['logistics', 'supply_chain'],
  'border-tech': ['defense'],
};

// ── Industry → technology keywords (match kg_technologies name/description) ─

const SLUG_TO_TECH_KEYWORDS: Record<string, string[]> = {
  'ai-ml': ['artificial intelligence', 'machine learning', 'deep learning', 'neural', 'nlp', 'computer vision', 'llm', 'generative ai', 'autonomous', 'robotics', 'ai'],
  'cybersecurity': ['cyber', 'security', 'encryption', 'zero trust', 'firewall', 'threat', 'siem', 'intrusion', 'privacy'],
  'defense': ['defense', 'military', 'missile', 'radar', 'satellite', 'drone', 'c4isr', 'directed energy', 'hypersonic'],
  'manufacturing': ['manufacturing', 'industrial', '3d print', 'additive', 'cnc', 'digital twin', 'plc', 'scada', 'factory', 'composite'],
  'energy': ['energy', 'solar', 'wind', 'battery', 'hydrogen', 'nuclear', 'grid', 'carbon capture', 'renewable', 'fusion'],
  'healthcare': ['health', 'medical', 'clinical', 'genomic', 'telemedicine', 'pharma', 'biotech', 'crispr', 'gene therapy', 'diagnostic'],
  'logistics': ['logistics', 'supply chain', 'warehouse', 'freight', 'shipping', 'fleet', 'autonomous vehicle', 'last mile', 'routing'],
  'border-tech': ['border', 'biometric', 'surveillance', 'detection', 'radar', 'drone', 'sensor'],
};

// ── Industry → kg_signals keyword matching (title/description) ──────────────

const SLUG_TO_SIGNAL_KEYWORDS: Record<string, string[]> = {
  'ai-ml': ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural', 'llm', 'generative', 'automation'],
  'cybersecurity': ['cyber', 'security', 'breach', 'hack', 'ransomware', 'phishing', 'encryption', 'vulnerability'],
  'defense': ['defense', 'military', 'pentagon', 'dod', 'missile', 'nato', 'weapons', 'army', 'navy', 'air force'],
  'manufacturing': ['manufacturing', 'factory', 'production', 'industrial', '3d print', 'assembly', 'fabrication'],
  'energy': ['energy', 'solar', 'wind', 'battery', 'oil', 'gas', 'nuclear', 'renewable', 'grid', 'hydrogen'],
  'healthcare': ['health', 'medical', 'hospital', 'pharma', 'fda', 'clinical', 'patient', 'drug', 'biotech'],
  'logistics': ['logistics', 'supply chain', 'shipping', 'freight', 'warehouse', 'delivery', 'fleet', 'trucking'],
  'border-tech': ['border', 'cbp', 'immigration', 'customs', 'surveillance', 'biometric', 'checkpoint'],
};

const SLUG_TO_TRACKED_TECH: Record<string, string[]> = {
  'ai-ml': ['AI', 'Robotics', 'Sensors'],
  'cybersecurity': ['AI', 'Sensors', 'Trade Compliance'],
  'defense': ['Robotics', 'Sensors', 'AI'],
  'manufacturing': ['Additive Manufacturing', 'Robotics', 'AI'],
  'energy': ['Battery Systems', 'Grid Tech', 'AI'],
  'healthcare': ['AI', 'Sensors'],
  'logistics': ['Freight Tech', 'Trade Compliance', 'AI'],
  'border-tech': ['Trade Compliance', 'Sensors', 'AI'],
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

function filterTechnologies(techs: KgTechnologyRow[], slug: string): KgTechnologyRow[] {
  const keywords = SLUG_TO_TECH_KEYWORDS[slug];
  if (!keywords) return techs;
  return techs.filter(t => {
    const searchText = `${t.name} ${t.description ?? ''}`;
    return matchesKeywords(searchText, keywords);
  });
}

function filterKgSignals(signals: KgSignalRow[], slug: string): KgSignalRow[] {
  const keywords = SLUG_TO_SIGNAL_KEYWORDS[slug];
  if (!keywords) return signals;
  return signals.filter(s => {
    const searchText = `${s.title} ${s.description ?? ''}`;
    return matchesKeywords(searchText, keywords);
  });
}

function filterVendors(vendorMap: Record<string, VendorRecord>, slug: string): VendorRecord[] {
  const cats = SLUG_TO_VENDOR_CATS[slug];
  const allVendors = Object.values(vendorMap);
  if (!cats) return allVendors;
  const catSet = new Set(cats.map(c => c.toLowerCase()));
  return allVendors.filter(v => catSet.has(v.category.toLowerCase()));
}

function filterConferences(conferences: readonly ConferenceRecord[], slug: string): ConferenceRecord[] {
  const cats = SLUG_TO_CONF_CATS[slug];
  if (!cats) return [...conferences];
  const catSet = new Set(cats.map(c => c.toLowerCase()));
  return conferences.filter(c => catSet.has(c.category.toLowerCase()));
}

function normalizeIndustryLabel(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[_\s]+/g, '-');
}

function assessmentMatchesSlug(
  slug: string,
  assessment: {
    industry: string | null;
    tracked_technologies: string[];
    title: string;
    local_pathway: string;
  }
): boolean {
  const industry = normalizeIndustryLabel(assessment.industry);
  if (industry === slug) return true;
  if (slug === 'logistics' && (industry === 'supply-chain' || industry === 'supply_chain')) return true;
  if (slug === 'border-tech' && (industry === 'defense' || assessment.local_pathway.toLowerCase().includes('border'))) return true;
  const text = `${assessment.title} ${assessment.local_pathway}`.toLowerCase();
  return (SLUG_TO_SIGNAL_KEYWORDS[slug] ?? []).some((keyword) => text.includes(keyword));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const industry = await getKgIndustryBySlug(slug);

  if (!industry) {
    return NextResponse.json({ error: 'Industry not found' }, { status: 404 });
  }

  // Product industry values for this slug
  const prodIndustries = SLUG_TO_PROD_INDUSTRIES[slug] ?? [slug];
  // Intel signal industry values for this slug
  const sigIndustries = SLUG_TO_SIGNAL_INDUSTRY[slug] ?? [slug];

  // Fetch all raw data in parallel
  const [
    allTechnologies,
    allCompanies,
    allKgSignals,
    discoveries,
    vendorMap,
    conferences,
    ...productResults
  ] = await Promise.all([
    getKgTechnologies({ limit: 200 }),
    getKgCompanies({ limit: 200 }),
    getKgSignals({ limit: 200, active_only: true }),
    getKgDiscoveries({ limit: 30 }),
    getVendors(),
    getConferences(),
    // Fetch products for each mapped industry value
    ...prodIndustries.map(ind => getProducts({ industry: ind, limit: 50 })),
  ]);

  // Fetch intel signals for each mapped industry value
  const intelSignalResults = await Promise.all(
    sigIndustries.map(ind => getIntelSignals({ industry: ind, limit: 30 })),
  );
  const brainReport = await loadUnifiedBrainReport({ signalLimit: 180, includeObsidian: true });

  // ── Filter data by industry ───────────────────────────────────────────────

  const technologies = filterTechnologies(allTechnologies, slug);
  const signals = filterKgSignals(allKgSignals, slug);
  const vendors = filterVendors(vendorMap, slug);
  const filteredConferences = filterConferences(conferences, slug);

  // Merge product results from multiple industry values
  const products = productResults.flat();

  // Merge intel signal results
  const intelSignals = intelSignalResults.flat();
  const industryAssessments = brainReport.signalAssessments
    .filter((assessment) => assessmentMatchesSlug(slug, assessment))
    .slice(0, 12);
  const trackedTechnologies = Array.from(
    new Set([
      ...(SLUG_TO_TRACKED_TECH[slug] ?? []),
      ...industryAssessments.flatMap((assessment) => assessment.tracked_technologies),
    ])
  ).slice(0, 8);
  const topOpportunities = industryAssessments
    .slice(0, 6)
    .map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      opportunity_type: assessment.opportunity_type,
      opportunity_score: assessment.opportunity_score,
      urgency_score: assessment.urgency_score,
      el_paso_relevance: assessment.el_paso_relevance,
      local_pathway: assessment.local_pathway,
      recommended_actions: assessment.recommended_actions,
      suggested_targets: assessment.suggested_targets,
      who_it_matters_to: assessment.who_it_matters_to,
      what_changed_vs_last_week: assessment.what_changed_vs_last_week,
    }));
  const topCompanies = brainReport.learning.companyPriority
    .filter((company) => company.industries.some((item) => normalizeIndustryLabel(item) === slug))
    .slice(0, 6);
  const localFitSummary = topOpportunities[0]
    ? `${industry.name} signals are being translated into El Paso action through ${topOpportunities[0].opportunity_type.replace(/-/g, ' ')} plays and corridor relevance.`
    : `NXT//LINK is still building a stronger El Paso fit model for ${industry.name}.`;

  // Filter companies by cross-referencing with filtered vendor names
  const vendorNameSet = new Set(vendors.map(v => v.name.toLowerCase()));
  const companies = allCompanies.filter(c =>
    vendorNameSet.has(c.name.toLowerCase()),
  );

  return NextResponse.json({
    industry,
    technologies,
    companies,
    signals,
    discoveries,
    vendors,
    products,
    conferences: filteredConferences,
    intelSignals,
    trackedTechnologies,
    topOpportunities,
    topCompanies,
    localFitSummary,
    actionQueue: brainReport.opportunities.actionQueue.filter((item) =>
      topOpportunities.some((opportunity) => opportunity.id === item.signalId)
    ),
    memory: {
      recurringCompanies: brainReport.memory.recurringCompanies.filter((item) =>
        topCompanies.some((company) => company.name === item.name)
      ),
      recurringTechnologies: brainReport.memory.recurringTechnologies.filter((item) =>
        trackedTechnologies.includes(item.name)
      ),
      risingIndustries: brainReport.memory.risingIndustries.filter((item) =>
        normalizeIndustryLabel(item.name) === slug
      ),
    },
  });
}
