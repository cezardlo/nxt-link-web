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

// Section 1 — Storefront: name+logo -> location+service areas -> tagline+
// about -> contact. Updated 2026-07-30 (Cesar): a card may pair up to TWO
// closely related questions instead of forcing a rigid one-question-per-card
// rule. "Where is your business located?" and "where do you provide
// service?" naturally belong together (both are "where"), and tagline/about
// are both short company-description copy asked back to back — so each pair
// now shares one card. Never more than two questions on a single card.
export type StorefrontStepId = 'name_logo' | 'location_areas' | 'tagline_about' | 'contact';
export const STOREFRONT_STEPS: StorefrontStepId[] = ['name_logo', 'location_areas', 'tagline_about', 'contact'];

// Section 2 — Capabilities: industries -> client sizes -> categories.
// "Service areas" moved to the Storefront section's location card (paired
// with "where is your business located?" — see StorefrontStepId above) as of
// 2026-07-30, so it no longer lives here.
export type CapabilitiesStepId = 'industries' | 'client_size' | 'categories';
export const CAPABILITIES_STEPS: CapabilitiesStepId[] = ['industries', 'client_size', 'categories'];

/** Whether the paired location card's SECOND question ("where do you provide
 *  service?") should render. True when every selected category is in the
 *  "technology" family — no physical install site / service region applies
 *  (mirrors src/app/vendor/portal/page.tsx's `softwareOnly` rule). Pure —
 *  same input always produces the same output. This replaces the old
 *  per-section `getVisibleCapabilitiesSteps` filter now that service areas
 *  live inside a Storefront card instead of being their own Capabilities
 *  step. */
export function showServiceAreasQuestion(opts: { softwareOnly: boolean }): boolean {
  return !opts.softwareOnly;
}

// Section 3 — Trust & Proof: one combined "proof" card (certifications, case
// studies, photos — each a summary tile that deep-links to the richer portal
// editor, since those are file-upload/multi-field editors this flow doesn't
// re-implement) plus videos and awards, which stay fully inline (no file
// upload, so no need to leave the flow). Five separate cards collapsed to
// three on 2026-07-30 per Cesar's "make them simple" directive.
export type TrustStepId = 'proof' | 'videos' | 'awards';
export const TRUST_STEPS: TrustStepId[] = ['proof', 'videos', 'awards'];

// Section 4 — Agreement & Activation: a recap card, then the terms table +
// checkbox + Activate CTA together on one card (task spec).
export type AgreementStepId = 'recap' | 'terms';
export const AGREEMENT_STEPS: AgreementStepId[] = ['recap', 'terms'];

export type StepId = StorefrontStepId | CapabilitiesStepId | TrustStepId | AgreementStepId;

export interface VisibleStepsOptions {
  softwareOnly: boolean;
}

/** The ordered list of cards a given vendor sees inside one section. Pure.
 *  `opts` is currently unused for step-list purposes (softwareOnly only
 *  affects content WITHIN the storefront location card now — see
 *  `showServiceAreasQuestion`) but is kept in the signature so every call
 *  site doesn't have to change if a future section ever needs it again. */
export function stepsForSection(section: SectionKey, _opts: VisibleStepsOptions): StepId[] {
  switch (section) {
    case 'storefront': return STOREFRONT_STEPS;
    case 'capabilities': return CAPABILITIES_STEPS;
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
