// Authorization for the vendors-PLURAL endpoints that take a client-supplied
// vendor_id (e.g. /api/vendors/brochures). Unlike the singular /api/vendor/*
// routes — which always scope to the caller's OWN session row and never trust a
// client id — these routes are consumed by BOTH the admin directory pages
// (arbitrary vendor_id) AND, for parity with the portal, the owning vendor.
//
// Access rule: an ADMIN may act on any vendor_id; a signed-in VENDOR may act
// ONLY on their own vendor_id; everyone else is refused. This composes the
// existing guards (isAdminRequest, getVendorSession, getOrCreateVendorProfile)
// — it does NOT introduce a new auth scheme.

import { isAdminRequest } from '@/lib/assistant/auth';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';

export type VendorResourceDecision = 'allow' | 'unauthenticated' | 'forbidden';

export interface VendorResourceAuthzInput {
  /** Caller passed the admin gate (isAdminRequest). */
  isAdmin: boolean;
  /** Caller has a signed-in vendor session. */
  isAuthenticated: boolean;
  /** The caller's OWN vendor_profiles.id, or null if none could be resolved. */
  callerVendorId: string | null;
  /** The vendor_id the request is trying to read/write. */
  requestedVendorId: string;
}

/**
 * Pure authorization decision — no I/O, so it can be unit-tested in isolation.
 * Fail-closed: anything that isn't an admin or a matching owner is refused.
 */
export function decideVendorResourceAccess(input: VendorResourceAuthzInput): VendorResourceDecision {
  // Admins act on any vendor's resources (the /admin/vendors + /admin/directory pages).
  if (input.isAdmin) return 'allow';
  // Not an admin and no vendor session → cannot be authorized at all.
  if (!input.isAuthenticated) return 'unauthenticated';
  // A signed-in vendor may only touch their OWN vendor_id. Empty/unknown ids never match.
  if (
    input.callerVendorId &&
    input.requestedVendorId &&
    input.callerVendorId === input.requestedVendorId
  ) {
    return 'allow';
  }
  return 'forbidden';
}

export interface VendorResourceAuthz {
  decision: VendorResourceDecision;
  isAdmin: boolean;
}

export type StorefrontPreviewDecision = 'preview' | 'not_found';

/**
 * A vendor storefront that ISN'T publicly live (pending review, suspended, or
 * banned) is still visible — as an explicit preview — to the vendor who owns
 * it, or to an admin. Everyone else (crucially, including a signed-in
 * NON-owner) gets the exact same not-found the anonymous public gets — no
 * "pending" vs "suspended" vs "doesn't exist" oracle for outsiders.
 *
 * Reuses `decideVendorResourceAccess` (the same admin-or-owner discipline
 * `authorizeVendorResource` composes for the /api/vendors/* endpoints) rather
 * than inventing a second scheme. Deliberately does NOT go through
 * `getOrCreateVendorProfile` the way `authorizeVendorResource` does — the
 * storefront route is read by ordinary signed-in BUYERS too, and that helper
 * auto-creates a blank vendor_profiles row for the caller if they don't have
 * one, which would be an unwanted side effect of merely browsing a listing.
 * Ownership here is a read-only auth_id comparison against the vendor row the
 * caller already fetched.
 *
 * Pure — no I/O — so it's unit-testable in isolation. Fail-closed: any doubt
 * about ownership (no session, id mismatch, vendor row has no auth_id yet)
 * resolves to not_found. Call ONLY after the normal public-visibility check
 * has already failed — this never makes a vendor MORE hidden, only extends
 * who can see a not-yet-live one.
 */
export function decideStorefrontPreview(input: {
  isAdmin: boolean;
  /** The signed-in caller's Supabase auth id, or null if not signed in. */
  callerAuthId: string | null;
  vendorId: string;
  /** The target vendor_profiles.auth_id, or null if never claimed. */
  vendorAuthId: string | null;
}): StorefrontPreviewDecision {
  if (input.isAdmin) return 'preview';
  const callerVendorId =
    input.callerAuthId && input.vendorAuthId && input.callerAuthId === input.vendorAuthId
      ? input.vendorId
      : null;
  const decision = decideVendorResourceAccess({
    isAdmin: false,
    isAuthenticated: Boolean(input.callerAuthId),
    callerVendorId,
    requestedVendorId: input.vendorId,
  });
  return decision === 'allow' ? 'preview' : 'not_found';
}

/**
 * Resolve the real auth signals and return the access decision for
 * `requestedVendorId`. Admins short-circuit before any vendor-profile lookup;
 * a non-admin caller is scoped to the vendor_profiles row their session owns.
 */
export async function authorizeVendorResource(
  req: Request,
  requestedVendorId: string,
): Promise<VendorResourceAuthz> {
  if (await isAdminRequest(req)) {
    return { decision: 'allow', isAdmin: true };
  }
  const session = await getVendorSession();
  if (!session) {
    return { decision: 'unauthenticated', isAdmin: false };
  }
  const vendor = await getOrCreateVendorProfile(session);
  const decision = decideVendorResourceAccess({
    isAdmin: false,
    isAuthenticated: true,
    callerVendorId: vendor?.id ?? null,
    requestedVendorId,
  });
  return { decision, isAdmin: false };
}
