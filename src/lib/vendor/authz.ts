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
