import { INDUSTRIES, mapToCanonicalIndustry } from '@/lib/data/sector-mapping';

export const COMPANY_PROFILE_STORAGE_KEY = 'nxt-link-company-profile-v1';

export type CompanyAccountRole = 'buyer' | 'vendor';

export type SavedCompanyProfile = {
  role: CompanyAccountRole;
  companyName: string;
  industry: string;
  companyType: string;
  location: string;
  interests: string[];
  useCases: string[];
  updatedAt: string;
};

export const COMPANY_TYPE_OPTIONS = [
  'Warehouse / Distribution Center',
  '3PL / Logistics Provider',
  'Manufacturer',
  'Retail / E-commerce',
  'Transportation / Fleet',
  'Technology Vendor',
  'Equipment Vendor',
  'Service Provider',
  'Consultant / Integrator',
] as const;

export const SOLUTION_CATEGORY_OPTIONS = [
  'Warehouse Software & WMS',
  'Robotics & Automation',
  'Material Handling Equipment',
  'Inventory, Tracking & Visibility',
  'Transportation & Fleet Technology',
  'Safety, Security & Compliance',
  'Packaging, Labeling & Identification',
  'Data, AI & Analytics',
  'Facility & Maintenance Services',
  'Consulting & Systems Integration',
] as const;

export const BUYER_USE_CASE_OPTIONS = [
  'Improve inventory accuracy',
  'Reduce picking time',
  'Automate repetitive work',
  'Increase warehouse capacity',
  'Improve dock and yard flow',
  'Reduce labor dependence',
  'Track assets and shipments',
  'Improve safety and compliance',
  'Modernize warehouse software',
  'Support cross-border operations',
] as const;

const INDUSTRY_ACCENTS: Record<string, string> = {
  logistics: '#00d4ff',
  manufacturing: '#8b5cf6',
  'ai-ml': '#6366f1',
  cybersecurity: '#06b6d4',
  defense: '#ef4444',
  'border-tech': '#f97316',
  energy: '#eab308',
  healthcare: '#22c55e',
  fintech: '#14b8a6',
  consumer: '#ec4899',
  'real-estate': '#84cc16',
  education: '#f59e0b',
  media: '#a855f7',
};

const CATEGORY_RULES: Array<{ label: string; terms: string[] }> = [
  {
    label: 'Warehouse Software & WMS',
    terms: ['wms', 'warehouse management', 'inventory management', 'erp', 'order management', 'fulfillment software'],
  },
  {
    label: 'Robotics & Automation',
    terms: ['robot', 'automation', 'amr', 'agv', 'as/rs', 'sortation', 'conveyor', 'goods-to-person', 'picking automation'],
  },
  {
    label: 'Material Handling Equipment',
    terms: ['forklift', 'material handling', 'racking', 'storage', 'pallet', 'lift truck', 'dock equipment'],
  },
  {
    label: 'Inventory, Tracking & Visibility',
    terms: ['tracking', 'visibility', 'rfid', 'barcode', 'sensor', 'iot', 'traceability', 'asset tracking'],
  },
  {
    label: 'Transportation & Fleet Technology',
    terms: ['fleet', 'transportation', 'telematics', 'tms', 'freight', 'routing', 'dispatch', 'trucking'],
  },
  {
    label: 'Safety, Security & Compliance',
    terms: ['safety', 'security', 'compliance', 'fire', 'camera', 'access control', 'cargo theft', 'cybersecurity'],
  },
  {
    label: 'Packaging, Labeling & Identification',
    terms: ['packaging', 'label', 'printing', 'identification', 'carton', 'tote', 'container'],
  },
  {
    label: 'Data, AI & Analytics',
    terms: ['ai', 'analytics', 'computer vision', 'forecast', 'optimization', 'digital twin', 'machine learning'],
  },
  {
    label: 'Facility & Maintenance Services',
    terms: ['maintenance', 'repair', 'facility', 'electrical', 'hvac', 'pest', 'waste', 'staffing', 'propane'],
  },
  {
    label: 'Consulting & Systems Integration',
    terms: ['consulting', 'integration', 'implementation', 'design', 'engineering', 'systems integrator'],
  },
];

export function canonicalIndustryLabel(rawIndustry: string | null | undefined): string {
  const slug = mapToCanonicalIndustry(rawIndustry);
  if (!slug) return rawIndustry?.trim() || 'Industrial Technology';
  return INDUSTRIES.find((industry) => industry.slug === slug)?.label || rawIndustry?.trim() || 'Industrial Technology';
}

export function industryAccent(rawIndustry: string | null | undefined): string {
  const slug = mapToCanonicalIndustry(rawIndustry);
  return slug ? INDUSTRY_ACCENTS[slug] || '#6366f1' : '#6366f1';
}

export function normalizeSolutionCategory(rawValue: string | null | undefined): string {
  const value = rawValue?.trim();
  if (!value) return 'Industrial Technology & Solutions';
  const lower = value.toLowerCase();
  const match = CATEGORY_RULES.find((rule) => rule.terms.some((term) => lower.includes(term)));
  return match?.label || value;
}

export function inferSolutionCategories(values: Array<string | null | undefined>, limit = 4): string[] {
  const categories = values
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeSolutionCategory);
  return Array.from(new Set(categories)).slice(0, limit);
}

export function uniqueLabels(values: Array<string | null | undefined>, limit = 12): string[] {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
  ).slice(0, limit);
}

export function companyInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase() || 'NX';
}

export function companyDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
