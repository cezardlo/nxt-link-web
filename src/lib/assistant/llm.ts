// Server-side AI helper for the NXT//LINK Assistant.
// Wraps the existing parallel LLM router with a graceful deterministic
// fallback, and writes an audit record for every draft (AI Audit Log).

import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export type AiMode = 'intake' | 'admin' | 'vendor_quote';

interface DraftArgs<T> {
  systemPrompt: string;
  userPrompt: string;
  parse: (content: string) => T;
  fallback: () => T;
  temperature?: number;
}

export interface DraftResult<T> {
  result: T;
  provider: string;
  is_draft: true;
}

/** Run an AI draft with graceful fallback. Never throws. */
export async function aiDraft<T>(args: DraftArgs<T>): Promise<DraftResult<T>> {
  try {
    const { result, selectedProvider } = await runParallelJsonEnsemble<T>({
      systemPrompt: args.systemPrompt,
      userPrompt: args.userPrompt,
      temperature: args.temperature ?? 0.4,
      preferredProviders: ['gemini'],
      budget: { maxProviders: 1 },
      parse: args.parse,
    });
    return { result, provider: selectedProvider, is_draft: true };
  } catch {
    return { result: args.fallback(), provider: 'fallback', is_draft: true };
  }
}

/** Best-effort write to the AI draft log. Never throws. */
export async function logAiDraft(entry: {
  ai_mode: AiMode;
  request_id?: string | null;
  vendor_id?: string | null;
  prompt_input?: string;
  draft_output: unknown;
  provider: string;
  visibility_used?: unknown;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const db = getSupabaseClient({ admin: true });
    await db.from('ai_draft_logs').insert({
      ai_mode: entry.ai_mode,
      request_id: entry.request_id ?? null,
      vendor_id: entry.vendor_id ?? null,
      prompt_input: entry.prompt_input?.slice(0, 4000) ?? null,
      draft_output: entry.draft_output,
      provider: entry.provider,
      approval_status: 'draft_generated',
      visibility_used: entry.visibility_used ?? null,
    });
  } catch {
    /* logging is best-effort */
  }
}

/** Best-effort write to the platform audit log. Never throws. */
export async function logAudit(entry: {
  action: string;
  role?: string;
  request_id?: string | null;
  vendor_id?: string | null;
  before_status?: string | null;
  after_status?: string | null;
  notes?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const db = getSupabaseClient({ admin: true });
    await db.from('platform_audit_log').insert({
      action: entry.action,
      role: entry.role ?? null,
      request_id: entry.request_id ?? null,
      vendor_id: entry.vendor_id ?? null,
      before_status: entry.before_status ?? null,
      after_status: entry.after_status ?? null,
      notes: entry.notes ?? null,
    });
  } catch {
    /* best-effort */
  }
}

export { isSupabaseConfigured };
