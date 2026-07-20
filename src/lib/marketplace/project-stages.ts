// Canonical buyer-project lifecycle stages (shared, non-route module).
// Moved out of src/app/api/projects/route.ts because Next.js route files may
// only export handlers/config — not arbitrary constants.
export const STAGES = [
  'organizing', 'requirements_ready', 'matching', 'vendors_invited',
  'collecting_quotes', 'comparing', 'decision', 'vendor_selected',
  'implementation', 'completed', 'archived',
] as const;

export type ProjectStage = (typeof STAGES)[number];
