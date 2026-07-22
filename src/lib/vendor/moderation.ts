// Vendor moderation — the active/suspended/banned axis, kept separate from the
// approval lifecycle (`status`). A vendor can be approved AND suspended.
//   active     → normal: profile visible, can log in, deals can be logged
//   suspended  → temporary time-out; profile hidden, no new deals. Optional
//                suspended_until auto-returns them to active once it passes.
//   banned     → permanent; same as suspended and cannot reapply by email.

import type { SupabaseClient } from '@supabase/supabase-js';

export type ModerationStatus = 'active' | 'suspended' | 'banned';

export interface ModerationFields {
  moderation_status?: string | null;
  suspended_until?: string | null;
}

/** True once a timed suspension's clock has run out. */
export function suspensionExpired(row: ModerationFields, now = Date.now()): boolean {
  if (row.moderation_status !== 'suspended' || !row.suspended_until) return false;
  const t = new Date(row.suspended_until).getTime();
  return Number.isFinite(t) && t <= now;
}

/** The status that actually applies right now — an expired suspension reads as active. */
export function effectiveModeration(row: ModerationFields, now = Date.now()): ModerationStatus {
  const s = (row.moderation_status || 'active') as ModerationStatus;
  if (s === 'suspended' && suspensionExpired(row, now)) return 'active';
  return s === 'suspended' || s === 'banned' ? s : 'active';
}

/** Suspended or banned → hidden from buyers and blocked from new deals. */
export function isRestricted(row: ModerationFields, now = Date.now()): boolean {
  return effectiveModeration(row, now) !== 'active';
}

/**
 * Cesar's F1 rule (2026-07-22): a vendor may receive or work a qualified lead
 * — whether dispatched to them or picked up by responding to an open request
 * — only once the business is both approved (not pending review) AND not
 * restricted (not suspended/banned). One gate, reused everywhere a vendor is
 * about to be handed or hand themselves a lead.
 */
export function canReceiveLeads(row: ModerationFields & { status?: string | null }, now = Date.now()): boolean {
  return row.status === 'approved' && !isRestricted(row, now);
}

/**
 * If a timed suspension has expired, flip the row back to active (best-effort)
 * and log it. Returns the effective status either way. Safe to call on read.
 */
export async function autoReactivateIfExpired(
  db: SupabaseClient, vendorId: string, row: ModerationFields,
): Promise<ModerationStatus> {
  if (!suspensionExpired(row)) return effectiveModeration(row);
  try {
    await db.from('vendor_profiles')
      .update({ moderation_status: 'active', suspended_until: null, moderated_at: new Date().toISOString() })
      .eq('id', vendorId).eq('moderation_status', 'suspended');
    await db.from('vendor_moderation_log').insert({
      vendor_id: vendorId, action: 'auto_reactivate', from_status: 'suspended', to_status: 'active',
      reason: 'Suspension period ended', admin_email: 'system',
    });
  } catch { /* best-effort; treat as active regardless */ }
  return 'active';
}

/** Has this email been permanently banned? Blocks re-application. */
export async function isEmailBanned(db: SupabaseClient, email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const esc = email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data } = await db.from('vendor_profiles')
    .select('id').ilike('email', esc).eq('moderation_status', 'banned').limit(1).maybeSingle();
  return Boolean(data);
}

export const MODERATION_LABEL: Record<ModerationStatus, string> = {
  active: 'Active', suspended: 'Suspended', banned: 'Banned',
};
