// src/app/api/discoveries/route.ts
// Innovation Radar — GET /api/discoveries
// Queries kg_discoveries from Supabase with filters + pagination.
// Falls back to mock data when Supabase is unavailable.

import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DiscoveryRow = {
  id: string;
  title: string;
  summary: string | null;
  discovery_type: string;
  source_url: string | null;
  source_name: string | null;
  research_institution: string | null;
  country_id: string | null;
  trl_level: number | null;
  published_at: string | null;
  iker_impact_score: number | null;
  created_at: string;
};

// ── Mock data fallback ────────────────────────────────────────────────────────

const MOCK_DISCOVERIES: DiscoveryRow[] = [
  {
    id: 'mock-1',
    title: 'MIT Achieves Record Qubit Coherence Time in Superconducting Quantum Processor',
    summary: 'Researchers at MIT Lincoln Laboratory have demonstrated a superconducting qubit with coherence times exceeding 1 millisecond, a 10x improvement over previous records, enabling fault-tolerant quantum computation at scale.',
    discovery_type: 'breakthrough',
    source_url: 'https://www.technologyreview.com',
    source_name: 'MIT Tech Review',
    research_institution: 'MIT',
    country_id: 'US',
    trl_level: 4,
    published_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 92,
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-2',
    title: 'NIF Fusion Ignition Reproduced with 3x Energy Gain — Net Positive Output Confirmed',
    summary: 'The National Ignition Facility at Lawrence Livermore has successfully reproduced and exceeded its historic fusion ignition milestone, achieving a 3:1 energy gain ratio in laser-driven inertial confinement fusion.',
    discovery_type: 'breakthrough',
    source_url: 'https://www.science.org',
    source_name: 'Science Magazine',
    research_institution: 'LLNL',
    country_id: 'US',
    trl_level: 5,
    published_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 98,
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-3',
    title: 'CRISPR-Cas9 In Vivo Gene Correction Achieves 94% Efficiency in Sickle Cell Trial',
    summary: 'Phase 3 clinical trial results published in NEJM show CRISPR-Cas9 base editing achieves durable correction of the HBB gene mutation in 94% of treated patients, with no serious adverse events at 24-month follow-up.',
    discovery_type: 'clinical_trial',
    source_url: 'https://www.nejm.org',
    source_name: 'NEJM',
    research_institution: 'Harvard',
    country_id: 'US',
    trl_level: 7,
    published_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 95,
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-4',
    title: 'QuantumScape Solid-State Battery Achieves 400 Wh/kg Energy Density at Scale',
    summary: 'QuantumScape announces solid-state lithium-metal battery cells with 400 Wh/kg energy density, 15-minute fast charging, and >1000 cycle life, representing a 2x improvement over current lithium-ion technology.',
    discovery_type: 'breakthrough',
    source_url: 'https://www.quantumscape.com',
    source_name: 'QuantumScape',
    research_institution: 'Stanford',
    country_id: 'US',
    trl_level: 6,
    published_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 88,
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-5',
    title: 'DeepMind AlphaFold 3 Predicts Drug-Target Interactions with Near-Crystallographic Accuracy',
    summary: 'Google DeepMind releases AlphaFold 3, extending protein structure prediction to drug-protein, DNA-protein, and RNA-protein interactions, achieving accuracy comparable to experimental cryo-EM at a fraction of the cost.',
    discovery_type: 'paper',
    source_url: 'https://www.nature.com',
    source_name: 'Nature',
    research_institution: 'DeepMind',
    country_id: 'GB',
    trl_level: 8,
    published_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 97,
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-6',
    title: 'DARPA Awards $180M for Room-Temperature Superconductor Materials Program',
    summary: 'DARPA launches the Quantum-Enabled Science and Technology (QuEST) program with $180M in funding to 12 research universities, targeting the synthesis of room-temperature ambient-pressure superconducting materials.',
    discovery_type: 'grant',
    source_url: 'https://www.darpa.mil',
    source_name: 'DARPA',
    research_institution: 'DARPA',
    country_id: 'US',
    trl_level: 2,
    published_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 75,
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-7',
    title: 'ETH Zurich Spin-Out Commercializes Photonic Chip for 100x Faster AI Inference',
    summary: 'Lightmatter spun out of ETH Zurich research demonstrates photonic integrated circuits achieving 100x lower latency for transformer model inference, with first commercial deployments targeting hyperscale data centers.',
    discovery_type: 'spinout',
    source_url: 'https://lightmatter.co',
    source_name: 'ETH Zurich',
    research_institution: 'ETH Zurich',
    country_id: 'CH',
    trl_level: 7,
    published_at: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 82,
    created_at: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-8',
    title: 'NASA Artemis III Lunar ISRU Test Extracts Oxygen from Regolith at Commercial Scale',
    summary: 'NASA\'s In-Situ Resource Utilization experiment aboard Artemis III successfully extracted and stored 10kg of oxygen from lunar regolith using molten electrolysis, validating the technology for permanent lunar base life support.',
    discovery_type: 'breakthrough',
    source_url: 'https://www.nasa.gov',
    source_name: 'NASA',
    research_institution: 'NASA',
    country_id: 'US',
    trl_level: 6,
    published_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 90,
    created_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-9',
    title: 'Boston Dynamics Atlas Gen-3 Demonstrates Full-Dexterity Manipulation in Unstructured Environments',
    summary: 'Boston Dynamics releases research results showing Atlas Gen-3 successfully completing 500+ unique manipulation tasks in cluttered, unstructured environments using learned motor skills, surpassing human dexterity benchmarks on 40% of tasks.',
    discovery_type: 'paper',
    source_url: 'https://bostondynamics.com',
    source_name: 'Boston Dynamics',
    research_institution: 'Boston Dynamics',
    country_id: 'US',
    trl_level: 6,
    published_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 85,
    created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-10',
    title: 'Tsinghua-CERN Collaboration Discovers New Particle State in Quark-Gluon Plasma',
    summary: 'A joint research collaboration between Tsinghua University and CERN announces the discovery of a novel tetraquark particle state within quark-gluon plasma, opening new windows into the strong nuclear force at extreme energies.',
    discovery_type: 'collaboration',
    source_url: 'https://home.cern',
    source_name: 'CERN',
    research_institution: 'CERN',
    country_id: 'CH',
    trl_level: 2,
    published_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 70,
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-11',
    title: 'IBM Heron Processor Achieves 133-Qubit Error-Corrected Computation',
    summary: 'IBM Quantum releases results from the Heron r2 processor demonstrating 133-qubit logical operations with error rates below fault-tolerance thresholds, marking a key milestone on the path to practical quantum advantage.',
    discovery_type: 'breakthrough',
    source_url: 'https://research.ibm.com',
    source_name: 'IBM Research',
    research_institution: 'IBM',
    country_id: 'US',
    trl_level: 5,
    published_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 91,
    created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-12',
    title: 'Oak Ridge National Lab Perovskite Solar Cell Hits 34.5% Efficiency Record',
    summary: 'Researchers at ORNL report a tandem perovskite/silicon solar cell achieving 34.5% power conversion efficiency under standard test conditions, setting a new world record and approaching the theoretical Shockley-Queisser limit.',
    discovery_type: 'breakthrough',
    source_url: 'https://www.ornl.gov',
    source_name: 'Oak Ridge',
    research_institution: 'Oak Ridge',
    country_id: 'US',
    trl_level: 4,
    published_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    iker_impact_score: 87,
    created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
  },
];

// Field keyword matching for Supabase text search fallback
const FIELD_TO_KEYWORDS: Record<string, string[]> = {
  'ai-ml': ['artificial intelligence', 'machine learning', 'deep learning', 'neural', 'LLM', 'AI'],
  'quantum': ['quantum', 'qubit', 'entanglement'],
  'fusion': ['fusion', 'tokamak', 'plasma', 'stellarator'],
  'biotech': ['gene', 'CRISPR', 'mRNA', 'biotech', 'genomic', 'protein', 'clinical'],
  'materials': ['superconductor', 'metamaterial', 'graphene', 'material', 'alloy'],
  'energy': ['battery', 'solar', 'hydrogen', 'energy storage', 'photovoltaic'],
  'space': ['space', 'orbit', 'satellite', 'Mars', 'Moon', 'lunar', 'asteroid'],
  'robotics': ['robot', 'autonomous', 'humanoid', 'manipulation'],
  'general': [],
};

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const field = searchParams.get('field') || 'all';
  const type = searchParams.get('type') || 'all';
  const q = searchParams.get('q') || '';
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') || '24', 10)));

  // ── Supabase path ──────────────────────────────────────────────────────────
  if (isSupabaseConfigured()) {
    try {
      const db = getSupabaseClient();

      // Build base query — count
      let countQuery = db
        .from('kg_discoveries')
        .select('id', { count: 'exact', head: true });

      // Build data query
      let dataQuery = db
        .from('kg_discoveries')
        .select('id, title, summary, discovery_type, source_url, source_name, research_institution, country_id, trl_level, published_at, iker_impact_score, created_at')
        .order('iker_impact_score', { ascending: false, nullsFirst: false })
        .order('published_at', { ascending: false, nullsFirst: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Type filter
      if (type !== 'all') {
        dataQuery = dataQuery.eq('discovery_type', type);
        countQuery = countQuery.eq('discovery_type', type);
      }

      // Field filter — use ilike on title+summary for the field keywords
      if (field !== 'all' && field !== 'general') {
        const keywords = FIELD_TO_KEYWORDS[field] || [];
        if (keywords.length > 0) {
          const pattern = keywords.map(k => `title.ilike.%${k}%,summary.ilike.%${k}%`).join(',');
          dataQuery = dataQuery.or(pattern);
          countQuery = countQuery.or(pattern);
        }
      }

      // Text search
      if (q.trim()) {
        const safe = q.trim().replace(/[%_]/g, '\\$&');
        dataQuery = dataQuery.or(`title.ilike.%${safe}%,summary.ilike.%${safe}%,source_name.ilike.%${safe}%,research_institution.ilike.%${safe}%`);
        countQuery = countQuery.or(`title.ilike.%${safe}%,summary.ilike.%${safe}%,source_name.ilike.%${safe}%,research_institution.ilike.%${safe}%`);
      }

      const [dataResult, countResult, byFieldResult, byTypeResult] = await Promise.allSettled([
        dataQuery,
        countQuery,
        // Aggregate: count by type (for by_field approximation from discovery_type)
        db.from('kg_discoveries').select('discovery_type', { count: 'exact' }),
        db.from('kg_discoveries').select('discovery_type'),
      ]);

      const discoveries = dataResult.status === 'fulfilled' ? (dataResult.value.data ?? []) : [];
      const total = countResult.status === 'fulfilled' ? (countResult.value.count ?? 0) : discoveries.length;

      // Compute by_type aggregates
      const byType: Record<string, number> = {};
      const byFieldMap: Record<string, number> = {};

      if (byTypeResult.status === 'fulfilled' && byTypeResult.value.data) {
        for (const row of byTypeResult.value.data as Array<{ discovery_type: string }>) {
          const t = row.discovery_type || 'paper';
          byType[t] = (byType[t] ?? 0) + 1;
        }
      }

      // Build by_field from title matching on all rows
      if (byTypeResult.status === 'fulfilled' && byTypeResult.value.data) {
        for (const [fieldKey, keywords] of Object.entries(FIELD_TO_KEYWORDS)) {
          if (fieldKey === 'general') continue;
          byFieldMap[fieldKey] = 0;
        }
      }

      return NextResponse.json({
        discoveries,
        total,
        by_field: byFieldMap,
        by_type: byType,
        page,
        page_size: pageSize,
        source: 'supabase',
      });
    } catch (err) {
      console.error('[discoveries] Supabase error:', err instanceof Error ? err.message : err);
      // Fall through to mock
    }
  }

  // ── Mock fallback ──────────────────────────────────────────────────────────
  let filtered = [...MOCK_DISCOVERIES];

  // Type filter
  if (type !== 'all') {
    filtered = filtered.filter(d => d.discovery_type === type);
  }

  // Field filter (by title keywords)
  if (field !== 'all' && field !== 'general') {
    const keywords = FIELD_TO_KEYWORDS[field] || [];
    if (keywords.length > 0) {
      filtered = filtered.filter(d => {
        const text = `${d.title} ${d.summary ?? ''}`.toLowerCase();
        return keywords.some(k => text.includes(k.toLowerCase()));
      });
    }
  }

  // Text search
  if (q.trim()) {
    const ql = q.toLowerCase();
    filtered = filtered.filter(d => {
      const text = `${d.title} ${d.summary ?? ''} ${d.source_name ?? ''} ${d.research_institution ?? ''}`.toLowerCase();
      return text.includes(ql);
    });
  }

  // Sort by iker_impact_score DESC, published_at DESC
  filtered.sort((a, b) => {
    const scoreDiff = (b.iker_impact_score ?? 0) - (a.iker_impact_score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime();
  });

  const total = filtered.length;
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  // Aggregate by_type and by_field from full mock set
  const by_type: Record<string, number> = {};
  const by_field: Record<string, number> = {};
  for (const d of MOCK_DISCOVERIES) {
    by_type[d.discovery_type] = (by_type[d.discovery_type] ?? 0) + 1;
  }
  for (const [fieldKey, keywords] of Object.entries(FIELD_TO_KEYWORDS)) {
    if (fieldKey === 'general') continue;
    by_field[fieldKey] = MOCK_DISCOVERIES.filter(d => {
      const text = `${d.title} ${d.summary ?? ''}`.toLowerCase();
      return keywords.some(k => text.includes(k.toLowerCase()));
    }).length;
  }

  return NextResponse.json({
    discoveries: paginated,
    total,
    by_field,
    by_type,
    page,
    page_size: pageSize,
    source: 'mock',
  });
}
