// src/lib/agents/agents/product-scanner-agent.ts
// Product & Solution Scanner Agent — deterministic extraction of what each
// vendor actually sells, from tags, evidence, description, and category.
// No LLM calls, no external HTTP. Runs in ~100ms.

import { EL_PASO_VENDORS, type VendorRecord } from '@/lib/data/el-paso-vendors';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProductInfo = {
  name: string;
  type: 'product' | 'solution' | 'service' | 'platform';
  category: string;
  description: string;
  maturity: 'established' | 'growing' | 'emerging' | 'concept';
  confidence: number; // 0-1
  source: 'tags' | 'evidence' | 'description' | 'inferred';
};

export type VendorProducts = {
  vendorId: string;
  vendorName: string;
  category: string;
  products: ProductInfo[];
  totalProducts: number;
  topCapability: string;
};

export type ProductScanReport = {
  as_of: string;
  duration_ms: number;
  vendors_scanned: number;
  total_products_found: number;
  vendors_with_products: number;
  vendors: VendorProducts[];
};

// ─── Cache ───────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedReport: ProductScanReport | null = null;
let reportExpiresAt = 0;
let inFlightRun: Promise<ProductScanReport> | null = null;

export function getCachedProductScan(): ProductScanReport | null {
  if (cachedReport && Date.now() < reportExpiresAt) return cachedReport;
  return null;
}

function setCachedProductScan(report: ProductScanReport): void {
  cachedReport = report;
  reportExpiresAt = Date.now() + CACHE_TTL_MS;
}

// ─── Tag → Product mappings ───────────────────────────────────────────────────

type TagMapping = {
  keywords: string[];
  name: string;
  type: 'product' | 'solution' | 'service' | 'platform';
  category: string;
};

const TAG_MAPPINGS: TagMapping[] = [
  { keywords: ['c4isr', 'c5isr'],             name: 'C4ISR Systems',              type: 'solution',  category: 'Command & Control' },
  { keywords: ['isr'],                         name: 'ISR Platform',               type: 'platform',  category: 'Intelligence, Surveillance & Reconnaissance' },
  { keywords: ['sigint'],                      name: 'SIGINT Processing System',   type: 'solution',  category: 'Signals Intelligence' },
  { keywords: ['electronic warfare', 'ew'],   name: 'Electronic Warfare Suite',   type: 'solution',  category: 'Electronic Warfare' },
  { keywords: ['radar'],                       name: 'Radar Platform',             type: 'product',   category: 'Sensing & Detection' },
  { keywords: ['missiles', 'patriot', 'thaad', 'himars', 'pac-3'],
                                               name: 'Missile System',             type: 'product',   category: 'Weapons & Munitions' },
  { keywords: ['ibcs'],                        name: 'IBCS Command System',        type: 'solution',  category: 'Command & Control' },
  { keywords: ['air defense'],                 name: 'Air Defense System',         type: 'solution',  category: 'Air & Missile Defense' },
  { keywords: ['armored vehicles', 'm1 abrams', 'bradley ifv'],
                                               name: 'Armored Vehicle Systems',    type: 'product',   category: 'Ground Combat Vehicles' },
  { keywords: ['rotary wing', 'aviation', 'chinook', 'apache'],
                                               name: 'Aviation Sustainment',       type: 'service',   category: 'Aviation' },
  { keywords: ['soldier systems'],             name: 'Soldier-Worn Equipment',     type: 'product',   category: 'Individual Equipment' },
  { keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml'],
                                               name: 'AI/ML Platform',             type: 'platform',  category: 'Artificial Intelligence' },
  { keywords: ['computer vision'],             name: 'Computer Vision System',     type: 'platform',  category: 'Artificial Intelligence' },
  { keywords: ['deep learning', 'neural'],     name: 'Deep Learning Platform',     type: 'platform',  category: 'Artificial Intelligence' },
  { keywords: ['aip', 'gotham', 'palantir'],   name: 'Intelligence Analytics Platform', type: 'platform', category: 'Data Analytics' },
  { keywords: ['analytics', 'predictive'],     name: 'Analytics Platform',         type: 'platform',  category: 'Data Analytics' },
  { keywords: ['cybersecurity', 'cyber'],      name: 'Cybersecurity Platform',     type: 'platform',  category: 'Cybersecurity' },
  { keywords: ['edr', 'endpoint protection'],  name: 'Endpoint Detection & Response', type: 'product', category: 'Cybersecurity' },
  { keywords: ['threat intelligence'],         name: 'Threat Intelligence Feed',   type: 'service',   category: 'Cybersecurity' },
  { keywords: ['zero trust'],                  name: 'Zero Trust Network Access',  type: 'solution',  category: 'Network Security' },
  { keywords: ['ot security', 'ics/scada', 'ics', 'scada'],
                                               name: 'OT/ICS Security',            type: 'service',   category: 'Operational Technology Security' },
  { keywords: ['red team'],                    name: 'Red Team Assessment',        type: 'service',   category: 'Cybersecurity' },
  { keywords: ['network security', 'network ops'],
                                               name: 'Network Security Operations', type: 'service',  category: 'Network Security' },
  { keywords: ['cloud', 'deos'],               name: 'Cloud Migration Services',   type: 'service',   category: 'Cloud Computing' },
  { keywords: ['enterprise it', 'helpdesk'],   name: 'Enterprise IT Services',     type: 'service',   category: 'IT Services' },
  { keywords: ['digital transformation'],      name: 'Digital Transformation',     type: 'service',   category: 'IT Services' },
  { keywords: ['sap', 'erp'],                  name: 'ERP Implementation',         type: 'service',   category: 'Enterprise Software' },
  { keywords: ['logistics systems', 'gcss-army'],
                                               name: 'Logistics Information System', type: 'platform', category: 'Logistics Technology' },
  { keywords: ['logistics', 'supply chain'],   name: 'Supply Chain Platform',      type: 'platform',  category: 'Logistics Technology' },
  { keywords: ['distribution', 'freight'],     name: 'Distribution & Freight',     type: 'service',   category: 'Logistics' },
  { keywords: ['warehousing', 'warehouse'],    name: 'Warehouse Management System', type: 'platform', category: 'Warehousing' },
  { keywords: ['trucking', 'fleet'],           name: 'Fleet Management',           type: 'service',   category: 'Transportation' },
  { keywords: ['base operations', 'logcap', 'facilities management'],
                                               name: 'Base Operations Support',    type: 'service',   category: 'Facilities & Operations' },
  { keywords: ['health it', 'health tech'],    name: 'Health IT Platform',         type: 'platform',  category: 'Health Technology' },
  { keywords: ['financial management', 'audit'],
                                               name: 'Financial Management Services', type: 'service', category: 'Finance & Audit' },
  { keywords: ['border tech', 'cross-border'], name: 'Border Technology Solution', type: 'solution',  category: 'Border Technology' },
  { keywords: ['water tech'],                  name: 'Water Management System',    type: 'solution',  category: 'Water Technology' },
  { keywords: ['energy', 'solar', 'renewable'], name: 'Energy Platform',           type: 'solution',  category: 'Energy Technology' },
  { keywords: ['manufacturing', 'fabrication'], name: 'Manufacturing System',      type: 'solution',  category: 'Manufacturing' },
  { keywords: ['robotics', 'autonomous', 'drone', 'uas', 'unmanned'],
                                               name: 'Robotic Systems',            type: 'product',   category: 'Robotics & Automation' },
  { keywords: ['iot', 'sensor fusion', 'digital twin'],
                                               name: 'IoT Platform',               type: 'platform',  category: 'IoT' },
  { keywords: ['strategy', 'consulting'],      name: 'Advisory Services',          type: 'service',   category: 'Consulting' },
  { keywords: ['construction'],                name: 'Construction Services',      type: 'service',   category: 'Construction' },
  { keywords: ['engineering'],                 name: 'Engineering Services',       type: 'service',   category: 'Engineering' },
  { keywords: ['fintech', 'payments'],         name: 'Financial Technology Platform', type: 'platform', category: 'FinTech' },
  { keywords: ['hvac'],                        name: 'HVAC Systems',               type: 'product',   category: 'Building Systems' },
];

// ─── Category → inferred capabilities ────────────────────────────────────────

type CategoryCapability = {
  name: string;
  type: 'product' | 'solution' | 'service' | 'platform';
  category: string;
};

const CATEGORY_CAPABILITIES: Record<string, CategoryCapability[]> = {
  'Defense': [
    { name: 'Defense Systems Integration', type: 'solution',  category: 'Defense Systems' },
    { name: 'Military Hardware Support',    type: 'service',   category: 'Defense Systems' },
  ],
  'Defense IT': [
    { name: 'Defense IT Infrastructure',   type: 'service',   category: 'Defense IT' },
    { name: 'Military Software Systems',   type: 'platform',  category: 'Defense IT' },
  ],
  'Cybersecurity': [
    { name: 'Security Platform',           type: 'platform',  category: 'Cybersecurity' },
    { name: 'Threat Detection',            type: 'solution',  category: 'Cybersecurity' },
  ],
  'Consulting': [
    { name: 'Management Consulting',       type: 'service',   category: 'Consulting' },
    { name: 'Technology Advisory',         type: 'service',   category: 'Consulting' },
  ],
  'Logistics': [
    { name: 'Transportation Management System', type: 'platform', category: 'Logistics Technology' },
    { name: 'Warehouse Management System', type: 'platform',  category: 'Warehousing' },
    { name: 'Freight & Tracking',          type: 'service',   category: 'Logistics' },
  ],
  'Warehousing': [
    { name: 'Warehouse Management System', type: 'platform',  category: 'Warehousing' },
    { name: 'Inventory Control',           type: 'service',   category: 'Warehousing' },
  ],
  'Trucking': [
    { name: 'Fleet Management',            type: 'service',   category: 'Transportation' },
    { name: 'Freight Brokerage',           type: 'service',   category: 'Transportation' },
  ],
  'Manufacturing': [
    { name: 'Production Systems',          type: 'solution',  category: 'Manufacturing' },
    { name: 'Automation Equipment',        type: 'product',   category: 'Manufacturing' },
  ],
  'Fabrication': [
    { name: 'Metal Fabrication',           type: 'service',   category: 'Manufacturing' },
    { name: 'Custom Parts Production',     type: 'service',   category: 'Manufacturing' },
  ],
  'Robotics': [
    { name: 'Robotic Systems',             type: 'product',   category: 'Robotics & Automation' },
    { name: 'Automation Platform',         type: 'platform',  category: 'Robotics & Automation' },
  ],
  'AI / ML': [
    { name: 'AI/ML Platform',             type: 'platform',  category: 'Artificial Intelligence' },
    { name: 'Machine Learning Services',  type: 'service',   category: 'Artificial Intelligence' },
  ],
  'Border Tech': [
    { name: 'Border Management Solution', type: 'solution',  category: 'Border Technology' },
    { name: 'Cross-Border Data System',   type: 'platform',  category: 'Border Technology' },
  ],
  'Water Tech': [
    { name: 'Water Treatment System',     type: 'solution',  category: 'Water Technology' },
    { name: 'Water Analytics Platform',   type: 'platform',  category: 'Water Technology' },
  ],
  'Energy': [
    { name: 'Energy Management System',   type: 'solution',  category: 'Energy Technology' },
    { name: 'Renewable Energy Platform',  type: 'platform',  category: 'Energy Technology' },
  ],
  'Health Tech': [
    { name: 'Health IT Platform',         type: 'platform',  category: 'Health Technology' },
    { name: 'Clinical Data System',       type: 'solution',  category: 'Health Technology' },
  ],
  'IoT': [
    { name: 'IoT Platform',               type: 'platform',  category: 'IoT' },
    { name: 'Sensor Network',             type: 'product',   category: 'IoT' },
  ],
  'Analytics': [
    { name: 'Analytics Platform',         type: 'platform',  category: 'Data Analytics' },
    { name: 'Business Intelligence',      type: 'solution',  category: 'Data Analytics' },
  ],
  'Enterprise IT': [
    { name: 'Enterprise IT Services',     type: 'service',   category: 'IT Services' },
    { name: 'Infrastructure Management',  type: 'service',   category: 'IT Services' },
  ],
  'FinTech': [
    { name: 'Financial Technology Platform', type: 'platform', category: 'FinTech' },
    { name: 'Payment Processing',          type: 'service',   category: 'FinTech' },
  ],
  'Engineering': [
    { name: 'Engineering Design Services', type: 'service',  category: 'Engineering' },
    { name: 'Systems Engineering',         type: 'service',  category: 'Engineering' },
  ],
  'HVAC': [
    { name: 'HVAC Systems',               type: 'product',   category: 'Building Systems' },
    { name: 'Climate Control Services',   type: 'service',   category: 'Building Systems' },
  ],
  'Construction': [
    { name: 'Construction Services',      type: 'service',   category: 'Construction' },
    { name: 'Project Management',         type: 'service',   category: 'Construction' },
  ],
  'Government': [
    { name: 'Government Services',        type: 'service',   category: 'Government' },
    { name: 'Public Administration',      type: 'service',   category: 'Government' },
  ],
  'Economic Development': [
    { name: 'Economic Development Programs', type: 'service', category: 'Government' },
    { name: 'Business Incentives',         type: 'service',   category: 'Government' },
  ],
  'Education': [
    { name: 'Educational Programs',       type: 'service',   category: 'Education' },
    { name: 'Workforce Training',         type: 'service',   category: 'Education' },
  ],
};

// ─── Regex patterns for evidence extraction ───────────────────────────────────

const EVIDENCE_PATTERNS: RegExp[] = [
  /(?:produces?|manufactures?|offers?|provides?|sells?|deploys?|builds?)\s+(.+?)(?:\.|,|$)/i,
  /(?:contract for|awarded for|\$[\d.]+[MBK]?\s+(?:for|in))\s+(.+?)(?:\.|,|$)/i,
  /(?:platform|system|solution|software|hardware|device|sensor|tool)\s+(?:for|called|named)\s+(.+?)(?:\.|,|$)/i,
];

// ─── Maturity inference ───────────────────────────────────────────────────────

function inferMaturity(vendor: VendorRecord): 'established' | 'growing' | 'emerging' | 'concept' {
  const iker = vendor.ikerScore;
  const w = vendor.weight;
  if (iker >= 80 && w >= 0.8) return 'established';
  if (iker >= 65) return 'growing';
  if (iker >= 50) return 'emerging';
  return 'concept';
}

// ─── Deduplication helper ─────────────────────────────────────────────────────

function normalizeProductName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ─── topCapability derivation ─────────────────────────────────────────────────

function deriveTopCapability(vendor: VendorRecord, products: ProductInfo[]): string {
  // Prefer the highest-confidence product name
  const sorted = [...products].sort((a, b) => b.confidence - a.confidence);
  if (sorted.length > 0) return sorted[0].name;
  // Fall back to the first sentence of the description
  const firstSentence = vendor.description.split('.')[0].trim();
  return firstSentence.length > 80 ? firstSentence.slice(0, 77) + '...' : firstSentence;
}

// ─── Per-vendor scanning ──────────────────────────────────────────────────────

function scanVendor(vendor: VendorRecord): VendorProducts {
  const seen = new Set<string>();
  const products: ProductInfo[] = [];
  const maturity = inferMaturity(vendor);

  function addProduct(p: ProductInfo): void {
    const key = normalizeProductName(p.name);
    if (seen.has(key)) return;
    seen.add(key);
    products.push(p);
  }

  // 1. From tags
  const tagsLower = vendor.tags.map(t => t.toLowerCase());
  for (const mapping of TAG_MAPPINGS) {
    const matched = mapping.keywords.some(kw => tagsLower.some(t => t.includes(kw)));
    if (matched) {
      addProduct({
        name: mapping.name,
        type: mapping.type,
        category: mapping.category,
        description: `Extracted from vendor tags: ${vendor.tags.join(', ')}`,
        maturity,
        confidence: 0.85,
        source: 'tags',
      });
    }
  }

  // 2. From evidence regex extraction
  for (const ev of vendor.evidence) {
    for (const pattern of EVIDENCE_PATTERNS) {
      const match = pattern.exec(ev);
      if (match && match[1]) {
        const raw = match[1].trim().replace(/\s+/g, ' ');
        if (raw.length < 5 || raw.length > 80) continue;
        // Capitalise first letter
        const name = raw.charAt(0).toUpperCase() + raw.slice(1);
        addProduct({
          name,
          type: 'solution',
          category: vendor.category,
          description: `Extracted from evidence: "${ev}"`,
          maturity,
          confidence: 0.65,
          source: 'evidence',
        });
      }
    }
  }

  // 3. From description — split on comma/and and match keywords
  const descLower = vendor.description.toLowerCase();
  const descParts = vendor.description.split(/,|(?:\band\b)/i);
  for (const mapping of TAG_MAPPINGS) {
    const matchedInDesc = mapping.keywords.some(kw => descLower.includes(kw));
    if (!matchedInDesc) continue;
    // Find the phrase fragment in description that best captures it
    const fragment = descParts.find(p =>
      mapping.keywords.some(kw => p.toLowerCase().includes(kw)),
    );
    const descriptionText = fragment
      ? `From description: "${fragment.trim().slice(0, 100)}"`
      : `Inferred from description keyword match`;
    addProduct({
      name: mapping.name,
      type: mapping.type,
      category: mapping.category,
      description: descriptionText,
      maturity,
      confidence: 0.60,
      source: 'description',
    });
  }

  // 4. From category — always add inferred baselines not already covered
  const categoryCaps = CATEGORY_CAPABILITIES[vendor.category] ?? [];
  for (const cap of categoryCaps) {
    addProduct({
      name: cap.name,
      type: cap.type,
      category: cap.category,
      description: `Inferred from vendor category: ${vendor.category}`,
      maturity,
      confidence: 0.45,
      source: 'inferred',
    });
  }

  // Sort: highest confidence first
  products.sort((a, b) => b.confidence - a.confidence);

  const topCapability = deriveTopCapability(vendor, products);

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    category: vendor.category,
    products,
    totalProducts: products.length,
    topCapability,
  };
}

// ─── Main orchestration ───────────────────────────────────────────────────────

async function doRunProductScanAgent(): Promise<ProductScanReport> {
  const t0 = Date.now();

  const vendors = Object.values(EL_PASO_VENDORS);
  const vendorResults: VendorProducts[] = vendors.map(v => scanVendor(v));

  const totalProducts = vendorResults.reduce((acc, v) => acc + v.totalProducts, 0);
  const vendorsWithProducts = vendorResults.filter(v => v.totalProducts > 0).length;

  const report: ProductScanReport = {
    as_of: new Date().toISOString(),
    duration_ms: Date.now() - t0,
    vendors_scanned: vendors.length,
    total_products_found: totalProducts,
    vendors_with_products: vendorsWithProducts,
    vendors: vendorResults,
  };

  setCachedProductScan(report);
  return report;
}

export async function runProductScanAgent(): Promise<ProductScanReport> {
  if (inFlightRun) return inFlightRun;
  inFlightRun = doRunProductScanAgent().finally(() => { inFlightRun = null; });
  return inFlightRun;
}
