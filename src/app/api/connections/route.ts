/**
 * GET /api/connections — Graph data for Cytoscape visualization
 *
 * Query params:
 *   industry  — filter by industry (optional)
 *   days      — lookback window (default 14)
 *
 * Returns: { nodes, edges, chains }
 */

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';


interface GraphNode {
  id: string;
  label: string;
  type: 'signal' | 'company' | 'chain';
  industry?: string;
  importance?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  strength: number;
}

interface ChainSummary {
  id: string;
  title: string;
  signal_count: number;
  progression: number;
  industries: string[];
}

export async function GET(req: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry');
  const days = parseInt(searchParams.get('days') || '14', 10);

  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  // Parallel fetch
  const [
    { data: connections },
    { data: chains },
    { data: chainSignals },
    { data: signals },
  ] = await Promise.all([
    supabase
      .from('signal_connections')
      .select('source_signal_id, target_signal_id, connection_type, strength')
      .gte('created_at', cutoff)
      .order('strength', { ascending: false })
      .limit(200),

    supabase
      .from('causal_chains')
      .select('id, title, total_nodes, progression, industries, status')
      .eq('status', 'active')
      .order('confidence', { ascending: false })
      .limit(20),

    supabase
      .from('causal_chain_signals')
      .select('chain_id, signal_id, node_index, relevance')
      .order('relevance', { ascending: false })
      .limit(200),

    supabase
      .from('intel_signals')
      .select('id, title, industry, company, importance_score, signal_type')
      .eq('is_noise', false)
      .gte('discovered_at', cutoff)
      .gte('importance_score', 0.2)
      .order('importance_score', { ascending: false })
      .limit(300),
  ]);

  // Build signal lookup
  type Signal = { id: string; title: string; industry: string; company: string | null; importance_score: number; signal_type: string };
  const signalMap = new Map<string, Signal>();
  for (const s of signals || []) {
    if (industry && s.industry !== industry) continue;
    signalMap.set(s.id, s);
  }

  // Collect all signal IDs referenced in connections
  const referencedIds = new Set<string>();
  for (const c of connections || []) {
    referencedIds.add(c.source_signal_id);
    referencedIds.add(c.target_signal_id);
  }
  for (const cs of chainSignals || []) {
    referencedIds.add(cs.signal_id);
  }

  // Build nodes
  const nodes: GraphNode[] = [];
  const nodeIds = new Set<string>();
  const companyNodes = new Set<string>();

  for (const id of referencedIds) {
    const s = signalMap.get(id);
    if (!s) continue;
    if (!nodeIds.has(id)) {
      nodes.push({
        id,
        label: s.title?.slice(0, 60) || id,
        type: 'signal',
        industry: s.industry,
        importance: s.importance_score,
      });
      nodeIds.add(id);
    }
    // Add company node
    if (s.company && !companyNodes.has(s.company)) {
      const companyId = `company-${s.company.replace(/\s+/g, '-')}`;
      nodes.push({
        id: companyId,
        label: s.company,
        type: 'company',
      });
      companyNodes.add(s.company);
      nodeIds.add(companyId);
    }
  }

  // Also add signal nodes that aren't in connections but are important
  for (const s of signalMap.values()) {
    if (!nodeIds.has(s.id) && s.importance_score >= 0.5) {
      nodes.push({
        id: s.id,
        label: s.title?.slice(0, 60) || s.id,
        type: 'signal',
        industry: s.industry,
        importance: s.importance_score,
      });
      nodeIds.add(s.id);
    }
  }

  // Build edges (only between nodes that exist)
  const edges: GraphEdge[] = [];
  for (const c of connections || []) {
    if (nodeIds.has(c.source_signal_id) && nodeIds.has(c.target_signal_id)) {
      edges.push({
        source: c.source_signal_id,
        target: c.target_signal_id,
        type: c.connection_type,
        strength: c.strength,
      });
    }
  }

  // Add company-signal edges
  for (const s of signalMap.values()) {
    if (s.company && nodeIds.has(s.id)) {
      const companyId = `company-${s.company.replace(/\s+/g, '-')}`;
      if (nodeIds.has(companyId)) {
        edges.push({
          source: s.id,
          target: companyId,
          type: 'company',
          strength: 1.0,
        });
      }
    }
  }

  // Build chain nodes + edges
  const chainSummaries: ChainSummary[] = [];
  for (const chain of chains || []) {
    const chainId = chain.id;
    const linkedSignals = (chainSignals || []).filter(cs => cs.chain_id === chainId);

    // Only include chains with signals we have nodes for
    const validSignals = linkedSignals.filter(cs => nodeIds.has(cs.signal_id));
    if (validSignals.length === 0) continue;

    // Add chain as a node
    nodes.push({
      id: chainId,
      label: chain.title?.slice(0, 50) || 'Event Chain',
      type: 'chain',
    });
    nodeIds.add(chainId);

    // Connect chain to its signals
    for (const cs of validSignals) {
      edges.push({
        source: chainId,
        target: cs.signal_id,
        type: 'chain',
        strength: (cs.relevance || 80) / 100,
      });
    }

    chainSummaries.push({
      id: chainId,
      title: chain.title || 'Untitled',
      signal_count: chain.total_nodes || validSignals.length,
      progression: chain.progression || 0,
      industries: chain.industries || [],
    });
  }

  return NextResponse.json({
    nodes,
    edges,
    chains: chainSummaries,
    meta: {
      total_nodes: nodes.length,
      total_edges: edges.length,
      total_chains: chainSummaries.length,
      industry_filter: industry,
      days,
    },
  });
}
