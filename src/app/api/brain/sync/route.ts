/**
 * POST /api/brain/sync — Sync knowledge/problems/*.md → causal_maps table
 *
 * Reads Obsidian-compatible markdown files from the knowledge folder,
 * parses frontmatter + sections, and upserts into Supabase.
 *
 * This is the bridge: Obsidian (design) → Database (execution)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// ── Category → event_type mapping ────────────────────────────────────────────

const CATEGORY_TO_EVENT: Record<string, string> = {
  logistics: 'infrastructure',
  trade: 'trade_policy',
  sourcing: 'financial',
  labor: 'labor',
  geopolitical: 'conflict',
  regulation: 'regulation',
  technology: 'technology',
  climate: 'climate',
  demand: 'demand_shift',
};

// ── Severity → keywords for signal matching ──────────────────────────────────

function extractKeywords(problem: string, causes: string[], effects: string[]): string[] {
  const keywords = new Set<string>();

  // From problem name
  const words = problem.toLowerCase().split(/[\s-]+/).filter(w => w.length > 3);
  for (const w of words) keywords.add(w);

  // From causes and effects — extract meaningful terms
  for (const line of [...causes, ...effects]) {
    const lower = line.toLowerCase();
    // Extract key phrases (2-3 word chunks that are meaningful)
    const chunks = lower
      .replace(/[()]/g, '')
      .split(/[,;]/)
      .map(c => c.trim())
      .filter(c => c.length > 4 && c.length < 50);
    for (const chunk of chunks) {
      keywords.add(chunk);
    }
  }

  return [...keywords].slice(0, 30);
}

// ── Parse markdown file ──────────────────────────────────────────────────────

type ParsedProblem = {
  id: string;
  problem: string;
  category: string;
  region: string;
  severity: string;
  causes: string[];
  effects: Array<{ label: string; severity: 'high' | 'medium' | 'low'; timeframe: 'immediate' | 'weeks' | 'months' }>;
  solutions: string[];
  technologies: string[];
  signals: string[];
  keywords: string[];
};

function parseMarkdown(content: string): ParsedProblem | null {
  // Parse frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fm: Record<string, string> = {};
  for (const line of fmMatch[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length > 0) {
      fm[key.trim()] = rest.join(':').trim();
    }
  }

  if (!fm.id || !fm.problem) return null;

  // Parse sections
  function parseSection(name: string): string[] {
    const regex = new RegExp(`## ${name}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const match = content.match(regex);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map(l => l.replace(/^- /, '').trim())
      .filter(l => l.length > 0);
  }

  const causes = parseSection('Causes');
  const rawEffects = parseSection('Effects');
  const solutions = parseSection('Solutions');
  const technologies = parseSection('Technologies');
  const signals = parseSection('Signals');

  // Convert effects to structured format with severity inference
  const effects = rawEffects.map(label => {
    const lower = label.toLowerCase();
    let severity: 'high' | 'medium' | 'low' = 'medium';
    let timeframe: 'immediate' | 'weeks' | 'months' = 'weeks';

    // Severity heuristics
    if (lower.includes('shutdown') || lower.includes('spike') || lower.includes('penalty') || lower.includes('loss')) {
      severity = 'high';
    }
    if (lower.includes('gradual') || lower.includes('long-term') || lower.includes('over time')) {
      severity = 'low';
    }

    // Timeframe heuristics
    if (lower.includes('immediate') || lower.includes('sudden') || lower.includes('cascade') || lower.includes('real time')) {
      timeframe = 'immediate';
    }
    if (lower.includes('long-term') || lower.includes('redesign') || lower.includes('strategy') || lower.includes('shift')) {
      timeframe = 'months';
    }

    return { label, severity, timeframe };
  });

  const keywords = extractKeywords(fm.problem, causes, rawEffects);

  return {
    id: fm.id,
    problem: fm.problem,
    category: fm.category || 'logistics',
    region: fm.region || 'Global',
    severity: fm.severity || 'medium',
    causes,
    effects,
    solutions,
    technologies,
    signals,
    keywords,
  };
}

// ── POST /api/brain/sync ─────────────────────────────────────────────────────

export async function POST() {
  const knowledgePath = path.join(process.cwd(), 'knowledge', 'problems');

  // Check if knowledge folder exists
  if (!fs.existsSync(knowledgePath)) {
    return NextResponse.json(
      { ok: false, error: 'knowledge/problems/ folder not found' },
      { status: 404 },
    );
  }

  const files = fs.readdirSync(knowledgePath).filter(f => f.endsWith('.md'));
  const results: { file: string; status: string; problem?: string }[] = [];
  const supabase = createClient();

  for (const file of files) {
    const content = fs.readFileSync(path.join(knowledgePath, file), 'utf-8');
    const parsed = parseMarkdown(content);

    if (!parsed) {
      results.push({ file, status: 'skipped — invalid format' });
      continue;
    }

    const eventType = CATEGORY_TO_EVENT[parsed.category] || 'other';
    const regions = parsed.region.split(/[,/]/).map(r => r.trim().toLowerCase().replace(/\s+/g, '-'));
    const industries = ['logistics', 'manufacturing'];
    if (parsed.category === 'trade' || parsed.category === 'geopolitical') {
      industries.push('border-tech');
    }

    const { error } = await supabase
      .from('causal_maps')
      .upsert({
        problem: parsed.problem.toLowerCase(),
        description: `${parsed.problem} — ${parsed.category} problem affecting ${parsed.region}`,
        event_type: eventType,
        causes: parsed.causes,
        effects: parsed.effects,
        solutions: parsed.solutions,
        technologies: parsed.technologies,
        keywords: parsed.keywords,
        industries,
        regions,
        source: 'obsidian',
        confidence: parsed.severity === 'high' ? 1.0 : parsed.severity === 'medium' ? 0.8 : 0.6,
        active: true,
      }, {
        onConflict: 'problem',
      });

    if (error) {
      results.push({ file, status: `error: ${error.message}`, problem: parsed.problem });
    } else {
      results.push({ file, status: 'synced', problem: parsed.problem });
    }
  }

  const synced = results.filter(r => r.status === 'synced').length;
  const failed = results.filter(r => r.status.startsWith('error')).length;

  return NextResponse.json({
    ok: true,
    summary: {
      files_found: files.length,
      synced,
      failed,
      skipped: files.length - synced - failed,
    },
    results,
  });
}

// GET: Show sync status
export async function GET() {
  const knowledgePath = path.join(process.cwd(), 'knowledge', 'problems');
  const files = fs.existsSync(knowledgePath)
    ? fs.readdirSync(knowledgePath).filter(f => f.endsWith('.md'))
    : [];

  const supabase = createClient();
  const { data: maps } = await supabase
    .from('causal_maps')
    .select('problem, source, updated_at')
    .eq('active', true)
    .order('updated_at', { ascending: false });

  return NextResponse.json({
    ok: true,
    knowledge_files: files.length,
    db_maps: maps?.length || 0,
    files: files.map(f => f.replace('.md', '')),
    db_sources: maps?.map(m => ({ problem: m.problem, source: m.source, updated: m.updated_at })) || [],
  });
}
