/**
 * NARRATIVE ENGINE — The only place AI is used in the assembly layer
 *
 * Takes a pre-assembled cluster (with signals, trends, chain data)
 * and generates ONE briefing. One AI call per cluster, not per signal.
 *
 * AI budget: ~5-15 calls per assembly run (top clusters only)
 * Model: Gemini 1.5 Flash (cheapest, fastest)
 */

import type { AssembledCluster, DetectedTrend } from './assembly-engine';
import { createClient } from '@/lib/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────

export interface ClusterNarrative {
  cluster_id: string;
  what_is_happening: string;
  why_it_matters: string;
  what_happens_next: string;
  actions: string[];
  confidence: number;
  model_used: string;
  tokens_used: number;
}

// ─── Gemini call ────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<{ text: string; tokens: number }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('No Gemini API key');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 400,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const tokens = json.usageMetadata?.totalTokenCount || 0;
  return { text, tokens };
}

// ─── Build prompt from structured data ──────────────────────────────

function buildPrompt(cluster: AssembledCluster, trends: DetectedTrend[]): string {
  const signalList = cluster.signals
    .slice(0, 8) // Max 8 signals in prompt to save tokens
    .map(s => `- [${s.signal_type}] ${s.title} (${s.source || 'unknown'}, ${s.discovered_at.slice(0, 10)})${s.amount_usd ? ` — $${(s.amount_usd / 1e6).toFixed(1)}M` : ''}`)
    .join('\n');

  const relatedTrends = trends
    .filter(t =>
      (t.company && cluster.companies.some(c => c.toLowerCase() === t.company?.toLowerCase())) ||
      (t.industry && cluster.industries.some(i => i.toLowerCase() === t.industry?.toLowerCase()))
    )
    .slice(0, 3)
    .map(t => `- ${t.name} (${t.trend_type}, velocity: ${t.velocity}x)`)
    .join('\n');

  return `You are an intelligence analyst for NXT//LINK, a technology intelligence platform focused on El Paso, TX and the US-Mexico border region.

CLUSTER: "${cluster.title}"
SIGNALS (${cluster.signal_count} total):
${signalList}

COMPANIES: ${cluster.companies.join(', ') || 'None identified'}
INDUSTRIES: ${cluster.industries.join(', ') || 'General'}
TECHNOLOGIES: ${cluster.technologies.join(', ') || 'None identified'}
CAUSAL CHAIN: ${cluster.causal_chain.length > 0 ? cluster.causal_chain.join(' → ') : 'None detected'}
TOTAL FUNDING: ${cluster.total_amount > 0 ? `$${(cluster.total_amount / 1e6).toFixed(1)}M` : 'N/A'}
TIME SPAN: ${cluster.first_signal.slice(0, 10)} to ${cluster.last_signal.slice(0, 10)}
${relatedTrends ? `\nRELATED TRENDS:\n${relatedTrends}` : ''}

Respond in JSON with these exact fields:
{
  "what_is_happening": "2-3 sentences. What is actually going on? Connect the signals into one story.",
  "why_it_matters": "1-2 sentences. Why should someone in El Paso / border region care?",
  "what_happens_next": "1-2 sentences. Based on the causal chain and trends, what likely follows?",
  "actions": ["action 1", "action 2", "action 3"],
  "confidence": 50-90
}

Rules:
- Be specific. Reference companies, amounts, and locations by name.
- Actions must be concrete: "Monitor X", "Track Y postings", "Evaluate Z product".
- Do NOT be vague. Do NOT use filler phrases.
- Confidence: 80+ if chain has 3+ steps and financials, 60-79 if 2 steps, 50-59 if thematic only.`;
}

// ─── Algorithmic fallback (no AI) ───────────────────────────────────

function buildFallbackNarrative(cluster: AssembledCluster): Omit<ClusterNarrative, 'cluster_id'> {
  const company = cluster.companies[0] || 'Multiple entities';
  const industry = cluster.industries[0] || 'technology';
  const chain = cluster.causal_chain;

  let what = `${company} has generated ${cluster.signal_count} signals in ${industry}`;
  if (cluster.total_amount > 0) what += ` involving $${(cluster.total_amount / 1e6).toFixed(1)}M`;
  what += ` over ${daysBetween(cluster.first_signal, cluster.last_signal)} days.`;

  let why = `This concentration of activity in ${industry} suggests deliberate expansion.`;
  if (chain.length >= 2) why += ` The ${chain.join(' → ')} sequence is a classic growth pattern.`;

  let next = 'Monitor for follow-on activity in the next 30-60 days.';
  if (chain.includes('funding round')) next = 'Expect hiring announcements and product launches within 60-90 days.';
  if (chain.includes('contract award')) next = 'Watch for subcontractor opportunities and hiring in the next 30 days.';

  const actions = [
    `Track ${company} job postings and press releases`,
    `Monitor ${industry} contract opportunities on SAM.gov`,
    cluster.technologies.length > 0
      ? `Evaluate ${cluster.technologies[0]} solutions from competing vendors`
      : `Review vendor landscape in ${industry}`,
  ];

  return {
    what_is_happening: what,
    why_it_matters: why,
    what_happens_next: next,
    actions,
    confidence: Math.min(70, 40 + chain.length * 10),
    model_used: 'fallback',
    tokens_used: 0,
  };
}

// ─── Main: generate narratives for top clusters ─────────────────────

export async function generateNarratives(
  clusters: AssembledCluster[],
  trends: DetectedTrend[],
  maxAICalls: number = 10
): Promise<ClusterNarrative[]> {
  const narratives: ClusterNarrative[] = [];

  // Sort by strength, only narrate clusters with strength >= 30
  const worthy = clusters
    .filter(c => c.strength >= 30)
    .sort((a, b) => b.strength - a.strength);

  let aiCallsUsed = 0;

  for (const cluster of worthy) {
    const clusterId = cluster.id || cluster.title; // Use title as fallback ID

    // Use AI for top clusters, fallback for the rest
    if (aiCallsUsed < maxAICalls && cluster.strength >= 40) {
      try {
        const prompt = buildPrompt(cluster, trends);
        const { text, tokens } = await callGemini(prompt);
        const parsed = JSON.parse(text);

        narratives.push({
          cluster_id: clusterId,
          what_is_happening: parsed.what_is_happening || '',
          why_it_matters: parsed.why_it_matters || '',
          what_happens_next: parsed.what_happens_next || '',
          actions: parsed.actions || [],
          confidence: parsed.confidence || 60,
          model_used: 'gemini-1.5-flash',
          tokens_used: tokens,
        });

        aiCallsUsed++;

        // Small delay between AI calls
        if (aiCallsUsed < maxAICalls) {
          await new Promise(r => setTimeout(r, 300));
        }
      } catch {
        // AI failed — use fallback
        const fallback = buildFallbackNarrative(cluster);
        narratives.push({ cluster_id: clusterId, ...fallback });
      }
    } else {
      // Below AI threshold — use algorithmic fallback
      const fallback = buildFallbackNarrative(cluster);
      narratives.push({ cluster_id: clusterId, ...fallback });
    }
  }

  return narratives;
}

// ─── Persist narratives to DB ───────────────────────────────────────

export async function persistNarratives(narratives: ClusterNarrative[]): Promise<void> {
  const supabase = createClient();

  for (const n of narratives) {
    await supabase
      .from('cluster_narratives')
      .upsert({
        cluster_id: n.cluster_id,
        what_is_happening: n.what_is_happening,
        why_it_matters: n.why_it_matters,
        what_happens_next: n.what_happens_next,
        actions: n.actions,
        confidence: n.confidence,
        model_used: n.model_used,
        tokens_used: n.tokens_used,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'cluster_id' });
  }
}

// ─── Helper ─────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round(Math.abs(
    new Date(b).getTime() - new Date(a).getTime()
  ) / (24 * 60 * 60 * 1000)));
}
