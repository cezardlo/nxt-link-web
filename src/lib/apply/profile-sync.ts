// Application → vendor-profile mirror (2026-08-04 batch, Cesar item 5:
// "everything they enter saves to their profile"). When a signed-in vendor
// submits or edits their vendor application, the same facts land on their
// live vendor_profiles row — so the portal, onboarding, and storefront never
// show an empty form or the placeholder "New company" after they already told
// us who they are.
//
// FILL-EMPTY ONLY: a field the vendor already set in the portal/onboarding is
// never overwritten by the application copy — the richer editor wins. Best
// effort: a failure here must never fail the application flow itself.

import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureVendorProfile } from '@/lib/vendor/profile';
import type { ApplicationRow } from './auth';

export type ApplicationFacts = Pick<
  ApplicationRow,
  'company_name' | 'contact_name' | 'phone' | 'problem_solved' | 'region' | 'regions' | 'email'
>;

function regionsOf(app: ApplicationFacts): string[] {
  if (Array.isArray(app.regions) && app.regions.length) return app.regions;
  return app.region ? [app.region] : [];
}

export async function syncApplicationToVendorProfile(
  db: SupabaseClient,
  session: { authId: string; email: string | null },
  app: ApplicationFacts,
): Promise<void> {
  try {
    const regions = regionsOf(app);
    const ensured = await ensureVendorProfile(db, {
      lane: 'portal',
      authId: session.authId,
      email: session.email ?? app.email,
      profile: {
        company_name: app.company_name || 'New company',
        contact_name: app.contact_name || null,
        phone: app.phone || null,
        description: app.problem_solved || null,
        city: regions[0] || null,
        service_areas: regions,
        email: (session.email ?? app.email ?? '').toLowerCase() || null,
        source: 'application',
      },
      select: 'id, company_name, contact_name, phone, description, city, service_areas',
    });
    if (!ensured.ok) return;

    const row = ensured.row;
    const blank = (v: unknown) => {
      const s = String(v ?? '').trim();
      return !s || s === 'New company';
    };
    const patch: Record<string, unknown> = {};
    if (blank(row.company_name) && app.company_name) patch.company_name = app.company_name;
    if (blank(row.contact_name) && app.contact_name) patch.contact_name = app.contact_name;
    if (blank(row.phone) && app.phone) patch.phone = app.phone;
    if (blank(row.description) && app.problem_solved) patch.description = app.problem_solved;
    if (blank(row.city) && regions[0]) patch.city = regions[0];
    const areas = Array.isArray(row.service_areas) ? (row.service_areas as string[]) : [];
    if (!areas.length && regions.length) patch.service_areas = regions;
    if (!Object.keys(patch).length) return;
    await db.from('vendor_profiles').update(patch).eq('id', ensured.id);
  } catch {
    // Best-effort mirror — never break submit/status because a profile write failed.
  }
}
