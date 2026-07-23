// Self-service account deletion — the ORDERED, server-side orchestration.
// Buyers and vendors can delete their OWN account. Called only from
// POST /api/account/delete, which resolves the caller from the session (never a
// client-supplied id) and enforces the confirmation + admin-block + password
// gates. The pure decision rules and anonymization field maps live in
// ./deletion-rules.ts (client-safe, unit-tested).
//
// NON-NEGOTIABLE DATA POLICY:
//  - FINANCIAL records are RETAINED with amounts/dates/statuses/ids intact;
//    only the personal identifiers ON them are anonymized. The fee engine
//    (src/lib/fees/*) is never touched.
//  - vendor_profiles is ANONYMIZED, NOT deleted: its id is the `vendor_id`
//    foreign key that commissions / purchases / vendor_moderation_log point at
//    with ON DELETE CASCADE. Deleting the row would cascade-destroy the fee
//    ledger and the moderation audit trail. Anonymizing keeps the id (and the
//    money reconciliation invariants) intact while stripping every PII column
//    and hiding the storefront (moderation_status='banned').
//  - Message / quote threads are kept for the counterparty; the deleted user's
//    identity ON those rows is anonymized. Message bodies are never nulled.
//  - terms_acceptances, moderation logs, and audit trails are RETAINED as-is.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buyerThreadAnonymization,
  deletedEmail,
  manualDealVendorAnonymization,
  vendorInviteAnonymization,
  vendorProfileAnonymization,
  DELETED_DISPLAY,
} from './deletion-rules';

export interface DeletionInput {
  uid: string;
  email: string | null;
}

export interface DeletionResult {
  ok: true;
  vendorProfilesAnonymized: number;
}

interface StoragePlan {
  [bucket: string]: string[];
}

const LISTING_MEDIA = 'listing-media';
const LISTING_DOCS = 'listing-docs';
const VENDOR_LOGOS = 'vendor-logos';
const VENDOR_BROCHURES = 'vendor-brochures';
const VENDOR_PRODUCT_IMAGES = 'vendor-product-images';

function pushPaths(plan: StoragePlan, bucket: string, paths: unknown) {
  if (!Array.isArray(paths)) {
    if (typeof paths === 'string' && paths) (plan[bucket] ||= []).push(paths);
    return;
  }
  for (const p of paths) if (typeof p === 'string' && p) (plan[bucket] ||= []).push(p);
}

/**
 * Delete the caller's own account. Runs entirely with the service-role client.
 *
 * ORDER + FAILURE BEHAVIOR (the safety property):
 *   1. Resolve the vendor profile(s) and collect storage paths (read-only).
 *   2. Anonymize / delete all APP DATA (throws on any error → the route
 *      returns 500 and the auth user is left intact; every step is idempotent
 *      so the user can simply retry).
 *   3. Best-effort remove storage objects (never fatal).
 *   4. DELETE THE AUTH USER LAST (auth.admin.deleteUser).
 *
 * A mid-way failure therefore NEVER leaves the dangerous state of "auth user
 * gone but live PII-bearing app data orphaned". The only possible partial state
 * is "app data wiped/anonymized but auth user still live" — a harmless,
 * recoverable, non-exploitable empty account the user can retry deleting.
 */
export async function runAccountDeletion(db: SupabaseClient, input: DeletionInput): Promise<DeletionResult> {
  const { uid } = input;
  const email = (input.email || '').trim().toLowerCase();
  const nowIso = new Date().toISOString();

  // Fail if any DB write errors — we must not proceed to deleting the auth user.
  async function must<T extends { error: unknown }>(label: string, p: PromiseLike<T>): Promise<T> {
    const res = await p;
    if (res.error) throw new Error(`account-delete step failed: ${label}`);
    return res;
  }

  // --- 1. Resolve vendor profile(s) owned by this auth user ------------------
  const { data: vendorRows } = await db
    .from('vendor_profiles')
    .select('id, logo_path, banner_path')
    .eq('auth_id', uid);
  const vendorIds: string[] = (vendorRows || []).map((r) => r.id as string);

  // --- 1b. Collect storage paths BEFORE the rows are changed/removed ---------
  const storage: StoragePlan = {};
  for (const r of vendorRows || []) {
    pushPaths(storage, VENDOR_LOGOS, r.logo_path);
    pushPaths(storage, VENDOR_LOGOS, r.banner_path);
  }
  if (email) {
    const { data: bp } = await db.from('buyer_profiles').select('logo_path').eq('buyer_email', email);
    for (const r of bp || []) pushPaths(storage, VENDOR_LOGOS, r.logo_path);
  }
  for (const vid of vendorIds) {
    const [prod, svc, docs, gal, certs, broch] = await Promise.all([
      db.from('marketplace_products').select('image_paths').eq('vendor_id', vid),
      db.from('marketplace_services').select('image_paths').eq('vendor_id', vid),
      db.from('listing_documents').select('storage_path').eq('vendor_id', vid),
      db.from('vendor_gallery').select('image_path').eq('vendor_id', vid),
      db.from('vendor_certifications').select('image_path').eq('vendor_id', vid),
      db.from('vendor_brochures').select('storage_path').eq('vendor_id', vid),
    ]);
    for (const r of prod.data || []) pushPaths(storage, LISTING_MEDIA, r.image_paths);
    for (const r of svc.data || []) pushPaths(storage, LISTING_MEDIA, r.image_paths);
    for (const r of docs.data || []) pushPaths(storage, LISTING_DOCS, r.storage_path);
    for (const r of gal.data || []) pushPaths(storage, VENDOR_LOGOS, r.image_path);
    for (const r of certs.data || []) pushPaths(storage, VENDOR_LOGOS, r.image_path);
    for (const r of broch.data || []) pushPaths(storage, VENDOR_BROCHURES, r.storage_path);
  }
  // Vendor-application media (the row itself is deleted below). Matched by
  // auth_id and by email — two reads so a same-email organic application with a
  // different auth_id is still covered.
  const appReads = [db.from('vendor_applications').select('logo_path, product_image_paths').eq('auth_id', uid)];
  if (email) appReads.push(db.from('vendor_applications').select('logo_path, product_image_paths').eq('email', email));
  for (const read of appReads) {
    const { data: apps } = await read;
    for (const r of apps || []) {
      pushPaths(storage, VENDOR_LOGOS, r.logo_path);
      pushPaths(storage, VENDOR_PRODUCT_IMAGES, r.product_image_paths);
    }
  }

  // --- 2. APP DATA mutations (fatal on error) --------------------------------

  // 2a. Vendor profile first: hide the storefront + strip PII up front, so any
  //     later failure still leaves the profile de-identified and unlisted.
  for (const vid of vendorIds) {
    await must('anonymize vendor_profiles', db
      .from('vendor_profiles')
      .update(vendorProfileAnonymization(uid, nowIso))
      .eq('id', vid));
  }

  // 2b. Vendor content + media rows: unpublish + delete.
  for (const vid of vendorIds) {
    await must('delete marketplace_products', db.from('marketplace_products').delete().eq('vendor_id', vid));
    await must('delete marketplace_services', db.from('marketplace_services').delete().eq('vendor_id', vid));
    await must('delete listing_documents', db.from('listing_documents').delete().eq('vendor_id', vid));
    await must('delete case_studies', db.from('case_studies').delete().eq('vendor_id', vid));
    await must('delete vendor_case_studies', db.from('vendor_case_studies').delete().eq('vendor_id', vid));
    await must('delete vendor_certifications', db.from('vendor_certifications').delete().eq('vendor_id', vid));
    await must('delete vendor_gallery', db.from('vendor_gallery').delete().eq('vendor_id', vid));
    await must('delete vendor_videos', db.from('vendor_videos').delete().eq('vendor_id', vid));
    await must('delete vendor_brochures', db.from('vendor_brochures').delete().eq('vendor_id', vid));
    await must('delete vendor_team', db.from('vendor_team').delete().eq('vendor_id', vid));
    await must('delete notifications (vendor)', db.from('notifications').delete().eq('vendor_id', vid));
    // FINANCIAL — retained, identity scrubbed.
    await must('anonymize manual_deals', db.from('manual_deals').update(manualDealVendorAnonymization()).eq('vendor_id', vid));
    // Funnel record — retained, identity scrubbed.
    await must('anonymize vendor_invites (vendor_id)', db.from('vendor_invites').update(vendorInviteAnonymization()).eq('vendor_id', vid));
  }
  await must('anonymize vendor_invites (auth_id)', db.from('vendor_invites').update(vendorInviteAnonymization()).eq('auth_id', uid));

  // 2c. Buyer-side rows (matched by email).
  if (email) {
    await must('delete cart_items', db.from('cart_items').delete().eq('buyer_email', email));
    await must('delete saved_listings', db.from('saved_listings').delete().eq('buyer_email', email));
    await must('delete notifications (buyer)', db.from('notifications').delete().eq('buyer_email', email));
    await must('anonymize quote_requests', db.from('quote_requests').update(buyerThreadAnonymization(uid)).eq('email', email));
    await must('anonymize reviews', db.from('reviews').update({ buyer_email: deletedEmail(uid) }).eq('buyer_email', email));
    await must('anonymize listing_reports', db.from('listing_reports').update({ reporter_email: deletedEmail(uid) }).eq('reporter_email', email));
    await must('anonymize vendor_invites (email)', db.from('vendor_invites').update(vendorInviteAnonymization()).eq('email', email));
    await must('delete project_members (email)', db.from('project_members').delete().eq('invited_email', email));
    await must('delete buyer_profiles', db.from('buyer_profiles').delete().eq('buyer_email', email));
    await must('delete vendor_applications (email)', db.from('vendor_applications').delete().eq('email', email));
  }

  // 2d. Projects owned by this user (workspace kept; owner identity scrubbed).
  await must('anonymize projects', db
    .from('projects')
    .update({ company_name: DELETED_DISPLAY, company_logo_url: null, problem: null, desired_outcome: null })
    .eq('owner_auth_id', uid));
  await must('delete project_members (auth)', db.from('project_members').delete().eq('auth_id', uid));

  // 2e. Vendor application by auth_id + the account identity row.
  await must('delete vendor_applications (auth)', db.from('vendor_applications').delete().eq('auth_id', uid));
  // platform_users is a pure identity/profile row; vendor_profiles was already
  // detached (platform_user_id nulled) above, so this delete is unblocked.
  await must('delete platform_users', db.from('platform_users').delete().eq('auth_id', uid));

  // --- 3. Best-effort storage cleanup (NEVER fatal) --------------------------
  for (const [bucket, paths] of Object.entries(storage)) {
    const unique = Array.from(new Set(paths));
    for (let i = 0; i < unique.length; i += 100) {
      try {
        await db.storage.from(bucket).remove(unique.slice(i, i + 100));
      } catch {
        /* leave the object; the DB rows that referenced it are gone, so it is
           no longer reachable through the app. Flagged as a cleanup follow-up. */
      }
    }
  }

  // --- 4. DELETE THE AUTH USER LAST (fatal) ----------------------------------
  const { error: authErr } = await db.auth.admin.deleteUser(uid);
  if (authErr) throw new Error('account-delete step failed: auth.admin.deleteUser');

  return { ok: true, vendorProfilesAnonymized: vendorIds.length };
}
