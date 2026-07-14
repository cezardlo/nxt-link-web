// Guided filtering — the buyer journey is Operation → Area → Solution type →
// Location → Goal → technical details, in plain language ("Move products and
// materials", not "Material-handling systems"). This lib holds the taxonomy,
// the listing/company classifiers, and the plain-English "Matches because…"
// explainer (no unexplained match scores). Everything matches against real
// vendor-entered data only.

import { isTechnologyCategory } from '@/lib/vendor/profile-template';

// ---- Step 1: what kind of operation are you? ----
export type Operation = 'warehousing' | 'manufacturing' | 'both';
export const OPERATIONS: Array<{ key: Operation; label: string; forWho: string[] }> = [
  {
    key: 'warehousing', label: 'Warehousing & Distribution',
    forWho: ['Warehouses', '3PLs', 'Distribution centers', 'Wholesalers', 'Cross-border facilities', 'E-commerce fulfillment'],
  },
  {
    key: 'manufacturing', label: 'Manufacturing',
    forWho: ['Automotive', 'Electronics', 'Medical devices', 'Food and beverage', 'Aerospace', 'Metal fabrication', 'Plastics', 'General manufacturing'],
  },
  { key: 'both', label: 'I serve both', forWho: [] },
];
// Industry terms that identify each operation in vendor-entered data.
const OPERATION_TERMS: Record<Exclude<Operation, 'both'>, RegExp> = {
  warehousing: /warehous|3pl|distribution|fulfillment|logistics|e-?commerce|wholesal|cold chain|import|export/i,
  manufacturing: /manufactur|automotive|electronics|medical|food|beverage|aerospace|metal|plastic|fabricat|production|assembly/i,
};

// ---- Step 2: what part of your operation needs help? ----
export interface OperationArea { key: string; label: string; hint: string; terms: RegExp }
export const WAREHOUSE_AREAS: OperationArea[] = [
  { key: 'receiving', label: 'Receiving and docks', hint: 'Dock doors, unloading, inbound checks', terms: /dock|receiv|unload|inbound|leveler|door/i },
  { key: 'storage', label: 'Storage and racking', hint: 'Racking, shelving, mezzanines, layout', terms: /rack|shelv|storage|mezzanine|layout/i },
  { key: 'inventory', label: 'Inventory tracking', hint: 'Know what you have and where it is', terms: /inventory|rfid|barcode|scan|cycle count|wms|tracking/i },
  { key: 'picking', label: 'Picking and packing', hint: 'Order picking speed and accuracy', terms: /pick|pack|order|fulfill|kitting/i },
  { key: 'movement', label: 'Move products and materials', hint: 'Forklifts, conveyors, robots, carts', terms: /forklift|conveyor|robot|amr|agv|pallet|material handling|lift|tugger|cart/i },
  { key: 'shipping', label: 'Shipping and transportation', hint: 'Outbound, freight, carriers, cross-border', terms: /ship|freight|transport|carrier|ltl|ftl|truck|customs|cross-?border/i },
  { key: 'yard', label: 'Yard operations', hint: 'Trailers, yard checks, gate management', terms: /yard|trailer|gate/i },
  { key: 'safety', label: 'Safety and security', hint: 'Worker safety, cameras, access, theft', terms: /safety|security|camera|surveillance|theft|access|ppe|fire/i },
  { key: 'maintenance', label: 'Maintenance and facilities', hint: 'Equipment repair, facility upkeep', terms: /maintenance|repair|facility|hvac|electrical|clean/i },
  { key: 'workforce', label: 'Staffing and workforce', hint: 'Find, train, and keep workers', terms: /staff|workforce|labor|training|recruit/i },
  { key: 'automation', label: 'Automation', hint: 'Automate a manual process', terms: /automat|robot|amr|agv|asrs|vision/i },
  { key: 'packaging', label: 'Packaging', hint: 'Wrapping, labeling, cartons, filling', terms: /packag|label|wrap|carton|seal|fill/i },
];
export const MANUFACTURING_AREAS: OperationArea[] = [
  { key: 'production', label: 'Production and assembly', hint: 'Lines, cells, machines, throughput', terms: /production|assembly|line|cell|cnc|machining|molding/i },
  { key: 'movement', label: 'Move products and materials', hint: 'Between lines, cells, and storage', terms: /forklift|conveyor|robot|amr|agv|pallet|material handling|lift/i },
  { key: 'quality', label: 'Quality and inspection', hint: 'Catch defects before they ship', terms: /quality|inspect|defect|vision|test|measur|metrology/i },
  { key: 'maintenance', label: 'Maintenance and repair', hint: 'Keep equipment running', terms: /maintenance|repair|predictive|preventive|downtime/i },
  { key: 'automation', label: 'Automation and robotics', hint: 'Automate manual production steps', terms: /automat|robot|cobot|plc|vision/i },
  { key: 'packaging', label: 'Packaging and labeling', hint: 'End-of-line packaging and labels', terms: /packag|label|wrap|carton|seal|fill/i },
  { key: 'inventory', label: 'Inventory and supply chain', hint: 'Materials, WIP, finished goods', terms: /inventory|supply chain|mrp|erp|wms|tracking/i },
  { key: 'safety', label: 'Safety and compliance', hint: 'Worker safety and regulations', terms: /safety|compliance|osha|ppe|guard|lockout/i },
  { key: 'utilities', label: 'Facility utilities', hint: 'Power, air, water, HVAC', terms: /utilit|power|compress|hvac|electrical|energy/i },
  { key: 'workforce', label: 'Workforce', hint: 'Find, train, and keep workers', terms: /staff|workforce|labor|training|recruit/i },
  { key: 'software', label: 'Software and data', hint: 'Systems, dashboards, integrations', terms: /software|erp|mes|data|analytic|dashboard|integrat/i },
  { key: 'custom', label: 'Custom manufacturing', hint: 'Parts made to your spec', terms: /custom|fabricat|machin|prototype|tooling/i },
];
export function areasFor(op: Operation | null): OperationArea[] {
  if (op === 'manufacturing') return MANUFACTURING_AREAS;
  if (op === 'warehousing') return WAREHOUSE_AREAS;
  // 'both' / unset: union by key (movement, automation, etc. appear once).
  const seen = new Set<string>();
  return [...WAREHOUSE_AREAS, ...MANUFACTURING_AREAS].filter((a) => {
    if (seen.has(a.key)) return false;
    seen.add(a.key);
    return true;
  });
}

// ---- Step 3: what type of solution do you want? ----
export type SolutionType = 'equipment' | 'product' | 'technology' | 'service';
export const SOLUTION_TYPES: Array<{ key: SolutionType; label: string; hint: string; examples: string }> = [
  { key: 'equipment', label: 'Equipment', hint: 'Machines and larger physical systems', examples: 'Forklifts, conveyors, robots, racking, CNC, packaging machines' },
  { key: 'product', label: 'Products', hint: 'Parts, devices, supplies, smaller items', examples: 'Scanners, sensors, labels, cameras, parts, safety products' },
  { key: 'technology', label: 'Technology', hint: 'Software and connected systems', examples: 'WMS, ERP, TMS, RFID, machine vision, fleet tracking, cybersecurity' },
  { key: 'service', label: 'Services', hint: 'Work performed by a company', examples: 'Repair, maintenance, installation, consulting, staffing, training' },
];
const EQUIPMENT_TERMS = /forklift|conveyor|robot|amr|agv|rack|racking|crane|lift|palletizer|cnc|machine|asrs|dock|mezzanine|press|lathe|wrapper|system/i;

/** Classify a listing into the buyer-facing solution type. Technology wins
 *  over equipment (a "machine vision system" is technology, not a machine). */
export function solutionTypeOf(l: { kind: 'product' | 'service'; category?: string | null; name?: string | null }): SolutionType {
  if (l.kind === 'service') return 'service';
  if (isTechnologyCategory(l.category)) return 'technology';
  if (EQUIPMENT_TERMS.test(`${l.category || ''} ${l.name || ''}`)) return 'equipment';
  return 'product';
}

// ---- Step 4: where do you need it? ----
export const LOCATION_OPTIONS = ['El Paso', 'Juárez', 'New Mexico', 'Texas', 'Mexico', 'Nationwide'];
export type SiteNeed = 'onsite' | 'delivery' | 'remote' | 'crossborder';
export const SITE_NEEDS: Array<{ key: SiteNeed; label: string }> = [
  { key: 'onsite', label: 'On-site service required' },
  { key: 'delivery', label: 'Delivery only' },
  { key: 'remote', label: 'Remote support is acceptable' },
  { key: 'crossborder', label: 'Cross-border capability required' },
];
function areaMatches(areas: string[] | undefined | null, location: string): boolean {
  const loc = location.toLowerCase();
  return (areas || []).some((a) => {
    const s = a.toLowerCase();
    return s.includes(loc) || loc.includes(s) || s.includes('national') || s.includes('nationwide');
  });
}

// ---- Step 5: what result are you trying to achieve? ----
export interface Goal { key: string; label: string; terms: RegExp }
export const GOALS: Goal[] = [
  { key: 'downtime', label: 'Reduce equipment downtime', terms: /downtime|maintenance|repair|preventive|predictive|uptime|reliab/i },
  { key: 'accuracy', label: 'Improve inventory accuracy', terms: /inventory|accura|rfid|barcode|scan|cycle count|wms|count/i },
  { key: 'movement', label: 'Move materials faster', terms: /material|conveyor|forklift|amr|agv|throughput|flow|handling/i },
  { key: 'labor', label: 'Reduce labor requirements', terms: /labor|automat|robot|manual|headcount|productiv/i },
  { key: 'safety', label: 'Improve worker safety', terms: /safety|ergonom|accident|injur|ppe|guard/i },
  { key: 'defects', label: 'Reduce product defects', terms: /defect|quality|inspect|vision|reject|scrap/i },
  { key: 'picking', label: 'Improve order-picking speed', terms: /pick|order|fulfill|pack|speed/i },
  { key: 'automate', label: 'Automate a manual process', terms: /automat|robot|manual|process/i },
  { key: 'security', label: 'Improve facility security', terms: /security|camera|surveillance|theft|access/i },
  { key: 'shipping', label: 'Reduce shipping delays', terms: /ship|freight|transport|delay|carrier|on-?time/i },
  { key: 'replace', label: 'Replace old equipment', terms: /replace|upgrade|new|used|refurbish|modern/i },
  { key: 'compliance', label: 'Meet compliance requirements', terms: /compliance|osha|certif|regulat|audit|fda|iso/i },
];

// ---- The guided selection and matching ----
export interface GuidedSelection {
  operation: Operation | null;
  area: string | null;          // OperationArea.key
  solutionTypes: SolutionType[]; // multi-select
  location: string | null;
  siteNeeds: SiteNeed[];
  goal: string | null;          // Goal.key
}
export const EMPTY_GUIDED: GuidedSelection = {
  operation: null, area: null, solutionTypes: [], location: null, siteNeeds: [], goal: null,
};
export function guidedIsEmpty(g: GuidedSelection): boolean {
  return !g.operation && !g.area && g.solutionTypes.length === 0 && !g.location && g.siteNeeds.length === 0 && !g.goal;
}
export function guidedCount(g: GuidedSelection): number {
  return [g.operation, g.area, g.solutionTypes.length > 0, g.location, g.siteNeeds.length > 0, g.goal].filter(Boolean).length;
}

interface ListingLike {
  kind: 'product' | 'service'; name: string; category: string;
  overview: string | null; best_for: string[]; industries: string[];
  service_areas?: string[]; vendor_city?: string | null; emergency_available?: boolean;
}
function listingText(l: ListingLike): string {
  return `${l.name} ${l.category} ${(l.best_for || []).join(' ')} ${(l.industries || []).join(' ')} ${l.overview || ''}`;
}

/** Does a listing pass the guided selection? Products without service-area
 *  data are matched leniently on location (we don't filter by HQ alone, but
 *  we also never hide a listing for data the vendor can't enter yet). */
export function listingMatchesGuided(l: ListingLike, g: GuidedSelection): boolean {
  const text = listingText(l);
  if (g.operation && g.operation !== 'both') {
    const own = OPERATION_TERMS[g.operation].test((l.industries || []).join(' ') + ' ' + text);
    const other = OPERATION_TERMS[g.operation === 'warehousing' ? 'manufacturing' : 'warehousing'];
    // Only exclude listings that clearly belong to the OTHER operation.
    if (!own && other.test((l.industries || []).join(' '))) return false;
  }
  if (g.area) {
    const area = areasFor(g.operation).find((a) => a.key === g.area);
    if (area && !area.terms.test(text)) return false;
  }
  if (g.solutionTypes.length && !g.solutionTypes.includes(solutionTypeOf(l))) return false;
  if (g.location && g.location !== 'Nationwide') {
    const areas = l.kind === 'service' ? l.service_areas : null;
    if (areas && areas.length) {
      if (!areaMatches(areas, g.location)) return false;
    } else if (l.vendor_city && !areaMatches([l.vendor_city], g.location)) {
      // lenient: unknown coverage passes, contradicting HQ does not
      if (l.kind === 'service') return false;
    }
  }
  if (g.goal) {
    const goal = GOALS.find((x) => x.key === g.goal);
    if (goal && !goal.terms.test(text)) return false;
  }
  return true;
}

// ---- Companies: matching + plain-language "why they match" ----
export interface CompanyLike {
  company_name: string; city: string | null; verified: boolean;
  industries: string[]; service_areas: string[]; categories: string[];
  main_expertise: string[]; problems_solved: string[]; capabilities: string[];
  company_type: string | null; response_time: string | null;
  cross_border: boolean; installation_available: boolean; pilot_available: boolean;
  emergency_available: boolean;
  solution_types: SolutionType[]; // rolled up from published listings
}
function companyText(c: CompanyLike): string {
  return [
    c.industries.join(' '), c.categories.join(' '), c.main_expertise.join(' '),
    c.problems_solved.join(' '), c.capabilities.join(' '),
  ].join(' ');
}

/** Match a company against the guided selection and explain WHY in plain
 *  language. No bare percentages — reasons a buyer can verify. */
export function companyMatch(c: CompanyLike, g: GuidedSelection): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const text = companyText(c);

  if (g.operation && g.operation !== 'both') {
    if (OPERATION_TERMS[g.operation].test(text)) {
      reasons.push(`they work with ${g.operation === 'warehousing' ? 'warehousing & distribution' : 'manufacturing'} operations`);
    } else return { ok: false, reasons: [] };
  }
  if (g.area) {
    const area = areasFor(g.operation).find((a) => a.key === g.area);
    if (area) {
      if (area.terms.test(text)) reasons.push(`they cover ${area.label.toLowerCase()}`);
      else return { ok: false, reasons: [] };
    }
  }
  if (g.solutionTypes.length) {
    const offered = g.solutionTypes.filter((t) => c.solution_types.includes(t));
    if (!offered.length) return { ok: false, reasons: [] };
    reasons.push(`they offer ${offered.map((t) => SOLUTION_TYPES.find((s) => s.key === t)?.label.toLowerCase()).join(' and ')}`);
  }
  if (g.location && g.location !== 'Nationwide') {
    if (areaMatches(c.service_areas, g.location) || (c.city && areaMatches([c.city], g.location))) {
      reasons.push(`they serve ${g.location}`);
    } else return { ok: false, reasons: [] };
  }
  if (g.siteNeeds.includes('onsite')) {
    if (c.installation_available || c.solution_types.includes('service')) reasons.push('they work on-site');
    else return { ok: false, reasons: [] };
  }
  if (g.siteNeeds.includes('crossborder')) {
    if (c.cross_border) reasons.push('they are cross-border capable');
    else return { ok: false, reasons: [] };
  }
  if (g.goal) {
    const goal = GOALS.find((x) => x.key === g.goal);
    if (goal) {
      if (goal.terms.test(text)) reasons.push(`they solve “${goal.label.toLowerCase()}” problems`);
      else return { ok: false, reasons: [] };
    }
  }
  return { ok: true, reasons };
}

export function explainMatch(reasons: string[]): string {
  if (!reasons.length) return '';
  const list = reasons.length > 1 ? `${reasons.slice(0, -1).join(', ')} and ${reasons[reasons.length - 1]}` : reasons[0];
  return `Matches because ${list}.`;
}
