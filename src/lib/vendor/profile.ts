// THE one place a vendor_profiles row is found-or-created. Every account
// lane goes through here so the review gate can't fork (process doc §4:
// "One signup system. Invited and organic are two LANES of the same flow;
// the lanes differ only in the review gate."):
//
//   lane 'invite'         — /join/<token> via /auth/callback. Born APPROVED —
//                           intentional (MASTER-PLAN decision #5, "the invite
//                           IS the review": only operators behind the admin
//                           access code can create invites).
//   lane 'admin_approval' — /admin/vendor-applications Approve. The human
//                           review decision — may flip an existing profile to
//                           approved or mint one approved.
//   lane 'organic'        — /api/vendors/signup (self-served registration).
//                           Born PENDING; must pass admin review. NEVER weaken.
//   lane 'portal'         — first authenticated touch of /vendor/portal APIs.
//                           Born PENDING (blank placeholder); review still
//                           happens via the application queue.
//
// Match order (one implementation of the dedup that was previously copied in
// four places): (1) caller's own row by auth_id → (2) link by email — admin
// approval may claim any profile with that email (that's the review ruling);
// every other lane may only claim an UNOWNED row (auth_id null), never another
// account's profile → (3) fresh insert with the lane's review status.

import type { SupabaseClient } from '@supabase/supabase-js';

export type VendorProfileLane = 'invite' | 'admin_approval' | 'organic' | 'portal';

const DEFAULT_SELECT = 'id, status, auth_id, email';
const APPROVED_LANES: VendorProfileLane[] = ['invite', 'admin_approval'];

export interface EnsureVendorProfileInput {
  lane: VendorProfileLane;
  authId?: string | null;
  email?: string | null;
  /** Columns for a FRESH insert (company_name, contact_name, source, …).
   *  status / moderation_status are decided by the lane — never by callers. */
  profile?: Record<string, unknown>;
  /** Columns to return (callers with richer needs pass their own list). */
  select?: string;
}

export type EnsureVendorProfileResult =
  | { ok: true; id: string; status: string; created: boolean; wasAlreadyApproved: boolean; row: Record<string, unknown> }
  | { ok: false; error: string };

function escLike(v: string): string {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function ensureVendorProfile(
  db: SupabaseClient,
  input: EnsureVendorProfileInput,
): Promise<EnsureVendorProfileResult> {
  const select = input.select || DEFAULT_SELECT;
  const authId = input.authId || null;
  const email = (input.email || '').trim();
  const approvedLane = APPROVED_LANES.includes(input.lane);

  let row: Record<string, unknown> | null = null;

  // 1) The caller's own profile, by auth id.
  if (authId) {
    const { data } = await db.from('vendor_profiles').select(select).eq('auth_id', authId).maybeSingle();
    if (data) row = data as unknown as Record<string, unknown>;
  }

  // 2) Link by email (case-insensitive, LIKE-escaped).
  if (!row && email) {
    let q = db.from('vendor_profiles').select(select).ilike('email', escLike(email));
    if (input.lane !== 'admin_approval') q = q.is('auth_id', null);
    const { data } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) row = data as unknown as Record<string, unknown>;
  }

  if (row) {
    const wasAlreadyApproved = row.status === 'approved';
    const patch: Record<string, unknown> = {};
    if (approvedLane) { patch.status = 'approved'; patch.moderation_status = 'active'; }
    if (authId && row.auth_id !== authId) patch.auth_id = authId;
    if (Object.keys(patch).length) {
      const { data: upd, error } = await db.from('vendor_profiles').update(patch).eq('id', row.id as string).select(select).maybeSingle();
      if (error) return { ok: false, error: error.message };
      if (upd) row = upd as unknown as Record<string, unknown>;
    }
    return { ok: true, id: row.id as string, status: String(row.status || ''), created: false, wasAlreadyApproved, row };
  }

  // 3) Fresh insert — the lane decides the review gate, never the caller.
  const insert: Record<string, unknown> = {
    ...(input.profile || {}),
    auth_id: authId,
    status: approvedLane ? 'approved' : 'pending',
  };
  if (approvedLane) insert.moderation_status = 'active';
  if (email && !insert.email) insert.email = email.toLowerCase();

  const { data: ins, error } = await db.from('vendor_profiles').insert(insert).select(select).single();
  if (error || !ins) return { ok: false, error: error?.message || 'Could not create the vendor profile' };
  const created = ins as unknown as Record<string, unknown>;
  return { ok: true, id: created.id as string, status: String(created.status || ''), created: true, wasAlreadyApproved: false, row: created };
}
