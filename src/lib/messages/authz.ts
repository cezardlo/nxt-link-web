// Pure thread-ownership decisions for buyer<->vendor messages. Text messages
// AND file attachments hang off the SAME quote_requests thread and go
// through the SAME ownership check ("only the two thread parties may read
// or write this thread") — extracted here, out of the route files, so the
// auth rule can be unit tested without a database, cookies, or a running
// server. The routes do the I/O (session lookup, DB ownership query), then
// call these to turn the raw booleans into a decision; behavior/status codes
// are unchanged from the pre-existing inline checks.

export type BuyerThreadDecision =
  | 'allow'
  | 'unauthenticated'
  | 'email_unverified'
  | 'not_configured'
  | 'not_found';

export function decideBuyerThreadAccess(input: {
  hasSession: boolean;
  emailConfirmed: boolean;
  configured: boolean;
  ownsRequest: boolean;
}): BuyerThreadDecision {
  if (!input.hasSession) return 'unauthenticated';
  if (!input.emailConfirmed) return 'email_unverified';
  if (!input.configured) return 'not_configured';
  if (!input.ownsRequest) return 'not_found';
  return 'allow';
}

export type VendorThreadDecision =
  | 'allow'
  | 'unauthenticated'
  | 'not_configured'
  | 'profile_not_found'
  | 'lead_not_found';

export function decideVendorThreadAccess(input: {
  hasSession: boolean;
  configured: boolean;
  vendorResolved: boolean;
  ownsRequest: boolean;
}): VendorThreadDecision {
  if (!input.hasSession) return 'unauthenticated';
  if (!input.configured) return 'not_configured';
  if (!input.vendorResolved) return 'profile_not_found';
  if (!input.ownsRequest) return 'lead_not_found';
  return 'allow';
}
