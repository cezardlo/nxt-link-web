// Pure step/section logic for the vendor onboarding card flow (v2 — hub +
// four focused sections). Kept dependency-free (no React, no fetch) so it is
// trivially unit-testable — see tests/vendor-onboarding-steps.test.ts. The UI
// (page.tsx / cards.tsx) only ever reads this file; it never re-derives
// section/step order or completion inline, so there is one source of truth.
//
// v2 replaces the single 12-card line (Slice S1) per CESAR'S PORTAL REDESIGN
// BLUEPRINT (workplace/plans/vendor-onboarding-uber-flow-2026-07-29.md,
// "CESAR'S PORTAL REDESIGN BLUEPRINT" section): a hub screen with four short,
// independently-completable sections instead of one long march.

export type SectionKey = 'storefront' | 'capabilities' | 'trust' | 'agreement';

export const SECTION_ORDER: SectionKey[] = ['storefront', 'capabilities', 'trust', 'agreement'];

// Section 1 — Storefront: name+logo -> tagline -> about -> contact (blueprint,
// verbatim grouping).
export type StorefrontStepId = 'name_logo' | 'tagline' | 'about' | 'contact';
export const STOREFRONT_STEPS: StorefrontStepId[] = ['name_logo', 'tagline', 'about', 'contact'];

// Section 2 — Capabilities: industries -> client sizes -> categories ->
// service areas (blueprint, verbatim grouping — the standalone "who are you
// looking for" chip picker from Slice S1 is folded out of the counted flow;
// see task report for why).
export type CapabilitiesStepId = 'industries' | 'client_size' | 'categories' | 'service_areas';
export const CAPABILITIES_STEPS: CapabilitiesStepId[] = ['industries', 'client_size', 'categories', 'service_areas'];

export interface CapabilitiesVisibleOptions {
  /** True when every selected category is in the "technology" family — no
   *  physical install site / service region applies, so we skip that card
   *  (mirrors src/app/vendor/portal/page.tsx's `softwareOnly` rule). */
  softwareOnly: boolean;
}

/** The ordered list of Capabilities cards a given vendor should see. Pure —
 *  same input always produces the same output. */
export function getVisibleCapabilitiesSteps(opts: CapabilitiesVisibleOptions): CapabilitiesStepId[] {
  return CAPABILITIES_STEPS.filter((id) => !(id === 'service_areas' && opts.softwareOnly));
}

// Section 3 — Trust & Proof: certifications, case studies, photos, videos,
// awards (task spec, verbatim). Certifications/case studies/photos are
// portal-only rich editors here (file uploads, multi-field forms) — their
// cards summarize + deep-link to the portal rather than re-implementing the
// editor; videos and awards have no file upload, so they stay fully inline.
export type TrustStepId = 'certifications' | 'case_studies' | 'photos' | 'videos' | 'awards';
export const TRUST_STEPS: TrustStepId[] = ['certifications', 'case_studies', 'photos', 'videos', 'awards'];

// Section 4 — Agreement & Activation: a recap card, then the terms table +
// checkbox + Activate CTA together on one card (task spec).
export type AgreementStepId = 'recap' | 'terms';
export const AGREEMENT_STEPS: AgreementStepId[] = ['recap', 'terms'];

export type StepId = StorefrontStepId | CapabilitiesStepId | TrustStepId | AgreementStepId;

export interface VisibleStepsOptions {
  softwareOnly: boolean;
}

/** The ordered list of cards a given vendor sees inside one section. Pure. */
export function stepsForSection(section: SectionKey, opts: VisibleStepsOptions): StepId[] {
  switch (section) {
    case 'storefront': return STOREFRONT_STEPS;
    case 'capabilities': return getVisibleCapabilitiesSteps(opts);
    case 'trust': return TRUST_STEPS;
    case 'agreement': return AGREEMENT_STEPS;
    default: return [];
  }
}

export function clampStepIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index > total - 1) return total - 1;
  return index;
}

/** Inputs the calm checklist / hub cards need to decide "done" per section.
 *  Deliberately separate from the shared ProfileStrengthMeter's per-field
 *  scoring (src/components/ProfileStrengthMeter.tsx) — that meter grades
 *  individual fields toward a % strength score; this grades the four
 *  MACRO sections of this flow toward a plain done/not-done checklist (the
 *  blueprint bans the % ring here). Both may legitimately disagree. */
export interface SectionCompletionInput {
  companyName: string;
  tagline: string;
  description: string;
  industries: string[];
  categories: string[];
  clientSizeCount: number;
  proofCount: number; // certifications + case studies + photos + videos + awards
  agreementAccepted: boolean;
}

export function computeSectionStatus(input: SectionCompletionInput): Record<SectionKey, boolean> {
  return {
    storefront: input.companyName.trim().length > 0 && input.tagline.trim().length > 0 && input.description.trim().length > 0,
    capabilities: input.industries.length > 0 && input.categories.length > 0,
    trust: input.proofCount > 0,
    agreement: input.agreementAccepted,
  };
}

/** How many of the four sections are done — drives the hub's "X of 4" line. */
export function countSectionsDone(status: Record<SectionKey, boolean>): number {
  return SECTION_ORDER.filter((k) => status[k]).length;
}
