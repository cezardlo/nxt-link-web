/**
 * Causal Intelligence Engine
 *
 * Signal → Event Classification → Causal Rules → Effects → Technologies → Vendors
 *
 * NO AI. NO ML. Pure rules + keyword matching.
 * AI is only used downstream for EXPLANATION, never for logic.
 */

// ── Event Types ──────────────────────────────────────────────────────────────

export type EventType =
  | 'trade_policy'
  | 'conflict'
  | 'politics'
  | 'demand_shift'
  | 'labor'
  | 'infrastructure'
  | 'regulation'
  | 'technology'
  | 'climate'
  | 'financial'
  | 'other';

export type Effect = {
  id: string;
  label: string;
  severity: 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'weeks' | 'months';
};

export type CausalChain = {
  event_type: EventType;
  event_keywords: string[];
  effects: Effect[];
  technologies: string[];
  urgency: 'act_now' | 'watch' | 'opportunity';
};

// ── Event Classification (keyword rules) ─────────────────────────────────────

const EVENT_KEYWORDS: Record<EventType, string[]> = {
  trade_policy: [
    'tariff', 'tariffs', 'trade war', 'usmca', 'nafta', 'import duty', 'export ban',
    'trade agreement', 'trade deal', 'trade deficit', 'customs duty', 'trade restriction',
    'sanctions', 'embargo', 'anti-dumping', 'countervailing', 'section 301', 'section 232',
    'nearshoring', 'reshoring', 'friendshoring', 'trade surplus',
  ],
  conflict: [
    'war', 'conflict', 'invasion', 'military', 'missile', 'attack', 'bombing',
    'blockade', 'naval', 'strait', 'red sea', 'houthi', 'suez', 'panama canal',
    'piracy', 'drone strike', 'ceasefire', 'escalation', 'tensions',
  ],
  politics: [
    'election', 'policy', 'executive order', 'legislation', 'congress', 'senate',
    'white house', 'governor', 'mayor', 'political', 'bipartisan', 'regulation',
    'deregulation', 'stimulus', 'infrastructure bill', 'budget',
  ],
  demand_shift: [
    'demand surge', 'demand drop', 'consumer spending', 'retail sales', 'e-commerce',
    'peak season', 'holiday', 'black friday', 'inventory buildup', 'destocking',
    'backlog', 'order cancellation', 'demand forecast', 'consumption',
  ],
  labor: [
    'strike', 'labor shortage', 'driver shortage', 'workforce', 'union',
    'walkout', 'hiring freeze', 'layoff', 'wage increase', 'minimum wage',
    'immigration', 'visa', 'h-2b', 'worker', 'employment',
  ],
  infrastructure: [
    'port congestion', 'bridge collapse', 'road closure', 'construction',
    'rail disruption', 'derailment', 'airport', 'port expansion', 'warehouse',
    'distribution center', 'facility', 'capacity expansion', 'bottleneck',
  ],
  regulation: [
    'fmcsa', 'dot', 'eld', 'hours of service', 'emission', 'epa', 'osha',
    'compliance', 'inspection', 'recall', 'safety', 'hazmat', 'food safety',
    'fda', 'cbp', 'c-tpat', 'known shipper',
  ],
  technology: [
    'autonomous', 'self-driving', 'electric vehicle', 'ev', 'battery',
    'ai', 'artificial intelligence', 'automation', 'robot', 'drone',
    'blockchain', 'iot', 'sensor', 'telematics', 'digital twin',
  ],
  climate: [
    'hurricane', 'flood', 'wildfire', 'earthquake', 'tornado', 'ice storm',
    'heat wave', 'drought', 'climate', 'weather', 'natural disaster',
    'storm', 'blizzard', 'power outage',
  ],
  financial: [
    'bankruptcy', 'acquisition', 'merger', 'ipo', 'funding', 'investment',
    'revenue', 'earnings', 'profit', 'loss', 'debt', 'credit',
    'interest rate', 'inflation', 'recession', 'gdp',
  ],
  other: [],
};

export function classifyEvent(text: string): { type: EventType; confidence: number; matched_keywords: string[] } {
  const lower = text.toLowerCase();
  let bestType: EventType = 'other';
  let bestScore = 0;
  let bestKeywords: string[] = [];

  for (const [eventType, keywords] of Object.entries(EVENT_KEYWORDS) as [EventType, string[]][]) {
    if (eventType === 'other') continue;
    const matched: string[] = [];
    for (const kw of keywords) {
      if (lower.includes(kw)) matched.push(kw);
    }
    if (matched.length > bestScore) {
      bestScore = matched.length;
      bestType = eventType;
      bestKeywords = matched;
    }
  }

  // Confidence: 1 keyword = 0.4, 2 = 0.6, 3+ = 0.8+
  const confidence = bestScore === 0 ? 0.1 : Math.min(0.3 + bestScore * 0.2, 0.95);

  return { type: bestType, confidence, matched_keywords: bestKeywords };
}

// ── Causal Rules (event → effects) ───────────────────────────────────────────

const CAUSAL_RULES: Record<EventType, Effect[]> = {
  trade_policy: [
    { id: 'cost_increase', label: 'Cost increase on imported goods', severity: 'high', timeframe: 'weeks' },
    { id: 'supplier_shift', label: 'Suppliers shift to new countries', severity: 'medium', timeframe: 'months' },
    { id: 'route_change', label: 'Trade routes and corridors shift', severity: 'medium', timeframe: 'months' },
    { id: 'inventory_rush', label: 'Pre-tariff inventory buildup', severity: 'high', timeframe: 'immediate' },
  ],
  conflict: [
    { id: 'route_disruption', label: 'Shipping routes disrupted', severity: 'high', timeframe: 'immediate' },
    { id: 'supply_risk', label: 'Supply shortage from affected region', severity: 'high', timeframe: 'weeks' },
    { id: 'cost_spike', label: 'Freight rates and insurance spike', severity: 'high', timeframe: 'immediate' },
    { id: 'alt_sourcing', label: 'Need alternate sourcing', severity: 'medium', timeframe: 'weeks' },
  ],
  politics: [
    { id: 'policy_change', label: 'Policy or regulation change coming', severity: 'medium', timeframe: 'months' },
    { id: 'uncertainty', label: 'Market uncertainty and delayed decisions', severity: 'low', timeframe: 'weeks' },
    { id: 'budget_impact', label: 'Government spending shifts', severity: 'medium', timeframe: 'months' },
  ],
  demand_shift: [
    { id: 'capacity_pressure', label: 'Warehouse/transport capacity pressure', severity: 'high', timeframe: 'weeks' },
    { id: 'price_change', label: 'Freight pricing changes', severity: 'medium', timeframe: 'weeks' },
    { id: 'inventory_mismatch', label: 'Inventory vs demand mismatch', severity: 'high', timeframe: 'immediate' },
  ],
  labor: [
    { id: 'ops_slowdown', label: 'Operations slow down', severity: 'high', timeframe: 'immediate' },
    { id: 'cost_increase', label: 'Labor costs increase', severity: 'medium', timeframe: 'weeks' },
    { id: 'service_degradation', label: 'Service quality drops', severity: 'medium', timeframe: 'immediate' },
  ],
  infrastructure: [
    { id: 'bottleneck', label: 'Capacity bottleneck', severity: 'high', timeframe: 'immediate' },
    { id: 'reroute', label: 'Traffic/freight rerouting needed', severity: 'medium', timeframe: 'immediate' },
    { id: 'delay_cascade', label: 'Delays cascade through network', severity: 'high', timeframe: 'weeks' },
  ],
  regulation: [
    { id: 'compliance_cost', label: 'Compliance costs increase', severity: 'medium', timeframe: 'months' },
    { id: 'ops_change', label: 'Operational processes must change', severity: 'medium', timeframe: 'weeks' },
    { id: 'penalty_risk', label: 'Risk of fines/penalties', severity: 'high', timeframe: 'immediate' },
  ],
  technology: [
    { id: 'competitive_advantage', label: 'Early adopters gain advantage', severity: 'medium', timeframe: 'months' },
    { id: 'cost_reduction', label: 'Potential for cost reduction', severity: 'medium', timeframe: 'months' },
    { id: 'workforce_shift', label: 'Workforce skills requirements change', severity: 'low', timeframe: 'months' },
  ],
  climate: [
    { id: 'route_disruption', label: 'Routes and facilities disrupted', severity: 'high', timeframe: 'immediate' },
    { id: 'capacity_loss', label: 'Temporary capacity loss', severity: 'high', timeframe: 'immediate' },
    { id: 'insurance_cost', label: 'Insurance and recovery costs', severity: 'medium', timeframe: 'weeks' },
  ],
  financial: [
    { id: 'market_consolidation', label: 'Market consolidation / fewer options', severity: 'medium', timeframe: 'months' },
    { id: 'credit_risk', label: 'Counterparty/credit risk', severity: 'medium', timeframe: 'weeks' },
    { id: 'opportunity', label: 'Acquisition or partnership opportunity', severity: 'low', timeframe: 'months' },
  ],
  other: [
    { id: 'unknown', label: 'Impact unclear — monitor', severity: 'low', timeframe: 'weeks' },
  ],
};

export function getEffects(eventType: EventType): Effect[] {
  return CAUSAL_RULES[eventType] || CAUSAL_RULES.other;
}

// ── Technology Mapping (effect → technologies that address it) ────────────────

const EFFECT_TECHNOLOGIES: Record<string, string[]> = {
  cost_increase:        ['freight audit', 'rate benchmarking', 'TMS', 'load optimization'],
  supplier_shift:       ['supplier management', 'sourcing platform', 'supply chain visibility'],
  route_change:         ['route optimization', 'TMS', 'multi-modal planning'],
  inventory_rush:       ['demand forecasting', 'WMS', 'inventory optimization'],
  route_disruption:     ['real-time tracking', 'route optimization', 'risk monitoring'],
  supply_risk:          ['supply chain visibility', 'dual sourcing', 'inventory buffer'],
  cost_spike:           ['freight audit', 'spot market tools', 'contract management'],
  alt_sourcing:         ['supplier discovery', 'sourcing platform', 'nearshore matching'],
  policy_change:        ['compliance management', 'regulatory tracking'],
  uncertainty:          ['scenario planning', 'risk analytics'],
  budget_impact:        ['contract management', 'government procurement tools'],
  capacity_pressure:    ['warehouse automation', 'capacity planning', 'overflow logistics'],
  price_change:         ['rate benchmarking', 'contract negotiation', 'spot market tools'],
  inventory_mismatch:   ['demand forecasting', 'inventory optimization', 'WMS'],
  ops_slowdown:         ['workforce scheduling', 'automation', 'temp staffing platform'],
  service_degradation:  ['quality monitoring', 'SLA tracking', 'customer communication'],
  bottleneck:           ['yard management', 'dock scheduling', 'capacity planning'],
  reroute:              ['route optimization', 'real-time tracking', 'TMS'],
  delay_cascade:        ['supply chain visibility', 'exception management', 'ETA prediction'],
  compliance_cost:      ['compliance management', 'ELD', 'document automation'],
  ops_change:           ['process automation', 'training platform', 'change management'],
  penalty_risk:         ['compliance monitoring', 'audit tools', 'safety management'],
  competitive_advantage:['AI/ML platform', 'automation', 'digital twin'],
  cost_reduction:       ['process automation', 'optimization platform', 'analytics'],
  workforce_shift:      ['training platform', 'skills assessment', 'workforce planning'],
  capacity_loss:        ['contingency planning', 'overflow logistics', 'backup facilities'],
  insurance_cost:       ['risk assessment', 'insurance broker', 'business continuity'],
  market_consolidation: ['market intelligence', 'vendor diversification'],
  credit_risk:          ['credit monitoring', 'payment protection', 'financial analytics'],
  opportunity:          ['M&A advisory', 'market intelligence', 'partnership platform'],
  unknown:              ['monitoring dashboard', 'alert system'],
};

export function getTechnologies(effects: Effect[]): string[] {
  const techs = new Set<string>();
  for (const effect of effects) {
    const t = EFFECT_TECHNOLOGIES[effect.id] || [];
    for (const tech of t) techs.add(tech);
  }
  return [...techs];
}

// ── Graph Node/Edge Types ────────────────────────────────────────────────────

export type GraphNode = {
  id: string;
  type: 'signal' | 'event' | 'effect' | 'technology' | 'vendor';
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

// ── Build Causal Graph from a signal ─────────────────────────────────────────

export function buildCausalGraph(
  signalId: string,
  signalTitle: string,
  signalEvidence: string,
  matchedVendors: { id: string; name: string }[],
): CausalGraph {
  const text = `${signalTitle} ${signalEvidence}`;
  const classification = classifyEvent(text);
  const effects = getEffects(classification.type);
  const technologies = getTechnologies(effects);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Signal node
  const signalNodeId = `signal_${signalId}`;
  nodes.push({
    id: signalNodeId,
    type: 'signal',
    label: signalTitle.slice(0, 80),
    data: { classification },
  });

  // Event node
  const eventNodeId = `event_${classification.type}`;
  nodes.push({
    id: eventNodeId,
    type: 'event',
    label: classification.type.replace(/_/g, ' '),
    data: { confidence: classification.confidence, keywords: classification.matched_keywords },
  });
  edges.push({
    source: signalNodeId,
    target: eventNodeId,
    type: 'causes',
    weight: classification.confidence,
  });

  // Effect nodes
  for (const effect of effects) {
    const effectNodeId = `effect_${effect.id}`;
    if (!nodes.some(n => n.id === effectNodeId)) {
      nodes.push({
        id: effectNodeId,
        type: 'effect',
        label: effect.label,
        data: { severity: effect.severity, timeframe: effect.timeframe },
      });
    }
    edges.push({
      source: eventNodeId,
      target: effectNodeId,
      type: 'leads_to',
      weight: effect.severity === 'high' ? 0.9 : effect.severity === 'medium' ? 0.6 : 0.3,
    });

    // Technology nodes for this effect
    const effectTechs = EFFECT_TECHNOLOGIES[effect.id] || [];
    for (const tech of effectTechs) {
      const techNodeId = `tech_${tech.replace(/\s+/g, '_').toLowerCase()}`;
      if (!nodes.some(n => n.id === techNodeId)) {
        nodes.push({
          id: techNodeId,
          type: 'technology',
          label: tech,
        });
      }
      if (!edges.some(e => e.source === effectNodeId && e.target === techNodeId)) {
        edges.push({
          source: effectNodeId,
          target: techNodeId,
          type: 'solved_by',
          weight: 0.7,
        });
      }
    }
  }

  // Vendor nodes
  for (const vendor of matchedVendors) {
    const vendorNodeId = `vendor_${vendor.id}`;
    nodes.push({
      id: vendorNodeId,
      type: 'vendor',
      label: vendor.name,
    });

    // Connect vendors to technologies (rough match)
    for (const tech of technologies) {
      const techNodeId = `tech_${tech.replace(/\s+/g, '_').toLowerCase()}`;
      if (nodes.some(n => n.id === techNodeId)) {
        edges.push({
          source: techNodeId,
          target: vendorNodeId,
          type: 'provided_by',
          weight: 0.5,
        });
      }
    }
  }

  return { nodes, edges };
}

// ── Full causal analysis for a signal ────────────────────────────────────────

export type CausalAnalysis = {
  event_type: EventType;
  event_confidence: number;
  matched_keywords: string[];
  effects: Effect[];
  technologies: string[];
  urgency: 'act_now' | 'watch' | 'opportunity';
  graph: CausalGraph;
};

export function analyzeCausality(
  signalId: string,
  signalTitle: string,
  signalEvidence: string,
  importance: number,
  discoveredAt: string,
  matchedVendors: { id: string; name: string }[],
): CausalAnalysis {
  const text = `${signalTitle} ${signalEvidence}`;
  const classification = classifyEvent(text);
  const effects = getEffects(classification.type);
  const technologies = getTechnologies(effects);
  const graph = buildCausalGraph(signalId, signalTitle, signalEvidence, matchedVendors);

  // Deterministic urgency from effects
  const hasHighSeverity = effects.some(e => e.severity === 'high');
  const hasImmediate = effects.some(e => e.timeframe === 'immediate');
  const hoursSince = (Date.now() - new Date(discoveredAt).getTime()) / 3600000;

  let urgency: 'act_now' | 'watch' | 'opportunity';
  if ((hasHighSeverity && hasImmediate) || (importance >= 80 && hoursSince < 48)) {
    urgency = 'act_now';
  } else if (hasHighSeverity || importance >= 60) {
    urgency = 'watch';
  } else {
    urgency = 'opportunity';
  }

  return {
    event_type: classification.type,
    event_confidence: classification.confidence,
    matched_keywords: classification.matched_keywords,
    effects,
    technologies,
    urgency,
    graph,
  };
}
