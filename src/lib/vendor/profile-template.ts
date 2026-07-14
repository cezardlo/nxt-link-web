// Company profile template — taxonomy, tab model, and completion scoring
// shared by the vendor portal (edit), onboarding wizard, and public
// storefront. Backed by the vendor_profiles company-template columns and the
// vendor_team table (live schema recorded in
// supabase/migrations/20260711_company_profile_team.sql).
// Blueprint reference: MARKETPLACE_BLUEPRINT.md §4 (Vendor company and fit
// profile) — gap-analysis item "Vendor storefront: maturity type, detailed
// fit profile, team members".

export const COMPANY_TYPES = [
  'Manufacturer', 'Distributor', 'Integrator', 'Consultant',
  'Service provider', 'Software company', 'Hybrid',
] as const;

export const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;

export const RESPONSE_TIMES = [
  'Within 1 hour', 'Same business day', 'Within 24 hours', 'Within 2-3 days',
] as const;

export const OFFERING_FAMILIES = ['Products', 'Equipment', 'Technology', 'Services'] as const;

export const LANGUAGE_OPTIONS = ['English', 'Spanish', 'Portuguese', 'French', 'German', 'Mandarin'];

/** A vendor picks up to five primary areas — keeps profiles honest and scannable. */
export const MAX_EXPERTISE = 5;
export const EXPERTISE_OPTIONS = [
  'Warehouse automation', 'Material handling', 'Machine vision', 'Inventory tracking',
  'Industrial maintenance', 'Packaging automation', 'Robotics', 'Cybersecurity',
  'Transportation', 'Staffing', 'Software integration',
];

export const PROBLEM_OPTIONS = [
  'Inventory inaccuracies', 'Equipment downtime', 'Labor shortages', 'Slow order picking',
  'Product defects', 'Shipping delays', 'Poor facility security', 'Manual data entry',
  'Inefficient warehouse layouts',
];

export const CAPABILITY_OPTIONS = [
  'Facility assessment', 'System design', 'Equipment sourcing', 'Installation',
  'Software integration', 'Training', 'Preventive maintenance', 'Emergency repair',
  'Technical support', 'Pilot projects',
];

/** Storefront tabs in display order. Tabs with no content auto-hide; the
 *  vendor's visible_tabs column (when set) can hide more but never reorders. */
export const PROFILE_TABS = [
  'overview', 'expertise', 'products', 'services', 'technology',
  'cases', 'documents', 'team', 'reviews',
] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

export const TAB_LABELS: Record<ProfileTab, string> = {
  overview: 'Overview', expertise: 'Expertise', products: 'Products',
  services: 'Services', technology: 'Technology', cases: 'Case studies',
  documents: 'Documents', team: 'Team', reviews: 'Reviews',
};

// Which product categories count as "Technology" (software / digital) for the
// Technology tab, until listings carry an explicit offering type column.
const TECH_PATTERN = /software|technolog|\bwms\b|\berp\b|\biot\b|analytics|vision|rfid|saas|cloud|\bai\b|cybersecurity|tracking system|integration platform|platform/i;
export function isTechnologyCategory(category: string | null | undefined): boolean {
  return Boolean(category && TECH_PATTERN.test(category));
}

export function yearsInBusiness(yearFounded: number | null | undefined, nowYear: number): number | null {
  if (!yearFounded || yearFounded < 1800 || yearFounded > nowYear) return null;
  return nowYear - yearFounded;
}

export interface CompletionInput {
  companyName?: string | null;
  tagline?: string | null;
  description?: string | null;
  city?: string | null;
  hasLogo?: boolean;
  industries?: string[] | null;
  serviceAreas?: string[] | null;
  mainExpertise?: string[] | null;
  problemsSolved?: string[] | null;
  hasCompanyDetails?: boolean; // year_founded / employee_count / company_type
  listingCount?: number;
  caseStudyCount?: number;
  certificationCount?: number;
  photoCount?: number;
}
export interface CompletionStep { key: string; label: string; done: boolean }

/** Profile completion for the meter. Account creation always counts as done —
 *  a vendor never starts at zero. */
export function profileCompletion(i: CompletionInput): { score: number; steps: CompletionStep[] } {
  const steps: CompletionStep[] = [
    { key: 'account', label: 'Account created', done: true },
    {
      key: 'basics', label: 'Company basics — name, city, tagline',
      done: Boolean(i.companyName && i.companyName !== 'New company' && i.city && i.tagline),
    },
    { key: 'logo', label: 'Logo uploaded', done: Boolean(i.hasLogo) },
    { key: 'about', label: 'About the company written', done: Boolean(i.description && i.description.trim().length >= 60) },
    { key: 'details', label: 'Company details — founded, size, type', done: Boolean(i.hasCompanyDetails) },
    {
      key: 'fit', label: 'Industries and service areas selected',
      done: (i.industries?.length || 0) > 0 && (i.serviceAreas?.length || 0) > 0,
    },
    { key: 'expertise', label: 'Main expertise selected', done: (i.mainExpertise?.length || 0) > 0 },
    { key: 'problems', label: 'Problems you solve listed', done: (i.problemsSolved?.length || 0) > 0 },
    { key: 'listing', label: 'At least one listing created', done: (i.listingCount || 0) > 0 },
    {
      key: 'proof', label: 'Proof added — case study, certification, or photos',
      done: (i.caseStudyCount || 0) > 0 || (i.certificationCount || 0) > 0 || (i.photoCount || 0) > 0,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  return { score: Math.round((done / steps.length) * 100), steps };
}
