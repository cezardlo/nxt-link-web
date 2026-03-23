// src/lib/insights.ts
// Step 8: The Insight Layer - "So what?" + "Now what?"

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini (you're already using it for embeddings)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// =============================================================================
// TYPES
// =============================================================================

export interface Signal {
  id: string;
  title: string;
  content: string;
  severity: number; // 0-3 (P0 = most urgent)
  signal_type: string;
  entities: string[];
  detected_at: string;
  vendor_id?: string;
}

export interface Connection {
  type: 'ENTITY' | 'TEMPORAL' | 'THEMATIC' | 'CAUSAL' | 'GEOGRAPHIC' | 'CLUSTER';
  target_signal: Signal;
  confidence: number;
  properties?: Record<string, unknown>;
}

export interface VendorContext {
  name: string;
  industry: string;
  iker_score: number;
  location?: string;
}

export interface UserContext {
  industry?: string;
  role?: string;
  watchlist?: string[];
}

export interface Insight {
  signal_id: string;
  meaning: string;           // "So what?" - why this matters
  actions: string[];         // "Now what?" - what to do
  pattern: string | null;    // Detected trend name
  confidence: number;        // 0-100
  related_signals: string[]; // IDs that informed this insight
  generated_at: Date;
  model_used: string;
  tokens_used?: number;
}

export interface InsightContext {
  signal: Signal;
  connections: Connection[];
  vendor_context?: VendorContext;
  user_context?: UserContext;
}

// =============================================================================
// INSIGHT ROUTING - When to generate
// =============================================================================

export interface InsightDecision {
  shouldGenerate: boolean;
  reason: string;
  priority: 'immediate' | 'batch' | 'on-demand';
}

export function shouldGenerateInsight(
  signal: Signal,
  connections: Connection[],
  userTier: 'free' | 'paid' = 'free'
): InsightDecision {
  // P0: Always generate immediately - these are critical
  if (signal.severity === 0) {
    return {
      shouldGenerate: true,
      reason: 'P0 severity requires immediate insight',
      priority: 'immediate'
    };
  }

  // P1 with connections: Generate immediately - there's a story here
  if (signal.severity === 1 && connections.length >= 2) {
    return {
      shouldGenerate: true,
      reason: 'P1 with strong connections',
      priority: 'immediate'
    };
  }

  // Cluster detected: Generate - this is a pattern
  const clusterConnections = connections.filter(c => c.type === 'CLUSTER');
  if (clusterConnections.length >= 3) {
    return {
      shouldGenerate: true,
      reason: 'Cluster pattern detected',
      priority: 'batch'
    };
  }

  // Paid users: Generate for P1-P2 in batch
  if (userTier === 'paid' && signal.severity <= 2) {
    return {
      shouldGenerate: true,
      reason: 'Paid tier batch processing',
      priority: 'batch'
    };
  }

  // Causal connection: Always interesting
  const causalConnections = connections.filter(c => c.type === 'CAUSAL');
  if (causalConnections.length >= 1) {
    return {
      shouldGenerate: true,
      reason: 'Causal relationship detected',
      priority: 'batch'
    };
  }

  // Default: Generate on-demand only
  return {
    shouldGenerate: false,
    reason: 'Low priority - generate on user request',
    priority: 'on-demand'
  };
}

// =============================================================================
// INSIGHT GENERATION
// =============================================================================

export async function generateInsight(context: InsightContext): Promise<Insight> {
  const { signal, connections, vendor_context, user_context } = context;

  // Build connected signals summary
  const strongConnections = connections.filter(c => c.confidence > 0.6);
  const connectedSummary = strongConnections.length > 0
    ? strongConnections
        .slice(0, 5) // Limit to 5 most relevant
        .map(c => `- [${c.type}] "${c.target_signal.title}" (${formatDate(c.target_signal.detected_at)})`)
        .join('\n')
    : 'No strong connections detected';

  // Count connection types for pattern hints
  const connectionCounts = connections.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const prompt = buildInsightPrompt({
    signal,
    connectedSummary,
    connectionCounts,
    vendor_context,
    user_context
  });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // Lower = more consistent
        maxOutputTokens: 500,
        responseMimeType: 'application/json'
      }
    });

    const response = result.response;
    const text = response.text();
    
    // Parse JSON response
    const parsed = JSON.parse(text);

    return {
      signal_id: signal.id,
      meaning: parsed.meaning || 'Signal detected - analyzing implications',
      actions: parsed.actions || ['Monitor for developments'],
      pattern: parsed.pattern || null,
      confidence: Math.min(95, Math.max(50, parsed.confidence || 70)),
      related_signals: strongConnections.map(c => c.target_signal.id),
      generated_at: new Date(),
      model_used: 'gemini-1.5-flash',
      tokens_used: response.usageMetadata?.totalTokenCount
    };

  } catch (error) {
    console.error('Insight generation failed:', error);
    
    // Fallback insight - never return nothing
    return createFallbackInsight(signal, connections);
  }
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

interface PromptParams {
  signal: Signal;
  connectedSummary: string;
  connectionCounts: Record<string, number>;
  vendor_context?: VendorContext;
  user_context?: UserContext;
}

function buildInsightPrompt(params: PromptParams): string {
  const { signal, connectedSummary, connectionCounts, vendor_context, user_context } = params;

  return `You are an intelligence analyst for a technology discovery platform. Your job is to turn raw signals into actionable insights.

SIGNAL:
Title: ${signal.title}
Type: ${signal.signal_type}
Severity: P${signal.severity} ${getSeverityLabel(signal.severity)}
Entities: ${signal.entities?.join(', ') || 'None extracted'}
Content: ${signal.content?.slice(0, 500) || signal.title}

CONNECTED SIGNALS (${Object.values(connectionCounts).reduce((a, b) => a + b, 0)} total):
${connectedSummary}

Connection breakdown: ${Object.entries(connectionCounts).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}

${vendor_context ? `VENDOR CONTEXT:
Company: ${vendor_context.name}
Industry: ${vendor_context.industry}
IKER Score: ${vendor_context.iker_score}/100 ${getIKERLabel(vendor_context.iker_score)}
${vendor_context.location ? `Location: ${vendor_context.location}` : ''}` : ''}

${user_context?.industry ? `USER CONTEXT:
Industry: ${user_context.industry}
${user_context.role ? `Role: ${user_context.role}` : ''}
${user_context.watchlist?.length ? `Watching: ${user_context.watchlist.slice(0, 5).join(', ')}` : ''}` : ''}

Generate an insight with this JSON structure:
{
  "meaning": "One sentence explaining WHY this matters. Be specific - don't say 'this is significant', say WHY it's significant.",
  "actions": ["Specific action 1", "Specific action 2"],
  "pattern": "Pattern name if detected (e.g., 'Nearshoring wave', 'AI consolidation', 'Funding freeze') or null",
  "confidence": 75
}

RULES:
1. "meaning" must answer "So what?" - connect this signal to a bigger trend or implication
2. "actions" must be specific and actionable - not "consider implications" but "evaluate X for Y use case"
3. "pattern" should only be set if you can back it up with the connected signals
4. "confidence" should be 50-95 (never 100, never below 50)
5. Keep "meaning" under 30 words
6. Keep each "action" under 15 words
7. Generate exactly 2-3 actions

Respond with ONLY valid JSON, no markdown, no explanation.`;
}

// =============================================================================
// HELPERS
// =============================================================================

function getSeverityLabel(severity: number): string {
  const labels: Record<number, string> = {
    0: '(Critical - Act Now)',
    1: '(High Priority)',
    2: '(Monitor)',
    3: '(Informational)'
  };
  return labels[severity] || '';
}

function getIKERLabel(score: number): string {
  if (score >= 80) return '(Trusted)';
  if (score >= 60) return '(Reliable)';
  if (score >= 40) return '(Caution)';
  return '(Risk)';
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'recently';
  }
}

function createFallbackInsight(signal: Signal, connections: Connection[]): Insight {
  // Build a reasonable fallback without AI
  const entityList = signal.entities?.slice(0, 2).join(' and ') || 'this entity';
  const connectionCount = connections.length;

  let meaning = `${signal.signal_type} detected involving ${entityList}`;
  if (connectionCount > 0) {
    meaning += ` with ${connectionCount} related signal${connectionCount > 1 ? 's' : ''}`;
  }

  const actions = ['Monitor for follow-up developments'];
  if (connectionCount > 2) {
    actions.push('Review connected signals for emerging pattern');
  }
  if (signal.severity <= 1) {
    actions.unshift('Prioritize for review - high severity');
  }

  return {
    signal_id: signal.id,
    meaning,
    actions,
    pattern: null,
    confidence: 50,
    related_signals: connections.slice(0, 5).map(c => c.target_signal.id),
    generated_at: new Date(),
    model_used: 'fallback'
  };
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

export async function generateInsightsBatch(
  signals: Signal[],
  getConnections: (signalId: string) => Promise<Connection[]>,
  getVendorContext: (vendorId: string) => Promise<VendorContext | undefined>
): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Process in parallel batches of 5 to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < signals.length; i += batchSize) {
    const batch = signals.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (signal) => {
        const connections = await getConnections(signal.id);
        const vendor_context = signal.vendor_id 
          ? await getVendorContext(signal.vendor_id) 
          : undefined;

        const decision = shouldGenerateInsight(signal, connections);
        if (!decision.shouldGenerate) return null;

        return generateInsight({ signal, connections, vendor_context });
      })
    );

    insights.push(...batchResults.filter((i): i is Insight => i !== null));

    // Small delay between batches to be nice to the API
    if (i + batchSize < signals.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return insights;
}
