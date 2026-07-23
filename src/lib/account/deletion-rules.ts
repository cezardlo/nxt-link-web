// Self-service account deletion — the PURE decision rules and anonymization
// field maps. No Supabase / server imports live here, so this module is safe to
// import from client components (the account page) and is the unit-test target
// (tests/account-deletion.test.ts). The async orchestration that actually
// touches the database lives in ./deletion.ts.
//
// See ./deletion.ts for the full data policy. In short: financial/legal/audit
// rows are RETAINED (identity anonymized), personal rows are DELETED, and
// vendor_profiles is ANONYMIZED (never deleted) because its id is the
// ON DELETE CASCADE anchor for the fee ledger + moderation audit trail.

import { isAdminEmail } from '@/lib/auth/admin-allowlist';

// ---------------------------------------------------------------------------
// Confirmation phrase
// ---------------------------------------------------------------------------

/** The exact words the user must type to confirm (EN / ES). Case-insensitive,
 *  whitespace-trimmed. A friction gate against accidental clicks, not a secret —
 *  the real authorization is the session + password re-entry. */
export const CONFIRM_PHRASES = ['DELETE', 'ELIMINAR'] as const;

export function isConfirmationValid(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  const v = input.trim().toUpperCase();
  return (CONFIRM_PHRASES as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Admin self-delete block
// ---------------------------------------------------------------------------

/** Roles that must NEVER self-delete through this endpoint. An admin (esp. the
 *  owner) nuking their own account would be a disaster; they are told to contact
 *  support / handle it manually. */
export const BLOCKED_SELF_DELETE_ROLES = ['admin', 'super_admin'] as const;

/** True when this account is an admin (by DB role OR by the ADMIN_EMAILS env
 *  allowlist) and therefore blocked from self-deletion. Pure: the caller passes
 *  the trusted, session-verified role/email and the raw env value. */
export function isSelfDeleteBlocked(params: {
  role: string | null | undefined;
  email: string | null | undefined;
  adminEmailsRaw: string | null | undefined;
}): boolean {
  const role = (params.role || '').trim().toLowerCase();
  if ((BLOCKED_SELF_DELETE_ROLES as readonly string[]).includes(role)) return true;
  if (isAdminEmail(params.email, params.adminEmailsRaw)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Anonymization field maps (pure — what each retained row's identity becomes)
// ---------------------------------------------------------------------------

export const DELETED_DISPLAY = 'Deleted user';
export const DELETED_VENDOR_DISPLAY = 'Deleted vendor';
export const DELETED_FINANCIAL = 'deleted-user';

/** A unique, non-routable placeholder email so anonymized rows can never
 *  collide on a UNIQUE(email) constraint and can never receive real mail. */
export function deletedEmail(uid: string): string {
  return `deleted-${uid}@deleted.invalid`;
}

/** Buyer identity on a retained quote/RFQ thread (quote_requests). Keeps the
 *  message/answers/amount/status columns; only the contact identity is scrubbed. */
export function buyerThreadAnonymization(uid: string) {
  return {
    company: DELETED_DISPLAY,
    contact_name: DELETED_DISPLAY,
    email: deletedEmail(uid),
    phone: null as string | null,
  };
}

/** The scrub applied to the vendor's own vendor_profiles row (retained as the
 *  financial-anchor id, hidden from the marketplace, stripped of all PII). */
export function vendorProfileAnonymization(uid: string, nowIso: string) {
  return {
    company_name: DELETED_VENDOR_DISPLAY,
    contact_name: null,
    email: deletedEmail(uid),
    phone: null,
    website: null,
    city: null,
    description: null,
    tagline: null,
    achievements: null,
    logo_path: null,
    banner_path: null,
    zoho_contact_id: null,
    zoho_account_id: null,
    signer_name: null,
    signer_email: null,
    signer_phone: null,
    creator_position: null,
    creator_department: null,
    // Hide the storefront and detach from the (about-to-be-deleted) auth user.
    status: 'rejected',
    moderation_status: 'banned',
    moderation_reason: 'Account deleted by the user',
    moderated_at: nowIso,
    moderated_by: 'self-delete',
    auth_id: null as string | null,
    platform_user_id: null as string | null,
  };
}

/** Vendor identity on a retained financial row (manual_deals). Amounts, dates,
 *  status, ids, and vendor_id are all left intact. */
export function manualDealVendorAnonymization() {
  return { vendor_name: DELETED_FINANCIAL };
}

/** Vendor identity on the retained onboarding-funnel record (vendor_invites).
 *  Funnel timestamps + status + invited_by are kept for conversion history. */
export function vendorInviteAnonymization() {
  return {
    contact_name: DELETED_DISPLAY,
    company_name: DELETED_VENDOR_DISPLAY,
    email: null as string | null,
    phone: null as string | null,
  };
}

// ---------------------------------------------------------------------------
// Table-by-table disposition (documentation + a shape the tests assert)
// ---------------------------------------------------------------------------

export type Disposition = 'deleted' | 'anonymized' | 'retained';

/** Every table that references a user, and what happens to it on deletion.
 *  'retained' rows are left byte-for-byte unchanged. Single source of truth for
 *  the report and for reasoning about the feature. */
export const DISPOSITION: Record<string, { action: Disposition; by: string; note: string }> = {
  // --- Buyer-side (matched by email) ---
  cart_items: { action: 'deleted', by: 'buyer_email', note: 'shopping cart rows' },
  saved_listings: { action: 'deleted', by: 'buyer_email', note: 'saved-for-quote rows' },
  buyer_profiles: { action: 'deleted', by: 'buyer_email', note: 'buyer profile (no financial FK depends on it)' },
  quote_requests: { action: 'anonymized', by: 'email', note: 'buyer thread kept for the vendor; contact identity scrubbed; message/answers/amounts retained; commissions.quote_request_id stays valid' },
  reviews: { action: 'anonymized', by: 'buyer_email', note: 'vendor keeps the review; reviewer email scrubbed; rating/body kept' },
  listing_reports: { action: 'anonymized', by: 'reporter_email', note: 'moderation trail retained; reporter email scrubbed' },
  projects: { action: 'anonymized', by: 'owner_auth_id', note: 'shared workspace kept; owner company/logo/problem/outcome scrubbed' },
  project_members: { action: 'deleted', by: 'auth_id / invited_email', note: "the deleted user's own membership rows" },

  // --- Notifications (both sides) ---
  notifications: { action: 'deleted', by: 'buyer_email / vendor_id', note: 'ephemeral notification rows' },

  // --- Vendor-side (matched by vendor_id / auth_id) ---
  vendor_profiles: { action: 'anonymized', by: 'auth_id', note: 'RETAINED as financial-anchor id (commissions/purchases/moderation cascade off it); all PII scrubbed; storefront banned' },
  marketplace_products: { action: 'deleted', by: 'vendor_id', note: 'listings unpublished + deleted (cascades listing_documents/reports by product_id)' },
  marketplace_services: { action: 'deleted', by: 'vendor_id', note: 'listings unpublished + deleted (cascades listing_documents/reports by service_id)' },
  listing_documents: { action: 'deleted', by: 'vendor_id', note: 'listing spec docs' },
  case_studies: { action: 'deleted', by: 'vendor_id', note: 'listing case studies' },
  vendor_case_studies: { action: 'deleted', by: 'vendor_id', note: 'storefront case studies' },
  vendor_certifications: { action: 'deleted', by: 'vendor_id', note: 'certifications' },
  vendor_gallery: { action: 'deleted', by: 'vendor_id', note: 'storefront photos' },
  vendor_videos: { action: 'deleted', by: 'vendor_id', note: 'storefront videos' },
  vendor_brochures: { action: 'deleted', by: 'vendor_id', note: 'brochures' },
  vendor_team: { action: 'deleted', by: 'vendor_id', note: 'team member rows (personal)' },
  manual_deals: { action: 'anonymized', by: 'vendor_id', note: 'FINANCIAL — amounts/dates/status/ids kept; vendor_name scrubbed' },
  vendor_invites: { action: 'anonymized', by: 'vendor_id / auth_id / email', note: 'funnel record kept; PII scrubbed' },
  vendor_applications: { action: 'deleted', by: 'auth_id / email', note: "the user's own application submission (legal acceptance is separately retained in terms_acceptances)" },

  // --- RETAINED untouched (financial / legal / audit) ---
  commissions: { action: 'retained', by: 'vendor_id', note: 'FINANCIAL LEDGER — no direct PII column; vendor_id anchor kept' },
  purchases: { action: 'retained', by: 'vendor_id', note: 'FINANCIAL — no direct PII column' },
  fee_calculations: { action: 'retained', by: 'deal_id', note: 'FINANCIAL — fee engine output' },
  fee_acknowledgments: { action: 'retained', by: 'deal_id', note: 'FINANCIAL/legal' },
  deals: { action: 'retained', by: '—', note: 'no direct user PII column' },
  quotes: { action: 'retained', by: 'vendor_id (vendor_accounts)', note: 'deals-system quotes; no PII column' },
  pilots: { action: 'retained', by: 'vendor_id', note: 'operational record; no PII column' },
  agreements: { action: 'retained', by: 'vendor_account_id', note: 'legal/financial agreement record' },
  vendor_moderation_log: { action: 'retained', by: 'vendor_id', note: 'AUDIT TRAIL — admin_email only, not the user' },
  terms_acceptances: { action: 'retained', by: 'user_id / email', note: 'LEGAL record of consent — lawful retention basis' },
  messages: { action: 'retained', by: 'quote_request_id', note: 'thread bodies kept; identity carried by anonymized quote_requests / vendor_profiles' },
};
