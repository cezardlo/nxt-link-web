// src/lib/agents/agents/product-discovery-agent.ts
// Discovers real products/machines/solutions from intel signals, feeds, and vendor data.
// Extracts product names, companies, use cases, and technology categories.
// Persists to Supabase `products` table for a living catalog.

import { getIntelSignals, type IntelSignalRow } from '@/db/queries/intel-signals';
import { upsertProducts, type ProductInsert } from '@/db/queries/products';
import {
  runProductScanAgent,
  type ProductScanReport,
} from '@/lib/agents/agents/product-scanner-agent';

// ─── Product Extraction Patterns ────────────────────────────────────────────────

const PRODUCT_PATTERNS: Array<{
  re: RegExp;
  type: string;
}> = [
  // "launched/unveiled/introduced [product name]"
  { re: /\b(?:launch|unveil|introduc|releas)\w+\s+(?:the\s+|its\s+|a\s+|new\s+)?([A-Z][A-Za-z0-9]+(?: [A-Z][A-Za-z0-9]+){0,4})/g, type: 'product' },
  // "new [Product Name] system/platform/robot/drone/machine"
  { re: /\bnew\s+([A-Z][A-Za-z0-9]+(?: [A-Z][A-Za-z0-9]+){0,3})\s+(?:system|platform|robot|drone|machine|sensor|device|tool|software|module)/gi, type: 'product' },
  // "[Company] [ProductName] — product with model number"
  { re: /\b([A-Z][A-Za-z]+\s+[A-Z][A-Za-z0-9-]+(?:\s+[A-Z0-9]+)?)\s+(?:robot|drone|sensor|device|machine|system|scanner|printer|camera)/gi, type: 'product' },
  // Autonomous / robotic equipment
  { re: /\b(autonomous\s+[a-z]+(?:\s+[a-z]+)?|robotic\s+[a-z]+(?:\s+[a-z]+)?)\b/gi, type: 'solution' },
  // Software platforms
  { re: /\b([A-Z][A-Za-z]+(?:AI|ML|Cloud|Hub|Suite|Pro|360|OS|Net|Flow|Link|Core))\b/g, type: 'platform' },
];

// ─── Industry Mapping ───────────────────────────────────────────────────────────

const INDUSTRY_FROM_CATEGORY: Record<string, string> = {
  'Robotics & Automation': 'manufacturing',
  'Artificial Intelligence': 'ai_ml',
  'Cybersecurity': 'cybersecurity',
  'Logistics Technology': 'supply_chain',
  'Warehousing': 'supply_chain',
  'Transportation': 'supply_chain',
  'Manufacturing': 'manufacturing',
  'Energy Technology': 'energy',
  'Health Technology': 'health_biotech',
  'Border Technology': 'construction',
  'Water Technology': 'agriculture',
  'Defense Systems': 'aerospace_defense',
  'Defense IT': 'aerospace_defense',
  'IoT': 'manufacturing',
  'FinTech': 'fintech',
  'Construction': 'construction',
  'Engineering': 'construction',
  'Building Systems': 'construction',
};

// ─── Signal-to-Product Extraction ───────────────────────────────────────────────

function extractProductsFromSignals(signals: IntelSignalRow[]): ProductInsert[] {
  const products: ProductInsert[] = [];
  const seen = new Set<string>();

  for (const signal of signals) {
    // Only extract from product_launch, patent_filing, facility_expansion, case_study
    if (!['product_launch', 'patent_filing', 'facility_expansion', 'case_study'].includes(signal.signal_type)) {
      continue;
    }

    const text = `${signal.title} ${signal.evidence ?? ''}`;

    for (const { re, type } of PRODUCT_PATTERNS) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        const name = match[1]?.trim();
        if (!name || name.length < 3 || name.length > 80) continue;

        const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) continue;
        seen.add(key);

        const id = `prod-sig-${hashCode(name + signal.source)}`;

        products.push({
          id,
          product_name: name,
          company: signal.company ?? null,
          industry: signal.industry,
          category: null,
          technology: null,
          product_type: type,
          description: signal.title,
          use_cases: [],
          confidence: signal.confidence * 0.8,
          source: `intel-signal:${signal.signal_type}`,
          source_url: signal.url ?? null,
          tags: signal.tags,
        });
      }
    }
  }

  return products;
}

// ─── Vendor-to-Product Extraction ───────────────────────────────────────────────

function extractProductsFromVendorScan(report: ProductScanReport): ProductInsert[] {
  const products: ProductInsert[] = [];

  for (const vendor of report.vendors) {
    for (const p of vendor.products) {
      const id = `prod-vendor-${hashCode(vendor.vendorId + p.name)}`;
      const industry = INDUSTRY_FROM_CATEGORY[p.category] ?? 'general';

      products.push({
        id,
        product_name: p.name,
        company: vendor.vendorName,
        industry,
        category: p.category,
        technology: null,
        product_type: p.type,
        description: p.description,
        use_cases: [],
        maturity: p.maturity,
        confidence: p.confidence,
        source: `vendor-scan:${p.source}`,
        source_url: null,
        tags: [],
      });
    }
  }

  return products;
}

// ─── Main Runner ────────────────────────────────────────────────────────────────

export type ProductDiscoveryResult = {
  from_signals: number;
  from_vendors: number;
  total_discovered: number;
  persisted: number;
  duration_ms: number;
};

/** Run product discovery: extract from signals + vendors, persist to Supabase */
export async function runProductDiscoveryAgent(): Promise<ProductDiscoveryResult> {
  const startMs = Date.now();

  // 1. Extract from recent intel signals (last 7 days)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const signals = await getIntelSignals({ since, limit: 500 });
  const signalProducts = extractProductsFromSignals(signals);

  // 2. Extract from vendor product scan
  const vendorReport = await runProductScanAgent();
  const vendorProducts = extractProductsFromVendorScan(vendorReport);

  // 3. Merge and persist
  const allProducts = [...signalProducts, ...vendorProducts];
  const persisted = await upsertProducts(allProducts);

  const result: ProductDiscoveryResult = {
    from_signals: signalProducts.length,
    from_vendors: vendorProducts.length,
    total_discovered: allProducts.length,
    persisted,
    duration_ms: Date.now() - startMs,
  };

  if (persisted > 0) {
    console.log(`[product-discovery] Persisted ${persisted} products (${signalProducts.length} from signals, ${vendorProducts.length} from vendors)`);
  }

  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function hashCode(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
