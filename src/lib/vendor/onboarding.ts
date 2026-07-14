// Guided vendor onboarding — stage model, option lists, and progress scoring.
// One wizard front-end over the SAME records the portal edits (vendor_profiles
// + marketplace listings): no parallel store, no new tables required.
// Blueprint reference: MARKETPLACE_BLUEPRINT.md §4 (fit profile) and the
// master plan in docs/project/VENDOR_ONBOARDING_MASTER_AUDIT_2026-07-14.md.

import type { PriceMethod, PriceVisibility } from '@/lib/marketplace/types';

export const ONBOARDING_STAGES = [
  { key: 'company', label: 'Company', question: 'Who are you?' },
  { key: 'offerings', label: 'Offerings', question: 'What do you offer?' },
  { key: 'pricing', label: 'Pricing', question: 'How do you charge?' },
  { key: 'clients', label: 'Ideal clients', question: 'Who is it for?' },
  { key: 'proof', label: 'Proof', question: 'Why trust you?' },
  { key: 'preview', label: 'Preview', question: 'Ready to publish?' },
] as const;
export type StageKey = (typeof ONBOARDING_STAGES)[number]['key'];

// Company types per the vendor-onboarding master plan; stored in the existing
// single company_type column (multi-type support arrives with a migration).
export const COMPANY_TYPE_OPTIONS = [
  'Manufacturer', 'Distributor', 'Dealer', 'Systems integrator', 'Service provider',
  'Software company', 'Consultant', 'Transportation provider', 'Staffing company',
  'Equipment rental company', 'Other',
];

export const INDUSTRY_OPTIONS = [
  'Warehousing & 3PL', 'Manufacturing', 'Retail & E-commerce', 'Food & Beverage', 'Automotive',
  'Cold Chain', 'Import / Export & Customs', 'Construction', 'Distribution Centers',
  'Pharma & Healthcare', 'Aerospace & Defense', 'Electronics', 'Medical devices',
  'Plastics', 'Metal fabrication', 'General Industrial',
];

// Ideal-client picks share the client_types jsonb column: operations and
// facility sizes are both "who we serve" chips on the storefront.
export const OPERATION_TYPE_OPTIONS = [
  'Warehouses', '3PL providers', 'Distribution centers', 'Manufacturers',
  'Manufacturing warehouses', 'Cross-border operations', 'E-commerce fulfillment',
  'Retail distribution',
];
export const CLIENT_SIZE_OPTIONS = [
  'Small facilities', 'Medium facilities', 'Large facilities', 'Multi-location organizations',
];

export const SERVICE_AREA_OPTIONS = [
  'El Paso', 'Horizon City', 'Juárez', 'Southern New Mexico', 'West Texas',
  'Texas', 'Mexico', 'United States', 'Nationwide',
];

export const OFFERING_FAMILY_CARDS: Array<{ key: string; label: string; hint: string; examples: string; kind: 'product' | 'service' }> = [
  { key: 'Equipment', label: 'Equipment', hint: 'Large machines and systems', examples: 'Forklifts · Conveyors · Robots · Racking', kind: 'product' },
  { key: 'Products', label: 'Products', hint: 'Parts, devices, and supplies', examples: 'Scanners · Sensors · Labels · Safety products', kind: 'product' },
  { key: 'Technology', label: 'Technology', hint: 'Software and connected systems', examples: 'WMS · TMS · RFID · Machine vision · Analytics', kind: 'product' },
  { key: 'Services', label: 'Services', hint: 'Work your team performs', examples: 'Repair · Installation · Training · Transportation', kind: 'service' },
];

export interface PricingMethodCard {
  key: PriceMethod; label: string; hint: string; unit: string; recurring: boolean;
}
export const PRICING_METHOD_CARDS: PricingMethodCard[] = [
  { key: 'exact', label: 'Exact price', hint: 'One fixed price', unit: '', recurring: false },
  { key: 'starting', label: 'Starting price', hint: '“Starting at…” — final price varies', unit: '', recurring: false },
  { key: 'range', label: 'Price range', hint: 'A low–high band', unit: '', recurring: false },
  { key: 'per_unit', label: 'Per unit', hint: 'Each unit priced the same', unit: 'per unit', recurring: false },
  { key: 'per_hour', label: 'Per hour', hint: 'Labor or machine time', unit: 'per hour', recurring: false },
  { key: 'per_visit', label: 'Per visit', hint: 'Each service call', unit: 'per visit', recurring: false },
  { key: 'per_project', label: 'Per project', hint: 'One price per job', unit: 'per project', recurring: false },
  { key: 'per_month', label: 'Per month', hint: 'Recurring monthly', unit: 'per month', recurring: true },
  { key: 'rental', label: 'Rental', hint: 'Temporary use', unit: 'per month', recurring: true },
  { key: 'lease', label: 'Lease', hint: 'Long-term contract', unit: 'per month', recurring: true },
  { key: 'subscription', label: 'Subscription', hint: 'Software or plans', unit: 'per month', recurring: true },
  { key: 'quote', label: 'Custom quote', hint: 'Buyers request a quote', unit: '', recurring: false },
  { key: 'custom', label: 'Custom method', hint: 'Your own unit — per dock door, per pallet…', unit: '', recurring: false },
];

export const ADDITIONAL_COST_OPTIONS = [
  'Shipping', 'Delivery', 'Installation', 'Setup', 'Training', 'Travel',
  'Mobile-service fee', 'Parts', 'Materials', 'Emergency fee', 'After-hours fee',
  'Taxes', 'Monthly support', 'Maintenance', 'Fuel surcharge',
  'Border-crossing fee', 'Waiting time',
];

export const VISIBILITY_OPTIONS: Array<{ key: PriceVisibility; label: string; hint: string }> = [
  { key: 'public', label: 'Public', hint: 'Anyone browsing can see this price' },
  { key: 'signed_in', label: 'Signed-in clients', hint: 'Only registered clients see it' },
  { key: 'after_details', label: 'After project details', hint: 'Shown once the client answers basic questions' },
  { key: 'after_request', label: 'After quote request', hint: 'Shared when a client requests a quote' },
  { key: 'private', label: 'Private', hint: 'Listing shows “Request Quote” — price stays internal' },
];

/** Plain-language matching summary — never an unexplained percentage. */
export function buildMatchingSummary(input: {
  operations: string[]; industries: string[]; areas: string[]; expertise: string[];
}): string {
  const who = input.operations.length
    ? input.operations.slice(0, 3).join(', ').toLowerCase()
    : 'industrial operations';
  const where = input.areas.length ? input.areas.slice(0, 3).join(' and ') : 'your service areas';
  const what = input.expertise.length
    ? input.expertise.slice(0, 3).join(', ').toLowerCase()
    : (input.industries.length ? input.industries.slice(0, 2).join(' and ').toLowerCase() : 'your listed offerings');
  return `Your company will receive opportunities from ${who} in ${where} involving ${what}. You can change this anytime.`;
}

export interface OnboardingInput {
  companyName?: string | null; city?: string | null; tagline?: string | null;
  companyType?: string | null;
  mainExpertise?: string[] | null; problemsSolved?: string[] | null;
  offeringFamilies?: string[] | null;
  listingCount?: number;
  hasStructuredPricing?: boolean; // any listing with pricing.models or legacy range
  clientTypes?: string[] | null; industries?: string[] | null; serviceAreas?: string[] | null;
  proofCount?: number;            // certs + case studies + photos
  publishedCount?: number;
}
export interface StageState { key: StageKey; label: string; done: boolean }

/** Wizard progress. Account creation counts as the first completed step, so a
 *  brand-new vendor starts around 15%, never 0%. */
export function onboardingProgress(i: OnboardingInput): { pct: number; stages: StageState[] } {
  const stages: StageState[] = [
    {
      key: 'company', label: 'Company',
      done: Boolean(i.companyName && i.companyName !== 'New company' && i.city && i.companyType && (i.mainExpertise?.length || 0) > 0),
    },
    { key: 'offerings', label: 'Offerings', done: (i.offeringFamilies?.length || 0) > 0 && (i.listingCount || 0) > 0 },
    { key: 'pricing', label: 'Pricing', done: Boolean(i.hasStructuredPricing) },
    {
      key: 'clients', label: 'Ideal clients',
      done: (i.clientTypes?.length || 0) > 0 && (i.serviceAreas?.length || 0) > 0,
    },
    { key: 'proof', label: 'Proof', done: (i.proofCount || 0) > 0 },
    { key: 'preview', label: 'Preview', done: (i.publishedCount || 0) > 0 },
  ];
  const done = stages.filter((s) => s.done).length;
  const pct = Math.round(((1 + done) / (1 + stages.length)) * 100);
  return { pct, stages };
}
