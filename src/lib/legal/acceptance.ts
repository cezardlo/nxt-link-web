// Click-wrap acceptance recording — THE one helper every account-creation
// lane uses (organic /signup, /apply, /vendor-signup, invited /join).
// Process doc §4: "never a checkbox that saves nothing" — every accepted
// checkbox writes terms_acceptances rows (one per document) with the exact
// document version, language shown, IP, and user agent.
//
// Fail-closed contract: callers record the acceptance BEFORE creating the
// account/application/profile; if recording fails, the creation is rejected.
// user_id may be null at accept time (pre-account lanes) — /auth/callback
// links it (null → auth id) on the first confirmed sign-in.

import type { SupabaseClient } from '@supabase/supabase-js';

/** The documents every account lane accepts together (click-wrap map §1.2). */
export const LEGAL_DOC_SLUGS = ['tos', 'privacy'] as const;

/** Fallback when legal_documents has no seeded rows yet (migration pending).
 *  Matches the seed in supabase/migrations/20260720_legal_acceptances.sql and
 *  the "Last updated: July 9, 2026" line on /terms and /privacy. */
export const LEGAL_VERSION_FALLBACK = 'draft-2026-07-09';

export type LegalContext = 'signup' | 'apply' | 'invite_join' | 'vendor_signup';

/** Bilingual user-facing strings for the click-wrap gates. */
export const LEGAL_MSG = {
  required: {
    en: 'Please accept the Terms of Service and Privacy Policy to continue.',
    es: 'Para continuar, acepta los Términos de Servicio y el Aviso de Privacidad.',
  },
  recordFailed: {
    en: 'We could not record your acceptance of the terms. Please try again.',
    es: 'No pudimos registrar tu aceptación de los términos. Intenta de nuevo.',
  },
} as const;

/** "EN / ES" (or ES-first) in one string, for surfaces without a language toggle. */
export function bilingual(msg: { en: string; es: string }, first: 'en' | 'es' = 'en'): string {
  return first === 'es' ? `${msg.es} / ${msg.en}` : `${msg.en} / ${msg.es}`;
}

export interface RecordAcceptanceInput {
  authId?: string | null;
  email?: string | null;              // required when authId is unknown (pre-account)
  context: LegalContext;
  languageShown?: 'en' | 'es';
  relatedObjectType?: string | null;  // e.g. 'vendor_invite'
  relatedObjectId?: string | null;
  req?: Request;                      // source of IP + user agent
}

function clientIp(req?: Request): string | null {
  if (!req) return null;
  const fwd = req.headers.get('x-forwarded-for');
  const raw = (fwd ? fwd.split(',')[0] : req.headers.get('x-real-ip') || '').trim();
  if (!raw) return null;
  // Light shape check so a hostile header can't break the insert (inet column).
  return /^[0-9a-fA-F:.]{3,45}$/.test(raw) ? raw : null;
}

/**
 * Write one terms_acceptances row per accepted document (ToS + Privacy).
 * Returns { ok: false } when the rows could not be written — callers MUST
 * treat that as a hard stop (fail closed), not a warning.
 */
export async function recordLegalAcceptance(
  db: SupabaseClient,
  input: RecordAcceptanceInput,
): Promise<{ ok: boolean; message?: string }> {
  const email = (input.email || '').trim().toLowerCase() || null;
  const authId = input.authId || null;
  if (!email && !authId) return { ok: false, message: 'Missing acceptor identity' };

  // Resolve the current published version of each document (latest effective
  // row per slug). Falls back to the seeded version constant if the table has
  // no rows yet, so the evidence row still names the version that was live.
  const versions = new Map<string, { version: string; sha: string | null }>();
  try {
    const { data: docs } = await db
      .from('legal_documents')
      .select('slug, version, content_sha256, effective_date')
      .in('slug', [...LEGAL_DOC_SLUGS])
      .eq('language', 'en')
      .lte('effective_date', new Date().toISOString())
      .order('effective_date', { ascending: false });
    for (const d of docs || []) {
      const slug = d.slug as string;
      if (!versions.has(slug)) versions.set(slug, { version: d.version as string, sha: (d.content_sha256 as string) || null });
    }
  } catch { /* fall through to the version fallback */ }

  const ip = clientIp(input.req);
  const userAgent = (input.req?.headers.get('user-agent') || '').slice(0, 400) || null;

  const rows = LEGAL_DOC_SLUGS.map((slug) => ({
    user_id: authId,
    email,
    document_slug: slug,
    document_version: versions.get(slug)?.version || LEGAL_VERSION_FALLBACK,
    language_shown: input.languageShown === 'es' ? 'es' : 'en',
    content_sha256: versions.get(slug)?.sha || null,
    context: input.context,
    related_object_type: input.relatedObjectType || null,
    related_object_id: input.relatedObjectId || null,
    ip_address: ip,
    user_agent: userAgent,
  }));

  try {
    const { error } = await db.from('terms_acceptances').insert(rows);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not record acceptance' };
  }
}
