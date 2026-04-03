/**
 * Causal Intelligence Engine v2
 *
 * Signal → match stored problem → load causal map from DB → deterministic decision
 *
 * The system REMEMBERS how to think. It doesn't think from scratch.
 * Causal maps are defined in Obsidian → stored in Supabase → loaded here.
 * AI is only used downstream for EXPLANATION, never for logic.
 */

import { createClient } from '@/lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export type EventType =
  | 'trade_policy' | 'conflict' | 'politics' | 'demand_shift'
  | 'labor' | 'infrastructure' | 'regulation' | 'technology'
  | 'climate' | 'financial' | 'other';

export type Effect = {
  label: string;
  severity: 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'weeks' | 'months';
};

export type CausalMap = {
  id: string;
  problem: string;
  description: string | null;
  event_type: EventType;
  causes: string[];
  effects: Effect[];
  solutions: string[];
  technologies: string[];
  keywords: string[];
  industries: string[];
  regions: string[];
  confidence: number;
};

export type GraphNode = {
  id: string;
  type: 'signal' | 'event' | 'effect' | 'technology' | 'vendor' | 'solution';
  label: string;
  data?: Record<string, unknown>;
};

export type GraphEdge = {
  source: string;
  target: string;
  type: 'causes' | 'leads_to' | 'solved_by' | 'provided_by';
  weight: number;
};

export type CausalGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type CausalAnalysis = {
  matched_problem: string | null;
  event_type: EventType;
  event_confidence: number;
  matched_keywords: string[];
  causes: string[];
  effects: Effect[];
  solutions: string[];
  technologies: string[];
  urgency: 'act_now' | 'watch' | 'opportunity';
  graph: CausalGraph;
};

// ── Cache for causal maps (reload every 5 min) ──────────────────────────────

let cachedMaps: CausalMap[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadCausalMaps(): Promise<CausalMap[]> {
  if (cachedMaps && Date.now() - cacheTime < CACHE_TTL) {
    return cachedMaps;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('causal_maps')
      .select('*')
      .eq('active', true)
      .order('confidence', { ascending: false });

    if (error || !data) {
      console.warn('[causal] Failed to load maps from DB, using empty set:', error);
      return cachedMaps || [];
    }

    cachedMaps = data.map(row => ({
      id: row.id,
      problem: row.problem,
      description: row.description,
      event_type: row.event_type as EventType,
      causes: row.causes || [],
      effects: (row.effects || []) as Effect[],
      solutions: row.solutions || [],
      technologies: row.technologies || [],
      keywords: row.keywords || [],
      industries: row.industries || [],
      regions: row.regions || [],
      confidence: row.confidence ?? 1.0,
    }));
    cacheTime = Date.now();

    return cachedMaps;
  } catch {
    console.warn('[causal] Exception loading maps, using cached');
    return cachedMaps || [];
  }
}

// ── Pattern Match: Signal → Stored Problem ───────────────────────────────────

export async function matchSignalToProblem(
  title: string,
  evidence: string,
): Promise<{ map: CausalMap; confidence: number; matched_keywords: string[] } | null> {
  const maps = await loadCausalMaps();
  const text = `${title} ${evidence}`.toLowerCase();

  let bestMap: CausalMap | null = null;
  let bestScore = 0;
  let bestKeywords: string[] = [];

  for (const map of maps) {
    const matched: string[] = [];
    for (const kw of map.keywords) {
      if (text.includes(kw.toLowerCase())) {
        matched.push(kw);
      }
    }

    if (matched.length === 0) continue;

    // Score: keyword matches × map confidence
    const score = matched.length * map.confidence;

    if (score > bestScore) {
      bestScore = score;
      bestMap = map;
      bestKeywords = matched;
    }
  }

  if (!bestMap) return null;

  // Confidence: based on keyword coverage
  const confidence = Math.min(0.3 + bestKeywords.length * 0.2, 0.95);

  return { map: bestMap, confidence, matched_keywords: bestKeywords };
}

// ── Build Causal Graph ───────────────────────────────────────────────────────

function buildGraph(
  signalId: string,
  signalTitle: string,
  map: CausalMap,
  matchedVendors: { id: string; name: string }[],
): CausalGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Signal node
  const signalNodeId = `signal_${signalId}`;
  nodes.push({ id: signalNodeId, type: 'signal', label: signalTitle.slice(0, 80) });

  // Problem/Event node
  const eventNodeId = `event_${map.problem.replace(/\s+/g, '_')}`;
  nodes.push({
    id: eventNodeId,
    type: 'event',
    label: map.problem,
    data: { event_type: map.event_type, description: map.description },
  });
  edges.push({ source: signalNodeId, target: eventNodeId, type: 'causes', weight: 0.9 });

  // Effect nodes
  for (const effect of map.effects) {
    const effectId = `effect_${effect.label.replace(/\s+/g, '_').toLowerCase().slice(0, 40)}`;
    if (!nodes.some(n => n.id === effectId)) {
      nodes.push({
        id: effectId,
        type: 'effect',
        label: effect.label,
        data: { severity: effect.severity, timeframe: effect.timeframe },
      });
    }
    edges.push({
      source: eventNodeId,
      target: effectId,
      type: 'leads_to',
      weight: effect.severity === 'high' ? 0.9 : effect.severity === 'medium' ? 0.6 : 0.3,
    });
  }

  // Technology nodes
  for (const tech of map.technologies) {
    const techId = `tech_${tech.replace(/\s+/g, '_').toLowerCase()}`;
    if (!nodes.some(n => n.id === techId)) {
      nodes.push({ id: techId, type: 'technology', label: tech });
    }
    // Connect to first relevant effect
    const effectNode = nodes.find(n => n.type === 'effect');
    if (effectNode) {
      edges.push({ source: effectNode.id, target: techId, type: 'solved_by', weight: 0.7 });
    }
  }

  // Solution nodes
  for (const sol of map.solutions) {
    const solId = `solution_${sol.replace(/\s+/g, '_').toLowerCase().slice(0, 40)}`;
    if (!nodes.some(n => n.id === solId)) {
      nodes.push({ id: solId, type: 'solution', label: sol });
    }
  }

  // Vendor nodes
  for (const vendor of matchedVendors) {
    const vendorId = `vendor_${vendor.id}`;
    nodes.push({ id: vendorId, type: 'vendor', label: vendor.name });
    // Connect to technologies
    for (const tech of map.technologies.slice(0, 3)) {
      const techId = `tech_${tech.replace(/\s+/g, '_').toLowerCase()}`;
      if (nodes.some(n => n.id === techId)) {
        edges.push({ source: techId, target: vendorId, type: 'provided_by', weight: 0.5 });
      }
    }
  }

  return { nodes, edges };
}

// ── Full Causal Analysis ─────────────────────────────────────────────────────

export async function analyzeCausality(
  signalId: string,
  signalTitle: string,
  signalEvidence: string,
  importance: number,
  discoveredAt: string,
  matchedVendors: { id: string; name: string }[],
): Promise<CausalAnalysis> {
  const match = await matchSignalToProblem(signalTitle, signalEvidence);

  if (match) {
    // Found a stored causal map — use it
    const { map, confidence, matched_keywords } = match;

    // Urgency from effects (deterministic)
    const hasHighSeverity = map.effects.some(e => e.severity === 'high');
    const hasImmediate = map.effects.some(e => e.timeframe === 'immediate');
    const hoursSince = (Date.now() - new Date(discoveredAt).getTime()) / 3600000;

    let urgency: 'act_now' | 'watch' | 'opportunity';
    if ((hasHighSeverity && hasImmediate) || (importance >= 80 && hoursSince < 48)) {
      urgency = 'act_now';
    } else if (hasHighSeverity || importance >= 60) {
      urgency = 'watch';
    } else {
      urgency = 'opportunity';
    }

    const graph = buildGraph(signalId, signalTitle, map, matchedVendors);

    return {
      matched_problem: map.problem,
      event_type: map.event_type,
      event_confidence: confidence,
      matched_keywords,
      causes: map.causes,
      effects: map.effects,
      solutions: map.solutions,
      technologies: map.technologies,
      urgency,
      graph,
    };
  }

  // No stored map found — return minimal analysis
  return {
    matched_problem: null,
    event_type: 'other',
    event_confidence: 0.1,
    matched_keywords: [],
    causes: [],
    effects: [{ label: 'Impact unclear — monitor', severity: 'low', timeframe: 'weeks' }],
    solutions: ['Monitor for further developments'],
    technologies: [],
    urgency: 'opportunity',
    graph: {
      nodes: [{ id: `signal_${signalId}`, type: 'signal', label: signalTitle.slice(0, 80) }],
      edges: [],
    },
  };
}

// ── API helpers for managing causal maps ──────────────────────────────────────

export async function getAllCausalMaps(): Promise<CausalMap[]> {
  return loadCausalMaps();
}

export async function addCausalMap(map: Omit<CausalMap, 'id'>): Promise<{ id: string } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('causal_maps')
    .insert({
      problem: map.problem,
      description: map.description,
      event_type: map.event_type,
      causes: map.causes,
      effects: JSON.parse(JSON.stringify(map.effects)),
      solutions: map.solutions,
      technologies: map.technologies,
      keywords: map.keywords,
      industries: map.industries,
      regions: map.regions,
      confidence: map.confidence,
      source: 'manual',
      active: true,
    })
    .select('id')
    .single();

  if (error || !data) return null;

  // Invalidate cache
  cachedMaps = null;
  return { id: data.id };
}

export async function updateCausalMap(id: string, updates: Partial<CausalMap>): Promise<boolean> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (updates.problem !== undefined) payload.problem = updates.problem;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.event_type !== undefined) payload.event_type = updates.event_type;
  if (updates.causes !== undefined) payload.causes = updates.causes;
  if (updates.effects !== undefined) payload.effects = JSON.parse(JSON.stringify(updates.effects));
  if (updates.solutions !== undefined) payload.solutions = updates.solutions;
  if (updates.technologies !== undefined) payload.technologies = updates.technologies;
  if (updates.keywords !== undefined) payload.keywords = updates.keywords;
  if (updates.industries !== undefined) payload.industries = updates.industries;
  if (updates.regions !== undefined) payload.regions = updates.regions;
  if (updates.confidence !== undefined) payload.confidence = updates.confidence;

  const { error } = await supabase
    .from('causal_maps')
    .update(payload)
    .eq('id', id);

  // Invalidate cache
  cachedMaps = null;
  return !error;
}
