// ─── MCP Tool Definitions & Handlers ─────────────────────────────────────────
// Each tool maps to existing NXT LINK intelligence functions.
// Falls back to mock data when external services (Supabase, Neo4j) aren't configured.

import { supabase } from '@/lib/supabase';
import { hybridSearch } from '@/lib/search';
import { findConnections, isGraphEnabled } from '@/lib/graph';
import { calculateIkerScore } from '@/lib/iker-score';
import type {
  McpToolDefinition,
  McpToolResult,
  SearchVendorsInput,
  GetVendorDossierInput,
  ListSignalsInput,
  GetSignalConnectionsInput,
  SolveProblemInput,
  VendorResult,
  SignalResult,
} from './types';

// ── Tool Definitions ─────────────────────────────────────────────────────────

export const TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: 'search_vendors',
    description:
      'Search the NXT LINK vendor database. Returns vendors with IKER trust scores, sectors, and descriptions. Use filters to narrow by industry or minimum trust score.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query — company name, technology, sector, or keyword',
        },
        filters: {
          type: 'object',
          description: 'Optional filters to narrow results',
          properties: {
            industry: {
              type: 'string',
              description: 'Filter by industry (e.g. "restaurant", "warehouse", "logistics", "construction")',
            },
            minScore: {
              type: 'number',
              description: 'Minimum IKER trust score (0-100)',
              minimum: 0,
              maximum: 100,
            },
          },
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_vendor_dossier',
    description:
      'Get a full intelligence dossier for a specific vendor. Includes IKER trust score breakdown, related signals, and connection graph.',
    inputSchema: {
      type: 'object',
      properties: {
        vendor_id: {
          type: 'string',
          description: 'The unique vendor ID',
        },
      },
      required: ['vendor_id'],
    },
  },
  {
    name: 'list_signals',
    description:
      'Get recent intelligence signals from NXT LINK. Signals are market events, funding rounds, partnerships, risks, and other business intelligence.',
    inputSchema: {
      type: 'object',
      properties: {
        severity: {
          type: 'array',
          description: 'Filter by severity levels',
          items: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'low', 'info'],
          },
        },
        industry: {
          type: 'string',
          description: 'Filter by industry',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of signals to return (default: 20, max: 100)',
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
    },
  },
  {
    name: 'get_signal_connections',
    description:
      'Get the connection graph for a signal — related signals, companies, technologies, and industries linked by causal, temporal, entity, geographic, or thematic relationships.',
    inputSchema: {
      type: 'object',
      properties: {
        signal_id: {
          type: 'string',
          description: 'The signal ID to find connections for',
        },
        depth: {
          type: 'number',
          description: 'How many hops deep to traverse the graph (1-3, default: 1)',
          minimum: 1,
          maximum: 3,
          default: 1,
        },
      },
      required: ['signal_id'],
    },
  },
  {
    name: 'solve_problem',
    description:
      'Run the NXT LINK solve engine. Describe a business problem in plain English and get recommended technology solutions, vendors, market insights, and actionable next steps. Optimized for El Paso / border region businesses.',
    inputSchema: {
      type: 'object',
      properties: {
        problem: {
          type: 'string',
          description: 'Business problem described in plain English (e.g. "too many workers", "warehouse is slow", "customs delays")',
        },
        industry: {
          type: 'string',
          description: 'Optional industry context (e.g. "restaurant", "warehouse", "logistics", "construction")',
        },
      },
      required: ['problem'],
    },
  },
];

// ── Tool Handler Registry ────────────────────────────────────────────────────

type ToolHandler = (args: Record<string, unknown>) => Promise<McpToolResult>;

const handlers: Record<string, ToolHandler> = {
  search_vendors: handleSearchVendors,
  get_vendor_dossier: handleGetVendorDossier,
  list_signals: handleListSignals,
  get_signal_connections: handleGetSignalConnections,
  solve_problem: handleSolveProblem,
};

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  const handler = handlers[name];
  if (!handler) {
    return errorResult(`Unknown tool: ${name}`);
  }

  try {
    return await handler(args);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[mcp] Tool "${name}" failed:`, err);
    return errorResult(`Tool execution failed: ${message}`);
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleSearchVendors(args: Record<string, unknown>): Promise<McpToolResult> {
  const input = args as unknown as SearchVendorsInput;
  if (!input.query || typeof input.query !== 'string') {
    return errorResult('Missing required parameter: query');
  }

  const industry = input.filters?.industry;
  const minScore = input.filters?.minScore ?? 0;

  // Try Supabase first
  if (supabase) {
    try {
      let q = supabase
        .from('vendors')
        .select('id, company_name, sector, iker_score, company_url, description')
        .gte('iker_score', minScore)
        .order('iker_score', { ascending: false })
        .limit(20);

      if (industry) {
        q = q.ilike('sector', `%${industry}%`);
      }

      // Text search on company name and description
      q = q.or(`company_name.ilike.%${input.query}%,description.ilike.%${input.query}%,sector.ilike.%${input.query}%`);

      const { data, error } = await q;

      if (!error && data && data.length > 0) {
        const vendors: VendorResult[] = data.map((v) => ({
          id: v.id,
          name: v.company_name,
          sector: v.sector ?? 'Unknown',
          iker_score: v.iker_score ?? 0,
          website: v.company_url ?? undefined,
          description: v.description ?? undefined,
        }));

        return jsonResult({ vendors, count: vendors.length, source: 'database' });
      }
    } catch (err) {
      console.warn('[mcp] Supabase vendor search failed, falling back to hybrid search:', err);
    }
  }

  // Fallback: use hybrid search
  const searchResults = await hybridSearch(input.query, {
    limit: 20,
    industries: industry ? [industry] : undefined,
  });

  if (searchResults.length > 0) {
    return jsonResult({
      vendors: searchResults.map((r) => ({
        id: r.id,
        name: r.title,
        sector: (r.metadata?.industry as string) ?? 'Unknown',
        iker_score: Math.round(r.score * 100),
        description: r.highlights?.join(' '),
      })),
      count: searchResults.length,
      source: 'hybrid_search',
    });
  }

  // Final fallback: mock data
  return jsonResult({
    vendors: getMockVendors(input.query, minScore),
    count: 3,
    source: 'mock',
    note: 'Database not configured — returning sample data',
  });
}

async function handleGetVendorDossier(args: Record<string, unknown>): Promise<McpToolResult> {
  const input = args as unknown as GetVendorDossierInput;
  if (!input.vendor_id || typeof input.vendor_id !== 'string') {
    return errorResult('Missing required parameter: vendor_id');
  }

  // Try Supabase
  if (supabase) {
    try {
      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', input.vendor_id)
        .single();

      if (!error && vendor) {
        // Fetch related signals
        const { data: signals } = await supabase
          .from('intel_signals')
          .select('id, title, summary, severity, industry, detected_at, source_url')
          .or(`title.ilike.%${vendor.company_name}%,summary.ilike.%${vendor.company_name}%`)
          .order('detected_at', { ascending: false })
          .limit(10);

        // Compute IKER breakdown
        const ikerBreakdown = calculateIkerScore({
          yearsInBusiness: vendor.years_in_business ?? undefined,
          employeeGrowth: vendor.employee_growth ?? undefined,
          leadershipStable: vendor.leadership_stable ?? undefined,
          recentPartnerships: vendor.recent_partnerships ?? undefined,
          positiveNewsCount: vendor.positive_news_count ?? undefined,
          hasLocalCustomers: vendor.has_local_customers ?? undefined,
          hasCaseStudies: vendor.has_case_studies ?? undefined,
          avgReviewScore: vendor.avg_review_score ?? undefined,
          lastFundingDaysAgo: vendor.last_funding_days_ago ?? undefined,
        });

        // Graph connections (if available)
        let connections = { nodes: [] as unknown[], edges: [] as unknown[] };
        if (isGraphEnabled()) {
          connections = await findConnections(input.vendor_id, 1);
        }

        return jsonResult({
          vendor: {
            id: vendor.id,
            name: vendor.company_name,
            sector: vendor.sector,
            iker_score: vendor.iker_score,
            website: vendor.company_url,
            description: vendor.description,
            headquarters: vendor.headquarters,
            employee_count: vendor.employee_count,
            founded_year: vendor.founded_year,
          },
          signals: (signals ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            summary: s.summary,
            severity: s.severity,
            industry: s.industry,
            detected_at: s.detected_at,
          })),
          connections,
          iker_breakdown: {
            score: ikerBreakdown.score,
            confidence: ikerBreakdown.confidence,
            tier: ikerBreakdown.tier,
            factors: ikerBreakdown.factors,
            missing: ikerBreakdown.missing,
          },
        });
      }
    } catch (err) {
      console.warn('[mcp] Vendor dossier lookup failed:', err);
    }
  }

  // Mock fallback
  const mockBreakdown = calculateIkerScore({
    yearsInBusiness: 8,
    employeeGrowth: 'growing',
    recentPartnerships: 2,
    positiveNewsCount: 3,
    hasLocalCustomers: true,
    hasCaseStudies: true,
    avgReviewScore: 4.2,
  });

  return jsonResult({
    vendor: {
      id: input.vendor_id,
      name: 'Sample Vendor (mock)',
      sector: 'Technology',
      iker_score: mockBreakdown.score,
      description: 'Database not configured — returning sample dossier',
    },
    signals: [
      {
        id: 'mock-sig-1',
        title: 'Series B funding announced',
        severity: 'medium',
        industry: 'technology',
        detected_at: new Date().toISOString(),
      },
    ],
    connections: { nodes: [], edges: [] },
    iker_breakdown: {
      score: mockBreakdown.score,
      confidence: mockBreakdown.confidence,
      tier: mockBreakdown.tier,
      factors: mockBreakdown.factors,
      missing: mockBreakdown.missing,
    },
    source: 'mock',
  });
}

async function handleListSignals(args: Record<string, unknown>): Promise<McpToolResult> {
  const input = args as unknown as ListSignalsInput;
  const limit = Math.min(input.limit ?? 20, 100);

  // Try Supabase
  if (supabase) {
    try {
      let q = supabase
        .from('intel_signals')
        .select('id, title, summary, severity, industry, detected_at, source_url')
        .order('detected_at', { ascending: false })
        .limit(limit);

      if (input.severity?.length) {
        q = q.in('severity', input.severity);
      }

      if (input.industry) {
        q = q.ilike('industry', `%${input.industry}%`);
      }

      const { data, error } = await q;

      if (!error && data) {
        const signals: SignalResult[] = data.map((s) => ({
          id: s.id,
          title: s.title,
          summary: s.summary ?? undefined,
          severity: s.severity,
          industry: s.industry ?? undefined,
          detected_at: s.detected_at ?? undefined,
          source: s.source_url ?? undefined,
        }));

        return jsonResult({ signals, count: signals.length, source: 'database' });
      }
    } catch (err) {
      console.warn('[mcp] Signal listing failed:', err);
    }
  }

  // Mock fallback
  return jsonResult({
    signals: getMockSignals(input.severity, input.industry, limit),
    count: 5,
    source: 'mock',
    note: 'Database not configured — returning sample signals',
  });
}

async function handleGetSignalConnections(args: Record<string, unknown>): Promise<McpToolResult> {
  const input = args as unknown as GetSignalConnectionsInput;
  if (!input.signal_id || typeof input.signal_id !== 'string') {
    return errorResult('Missing required parameter: signal_id');
  }

  const depth = Math.min(input.depth ?? 1, 3);

  // Try graph database
  if (isGraphEnabled()) {
    const graph = await findConnections(input.signal_id, depth);
    return jsonResult({
      root_signal_id: input.signal_id,
      nodes: graph.nodes,
      edges: graph.edges,
      depth,
      source: 'neo4j',
    });
  }

  // If no graph DB, try to find related signals via Supabase text matching
  if (supabase) {
    try {
      const { data: rootSignal } = await supabase
        .from('intel_signals')
        .select('id, title, summary, severity, industry')
        .eq('id', input.signal_id)
        .single();

      if (rootSignal) {
        // Find signals in the same industry
        const { data: related } = await supabase
          .from('intel_signals')
          .select('id, title, severity, industry, detected_at')
          .eq('industry', rootSignal.industry)
          .neq('id', input.signal_id)
          .order('detected_at', { ascending: false })
          .limit(10);

        const nodes = [
          { id: rootSignal.id, label: 'Signal', properties: { title: rootSignal.title, severity: rootSignal.severity } },
          ...(related ?? []).map((s) => ({
            id: s.id,
            label: 'Signal',
            properties: { title: s.title, severity: s.severity },
          })),
        ];

        const edges = (related ?? []).map((s) => ({
          source: rootSignal.id,
          target: s.id,
          type: 'thematic',
          properties: { industry: rootSignal.industry },
        }));

        return jsonResult({
          root_signal_id: input.signal_id,
          nodes,
          edges,
          depth,
          source: 'supabase_fallback',
          note: 'Graph database not configured — connections inferred from shared industry',
        });
      }
    } catch (err) {
      console.warn('[mcp] Signal connection lookup failed:', err);
    }
  }

  // Mock fallback
  return jsonResult({
    root_signal_id: input.signal_id,
    nodes: [
      { id: input.signal_id, label: 'Signal', properties: { title: 'Root signal (mock)' } },
      { id: 'mock-connected-1', label: 'Signal', properties: { title: 'Related funding event' } },
      { id: 'mock-connected-2', label: 'Company', properties: { title: 'Acme Corp' } },
    ],
    edges: [
      { source: input.signal_id, target: 'mock-connected-1', type: 'causal', properties: {} },
      { source: input.signal_id, target: 'mock-connected-2', type: 'entity', properties: {} },
    ],
    depth,
    source: 'mock',
    note: 'No graph or database configured — returning sample connections',
  });
}

async function handleSolveProblem(args: Record<string, unknown>): Promise<McpToolResult> {
  const input = args as unknown as SolveProblemInput;
  if (!input.problem || typeof input.problem !== 'string' || input.problem.trim().length < 3) {
    return errorResult('Missing or too short parameter: problem (minimum 3 characters)');
  }

  // Call the decide API internally
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem: input.problem,
        industry: input.industry,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return jsonResult({
        problem: data.problem,
        user_input: data.user_input,
        matched_industries: data.matched_industries,
        recommended_solution: data.recommended_solution,
        all_solutions: data.all_solutions,
        best_regions: data.best_regions,
        market_insight: data.market_insight,
        vendors: data.vendors,
        next_step: data.next_step,
        source: 'solve_engine',
      });
    }

    // If API call fails, return a simplified response
    console.warn('[mcp] Solve engine API returned', res.status);
  } catch (err) {
    console.warn('[mcp] Solve engine call failed:', err);
  }

  // Fallback: return a helpful response even without the API
  return jsonResult({
    problem: input.problem,
    matched_industries: input.industry ? [input.industry] : ['general'],
    recommended_solution: null,
    vendors: [],
    market_insight: {
      growth: 'unknown',
      competition: 'unknown',
      summary: 'Solve engine is unavailable. Try querying the /api/decide endpoint directly.',
    },
    next_step: 'Describe your problem in more detail or try the NXT LINK web interface at /decide.',
    source: 'fallback',
    note: 'Solve engine API unavailable — limited response',
  });
}

// ── Response Helpers ─────────────────────────────────────────────────────────

function jsonResult(data: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

// ── Mock Data ────────────────────────────────────────────────────────────────

function getMockVendors(query: string, minScore: number): VendorResult[] {
  const mocks: VendorResult[] = [
    {
      id: 'mock-v1',
      name: 'BorderTech Solutions',
      sector: 'Border Technology / Customs',
      iker_score: 82,
      website: 'https://bordertech.example.com',
      description: 'AI-powered customs processing and cross-border logistics automation for the US-Mexico corridor.',
    },
    {
      id: 'mock-v2',
      name: 'WarehouseIQ',
      sector: 'Warehouse / Logistics',
      iker_score: 76,
      website: 'https://warehouseiq.example.com',
      description: 'Smart warehouse management with AMR integration, pick-path optimization, and real-time inventory tracking.',
    },
    {
      id: 'mock-v3',
      name: 'Servio AI',
      sector: 'Restaurant / Food Service',
      iker_score: 71,
      website: 'https://servio.example.com',
      description: 'AI ordering, kitchen display, and labor scheduling for quick-service and fast-casual restaurants.',
    },
    {
      id: 'mock-v4',
      name: 'CleanRoute Pro',
      sector: 'Window Cleaning / Field Service',
      iker_score: 65,
      website: 'https://cleanroute.example.com',
      description: 'Route optimization, job scheduling, and invoicing for commercial window cleaning and building maintenance.',
    },
    {
      id: 'mock-v5',
      name: 'BuildSync',
      sector: 'Construction',
      iker_score: 58,
      website: 'https://buildsync.example.com',
      description: 'Construction project management with safety compliance, time tracking, and job costing.',
    },
  ];

  const q = query.toLowerCase();
  const filtered = mocks.filter(
    (v) =>
      v.iker_score >= minScore &&
      (v.name.toLowerCase().includes(q) ||
        v.sector.toLowerCase().includes(q) ||
        (v.description ?? '').toLowerCase().includes(q) ||
        q.split(' ').some((w) => (v.description ?? '').toLowerCase().includes(w)))
  );

  return filtered.length > 0 ? filtered : mocks.filter((v) => v.iker_score >= minScore).slice(0, 3);
}

function getMockSignals(
  severity?: string[],
  industry?: string,
  limit: number = 5
): SignalResult[] {
  const now = new Date();
  const mocks: SignalResult[] = [
    {
      id: 'mock-s1',
      title: 'AI customs processing startup raises $12M Series A',
      summary: 'New AI-driven customs clearance platform targets US-Mexico corridor, promising 60% faster processing times.',
      severity: 'high',
      industry: 'border_tech',
      detected_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
    },
    {
      id: 'mock-s2',
      title: 'Major warehouse automation vendor expands to El Paso',
      summary: 'Locus Robotics opens regional distribution center in El Paso, signaling growing demand for warehouse AMRs.',
      severity: 'medium',
      industry: 'warehouse',
      detected_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
    },
    {
      id: 'mock-s3',
      title: 'Restaurant labor costs hit record high in Texas',
      summary: 'BLS data shows restaurant labor costs in Texas up 18% YoY, accelerating automation adoption.',
      severity: 'critical',
      industry: 'restaurant',
      detected_at: new Date(now.getTime() - 7 * 86400000).toISOString(),
    },
    {
      id: 'mock-s4',
      title: 'New OSHA regulations for construction sites in 2026',
      summary: 'Updated fall protection and heat illness prevention standards take effect Q2 2026.',
      severity: 'high',
      industry: 'construction',
      detected_at: new Date(now.getTime() - 10 * 86400000).toISOString(),
    },
    {
      id: 'mock-s5',
      title: 'Window cleaning industry sees 22% growth in commercial sector',
      summary: 'Post-pandemic office return drives demand for commercial building maintenance services.',
      severity: 'low',
      industry: 'window_cleaning',
      detected_at: new Date(now.getTime() - 14 * 86400000).toISOString(),
    },
  ];

  let filtered = mocks;

  if (severity?.length) {
    filtered = filtered.filter((s) => severity.includes(s.severity));
  }

  if (industry) {
    const ind = industry.toLowerCase();
    filtered = filtered.filter((s) => (s.industry ?? '').toLowerCase().includes(ind));
  }

  return (filtered.length > 0 ? filtered : mocks).slice(0, limit);
}
