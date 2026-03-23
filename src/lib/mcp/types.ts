// ─── MCP Protocol Types — JSON-RPC 2.0 Compatible ────────────────────────────
// Follows the Model Context Protocol specification for tool-based interactions.
// No SDK dependency — pure types for our JSON-RPC implementation.

// ── JSON-RPC 2.0 ─────────────────────────────────────────────────────────────

export type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
};

export type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

// Standard JSON-RPC error codes
export const RPC_ERRORS = {
  PARSE_ERROR:      { code: -32700, message: 'Parse error' },
  INVALID_REQUEST:  { code: -32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS:   { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR:   { code: -32603, message: 'Internal error' },
} as const;

// ── MCP Tool Definition ──────────────────────────────────────────────────────

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, McpPropertySchema>;
    required?: string[];
  };
};

export type McpPropertySchema = {
  type: string;
  description?: string;
  enum?: string[];
  items?: McpPropertySchema;
  properties?: Record<string, McpPropertySchema>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  default?: unknown;
};

// ── MCP Tool Call ────────────────────────────────────────────────────────────

export type McpToolCallParams = {
  name: string;
  arguments: Record<string, unknown>;
};

// ── MCP Tool Result ──────────────────────────────────────────────────────────

export type McpToolResult = {
  content: McpContent[];
  isError?: boolean;
};

export type McpContent = {
  type: 'text';
  text: string;
};

// ── Tool-specific Input/Output Types ─────────────────────────────────────────

export type SearchVendorsInput = {
  query: string;
  filters?: {
    industry?: string;
    minScore?: number;
  };
};

export type VendorResult = {
  id: string;
  name: string;
  sector: string;
  iker_score: number;
  website?: string;
  description?: string;
};

export type GetVendorDossierInput = {
  vendor_id: string;
};

export type VendorDossier = {
  vendor: VendorResult;
  signals: SignalResult[];
  connections: { nodes: unknown[]; edges: unknown[] };
  iker_breakdown: {
    score: number;
    confidence: number;
    tier: string;
    factors: { factor: string; impact: number; confidence: number }[];
    missing: string[];
  };
};

export type ListSignalsInput = {
  severity?: string[];
  industry?: string;
  limit?: number;
};

export type SignalResult = {
  id: string;
  title: string;
  summary?: string;
  severity: string;
  industry?: string;
  detected_at?: string;
  source?: string;
};

export type GetSignalConnectionsInput = {
  signal_id: string;
  depth?: number;
};

export type SignalConnectionGraph = {
  root_signal_id: string;
  nodes: { id: string; label: string; properties: Record<string, unknown> }[];
  edges: { source: string; target: string; type: string; properties: Record<string, unknown> }[];
  depth: number;
};

export type SolveProblemInput = {
  problem: string;
  industry?: string;
};

export type SolveProblemResult = {
  problem: string;
  matched_industries: string[];
  recommended_solution: {
    technology: string;
    product: string;
    price: string;
    website: string;
    reason: string;
  } | null;
  vendors: VendorResult[];
  market_insight: {
    growth: string;
    competition: string;
    summary: string;
  };
  next_step: string;
};
