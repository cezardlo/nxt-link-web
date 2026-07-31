// Best-effort ADMIN-FACING email notifications (email TO Cesar/operators,
// never customer-facing — so the marketing-approval rule for buyer/vendor
// copy does not apply here; this is internal ops mail, same class as a cron
// alert). Two triggers today (2026-07-31 admin console build):
//   1. A new vendor application lands in vendor_applications (pending) —
//      hooked from POST /api/apply/submit.
//   2. A new listing enters the needs_review queue (AI-drafted) — hooked
//      from POST /api/vendor/listings.
//
// Recipients: ADMIN_EMAILS (the SAME allowlist already used for admin role
// routing — src/lib/auth/admin-allowlist.ts). Empty/unset ADMIN_EMAILS means
// no recipients — a silent no-op, matching that allowlist's own fail-closed
// contract (no admin configured = notify nobody, not an error).
//
// FIRE-AND-FORGET CONTRACT (binding — mirrors dispatchRequestToVendors's
// vendor-lead email, src/lib/requests/dispatch.ts): every exported function
// here (a) never throws or rejects — internal try/catch swallows all errors
// — and (b) callers invoke them WITHOUT awaiting (fire, don't wait). A mail
// provider outage or a bad ADMIN_EMAILS value must never fail or slow the
// vendor's application/listing submission it's attached to.

import { sendMail } from '@/lib/mail';
import { parseAdminEmails } from '@/lib/auth/admin-allowlist';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nxt-link-web.vercel.app').replace(/\/$/, '');

export interface NewVendorApplicationInfo {
  companyName: string;
  contactName: string | null;
  contactEmail: string;
  category: string | null;
}

/** Pure — builds the admin email subject/body for a new vendor application.
 * No I/O, so it is unit-testable without a live mail provider. */
export function buildNewVendorApplicationEmail(app: NewVendorApplicationInfo): { subject: string; body: string } {
  const company = app.companyName || 'A new company';
  const body = [
    'A new vendor application was submitted on /apply.',
    '',
    `Company: ${company}`,
    `Contact: ${app.contactName || '—'} <${app.contactEmail}>`,
    `Category: ${app.category || '—'}`,
    '',
    `Review it: ${SITE_URL}/admin/vendor-applications`,
  ].join('\n');
  return { subject: `New vendor application: ${company}`, body };
}

export interface NewListingReviewInfo {
  listingName: string;
  vendorName: string | null;
  kind: 'product' | 'service';
}

/** Pure — builds the admin email subject/body for a listing that just
 * entered the needs_review queue. No I/O, unit-testable. */
export function buildNewListingReviewEmail(info: NewListingReviewInfo): { subject: string; body: string } {
  const name = info.listingName || 'A new listing';
  const body = [
    `A new AI-drafted ${info.kind} listing needs a human look before it can publish.`,
    '',
    `Listing: ${name}`,
    `Vendor: ${info.vendorName || '—'}`,
    '',
    `Review it: ${SITE_URL}/admin/marketplace#listings-review`,
  ].join('\n');
  return { subject: `New listing awaiting review: ${name}`, body };
}

/** Fan out one subject/body to every ADMIN_EMAILS recipient. Never throws —
 * always resolves. Not exported: callers go through the two functions below
 * so the fire-and-forget contract is enforced in one place. */
async function notifyAdmins(subject: string, body: string): Promise<void> {
  try {
    const recipients = parseAdminEmails(process.env.ADMIN_EMAILS);
    if (!recipients.length) return; // no admin inbox configured — silent no-op
    await Promise.all(recipients.map((to) => sendMail({ to, subject, body }).catch(() => {})));
  } catch {
    /* best-effort — a notification failure must never surface to the caller */
  }
}

/** Fire from POST /api/apply/submit right after the vendor_applications
 * insert succeeds. Do NOT await this at the call site (see file header). */
export function notifyAdminsNewVendorApplication(app: NewVendorApplicationInfo): void {
  const { subject, body } = buildNewVendorApplicationEmail(app);
  void notifyAdmins(subject, body);
}

/** Fire from POST /api/vendor/listings right after an AI-drafted listing is
 * inserted with status 'needs_review'. Do NOT await this at the call site
 * (see file header). */
export function notifyAdminsListingNeedsReview(info: NewListingReviewInfo): void {
  const { subject, body } = buildNewListingReviewEmail(info);
  void notifyAdmins(subject, body);
}
