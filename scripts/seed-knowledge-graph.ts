// scripts/seed-knowledge-graph.ts
// Populates the knowledge graph from existing static data.
//
// Seeds:
//   - 8 core industries  → industry entities
//   - 45 technologies    → technology entities
//   - 14 product classes → product entities (derived from connection-engine mappings)
//   - 208 vendors        → company entities
//
// Relationships seeded:
//   - technology  BELONGS_TO  industry
//   - company     BELONGS_TO  industry  (vendor → industry)
//   - company     USES        technology (tag matching)
//   - product     USES        technology (product → underlying tech)
//   - product     BELONGS_TO  industry  (product → applicable industry)
//   - company     SUPPLIES    product   (vendor → product, by category match)
//
// Usage:
//   npx tsx scripts/seed-knowledge-graph.ts
//
// Safe to re-run (upserts by slug, relationships deduplicate).

import { isSupabaseConfigured } from '../src/db/client';
import { upsertEntity, addRelationship } from '../src/db/queries/knowledge-graph';
import { TECHNOLOGY_CATALOG, INDUSTRIES } from '../src/lib/data/technology-catalog';
import { EL_PASO_VENDORS } from '../src/lib/data/el-paso-vendors';

// ─── Product catalog (derived from connection-engine TECH_MAPPINGS) ─────────────
// Each product links to a technology name and one or more industry slugs.

type ProductSeed = {
  name: string;
  slug: string;
  description: string;
  costRange: string;
  maturity: 'emerging' | 'growing' | 'mature';
  techName: string;           // Must match an entry in TECHNOLOGY_CATALOG.name (case-insensitive)
  industrySlugsFallback: string[];  // Fallback slugs if tech→industry lookup fails
  vendorCategoryKeywords: string[]; // Category/tag keywords to match vendors as suppliers
};

const PRODUCT_SEEDS: ProductSeed[] = [
  // ── Computer Vision
  {
    name: 'AI Vision Analytics Platform',
    slug: 'product-ai-vision-analytics',
    description: 'Enterprise computer vision system for real-time video analysis, object detection, and anomaly identification across surveillance and quality-inspection use cases.',
    costRange: '$150K–$800K',
    maturity: 'mature',
    techName: 'Computer Vision',
    industrySlugsFallback: ['defense', 'manufacturing', 'logistics'],
    vendorCategoryKeywords: ['defense', 'ai/ml', 'border tech'],
  },
  {
    name: 'Edge Camera AI System',
    slug: 'product-edge-camera-ai',
    description: 'On-device AI inference for surveillance cameras in bandwidth-constrained or denied environments. No cloud dependency.',
    costRange: '$25K–$120K per node',
    maturity: 'growing',
    techName: 'Edge AI / Tactical AI',
    industrySlugsFallback: ['defense'],
    vendorCategoryKeywords: ['defense', 'defense it'],
  },

  // ── Generative AI
  {
    name: 'AI Document Intelligence Suite',
    slug: 'product-ai-document-intelligence',
    description: 'LLM-powered platform for extracting, summarizing, and routing government documents, contracts, and intelligence reports.',
    costRange: '$60K–$400K',
    maturity: 'growing',
    techName: 'Generative AI',
    industrySlugsFallback: ['ai-ml', 'defense'],
    vendorCategoryKeywords: ['ai/ml', 'consulting', 'defense it'],
  },
  {
    name: 'Conversational AI Copilot',
    slug: 'product-conversational-ai-copilot',
    description: 'Bilingual (English/Spanish) AI assistant for government service delivery, clinical documentation, and analyst workflows.',
    costRange: '$20K–$180K/yr',
    maturity: 'growing',
    techName: 'Natural Language Processing (NLP)',
    industrySlugsFallback: ['ai-ml', 'healthcare'],
    vendorCategoryKeywords: ['ai/ml', 'healthcare it'],
  },

  // ── Counter-UAS / Drone
  {
    name: 'Counter-UAS Detection System',
    slug: 'product-counter-uas',
    description: 'Multi-sensor (RF, radar, acoustic, optical) system that detects, identifies, and tracks unauthorized UAS threats around military installations and critical infrastructure.',
    costRange: '$500K–$5M',
    maturity: 'growing',
    techName: 'Counter-UAS / Drone Defense',
    industrySlugsFallback: ['defense'],
    vendorCategoryKeywords: ['defense', 'radar'],
  },
  {
    name: 'Tactical ISR Drone Package',
    slug: 'product-isr-drone',
    description: 'Small unmanned aerial system optimized for intelligence, surveillance, and reconnaissance at the company and platoon level.',
    costRange: '$80K–$600K',
    maturity: 'growing',
    techName: 'Computer Vision',
    industrySlugsFallback: ['defense'],
    vendorCategoryKeywords: ['defense', 'aviation'],
  },

  // ── Renewable Energy
  {
    name: 'Tactical Microgrid System',
    slug: 'product-tactical-microgrid',
    description: 'Deployable solar + battery microgrid providing resilient power to military installations, forward operating bases, or critical facilities.',
    costRange: '$800K–$8M',
    maturity: 'growing',
    techName: 'Microgrid / Energy Storage',
    industrySlugsFallback: ['energy', 'defense'],
    vendorCategoryKeywords: ['energy', 'construction'],
  },
  {
    name: 'Battery Energy Storage System (BESS)',
    slug: 'product-bess',
    description: 'Grid-scale or facility-level lithium-ion or flow battery array for renewable integration, demand response, and backup power.',
    costRange: '$500K–$10M',
    maturity: 'growing',
    techName: 'Energy Storage',
    industrySlugsFallback: ['energy'],
    vendorCategoryKeywords: ['energy'],
  },

  // ── Robotics
  {
    name: 'Collaborative Robot (Cobot)',
    slug: 'product-cobot',
    description: 'Safe, human-adjacent industrial robot for assembly, welding, pick-and-place, and inspection tasks in manufacturing environments.',
    costRange: '$35K–$150K',
    maturity: 'growing',
    techName: 'Industrial Robotics / Automation',
    industrySlugsFallback: ['manufacturing'],
    vendorCategoryKeywords: ['manufacturing', 'automation'],
  },
  {
    name: 'Automated Guided Vehicle (AGV)',
    slug: 'product-agv',
    description: 'Autonomous mobile robot for intralogistics: moving pallets, kits, and goods within warehouses and distribution centers without human intervention.',
    costRange: '$50K–$250K',
    maturity: 'mature',
    techName: 'Industrial Robotics / Automation',
    industrySlugsFallback: ['logistics', 'manufacturing'],
    vendorCategoryKeywords: ['logistics', 'supply chain', 'manufacturing'],
  },

  // ── Cybersecurity
  {
    name: 'Zero Trust Network Access Platform',
    slug: 'product-zero-trust-nac',
    description: 'Identity-centric security platform that enforces continuous verification before granting access to any network resource — critical for CMMC compliance.',
    costRange: '$100K–$1.2M/yr',
    maturity: 'mature',
    techName: 'Zero Trust Architecture',
    industrySlugsFallback: ['cybersecurity', 'defense'],
    vendorCategoryKeywords: ['cybersecurity', 'defense it', 'consulting'],
  },
  {
    name: 'CMMC Compliance Toolkit',
    slug: 'product-cmmc-toolkit',
    description: 'End-to-end assessment, gap analysis, and remediation platform helping DoD contractors achieve CMMC Level 2 and Level 3 certification.',
    costRange: '$40K–$300K',
    maturity: 'mature',
    techName: 'Cybersecurity Compliance',
    industrySlugsFallback: ['cybersecurity', 'defense'],
    vendorCategoryKeywords: ['cybersecurity', 'consulting'],
  },

  // ── Supply Chain / Logistics
  {
    name: 'Warehouse Management System (WMS)',
    slug: 'product-wms',
    description: 'Real-time inventory, order fulfillment, and labor management platform for distribution centers and military depots.',
    costRange: '$80K–$600K',
    maturity: 'mature',
    techName: 'Warehouse Automation',
    industrySlugsFallback: ['logistics'],
    vendorCategoryKeywords: ['logistics', 'supply chain'],
  },
  {
    name: 'Cold Chain Monitoring Platform',
    slug: 'product-cold-chain',
    description: 'IoT sensor network and analytics dashboard ensuring temperature-controlled integrity for pharmaceuticals, biologics, and food across cross-border supply chains.',
    costRange: '$30K–$200K',
    maturity: 'growing',
    techName: 'IoT Sensors / Smart Logistics',
    industrySlugsFallback: ['logistics', 'healthcare'],
    vendorCategoryKeywords: ['logistics', 'healthcare'],
  },

  // ── Healthcare
  {
    name: 'AI-Powered Diagnostic Imaging',
    slug: 'product-ai-diagnostics',
    description: 'Computer vision + ML system that analyzes radiology images (X-ray, CT, MRI) to flag findings, prioritize worklists, and reduce radiologist read times.',
    costRange: '$200K–$1.5M',
    maturity: 'growing',
    techName: 'Computer Vision',
    industrySlugsFallback: ['healthcare'],
    vendorCategoryKeywords: ['healthcare', 'health it'],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── Main seed ──────────────────────────────────────────────────────────────────

async function seed() {
  console.log('=== NXT LINK — Knowledge Graph Seed ===\n');

  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  let entitiesCreated = 0;
  let relationshipsCreated = 0;

  // ── 1. Industries ────────────────────────────────────────────────────────────

  console.log('Seeding industries...');
  const industryIdMap = new Map<string, string>();

  for (const ind of INDUSTRIES) {
    const id = await upsertEntity({
      entity_type: 'industry',
      name: ind.label,
      slug: ind.slug,
      description: `${ind.label} industry sector`,
      metadata: { color: ind.color, is_core: true },
    });
    if (id) {
      industryIdMap.set(ind.slug, id);
      entitiesCreated++;
    }
  }

  // Ensure extra industry slugs referenced by products exist
  const extraIndustries: Array<{ slug: string; label: string }> = [
    { slug: 'border-security', label: 'Border Security' },
    { slug: 'construction', label: 'Construction' },
    { slug: 'agriculture', label: 'Agriculture' },
    { slug: 'fintech', label: 'Fintech' },
  ];
  for (const ei of extraIndustries) {
    if (!industryIdMap.has(ei.slug)) {
      const id = await upsertEntity({
        entity_type: 'industry',
        name: ei.label,
        slug: ei.slug,
        description: `${ei.label} industry sector`,
        metadata: { is_core: false },
      });
      if (id) {
        industryIdMap.set(ei.slug, id);
        entitiesCreated++;
      }
    }
  }

  console.log(`  → ${industryIdMap.size} industries seeded`);

  // ── 2. Technologies ──────────────────────────────────────────────────────────

  console.log('Seeding technologies...');
  const techIdMap = new Map<string, string>(); // lower-cased name → id

  const catToIndustry: Record<string, string> = {
    'AI/ML': 'ai-ml',
    'Cybersecurity': 'cybersecurity',
    'Defense': 'defense',
    'Border Tech': 'defense',
    'Manufacturing': 'manufacturing',
    'Energy': 'energy',
    'Healthcare': 'healthcare',
    'Logistics': 'logistics',
  };

  for (const tech of TECHNOLOGY_CATALOG) {
    const slug = tech.id.replace(/^tech-/, '');
    const id = await upsertEntity({
      entity_type: 'technology',
      name: tech.name,
      slug,
      description: tech.description.slice(0, 500),
      metadata: {
        category: tech.category,
        maturity: tech.maturityLevel,
        vendor_count: tech.relatedVendorCount,
        el_paso_relevance: tech.elPasoRelevance,
      },
    });
    if (id) {
      techIdMap.set(tech.name.toLowerCase(), id);
      entitiesCreated++;

      const industrySlug = catToIndustry[tech.category];
      const industryId = industrySlug ? industryIdMap.get(industrySlug) : undefined;
      if (industryId) {
        const relId = await addRelationship(id, industryId, 'belongs_to', 0.9, 'seed-script');
        if (relId) relationshipsCreated++;
      }
    }
  }
  console.log(`  → ${techIdMap.size} technologies seeded`);

  // ── 3. Products ──────────────────────────────────────────────────────────────

  console.log('Seeding product entities...');
  const productIdMap = new Map<string, string>(); // slug → id
  let productCount = 0;

  for (const prod of PRODUCT_SEEDS) {
    const id = await upsertEntity({
      entity_type: 'product',
      name: prod.name,
      slug: prod.slug,
      description: prod.description,
      metadata: {
        cost_range: prod.costRange,
        maturity: prod.maturity,
      },
    });

    if (id) {
      productIdMap.set(prod.slug, id);
      productCount++;
      entitiesCreated++;

      // Product USES technology
      const techId = techIdMap.get(prod.techName.toLowerCase());
      if (techId) {
        const relId = await addRelationship(id, techId, 'uses', 0.85, 'seed-script');
        if (relId) relationshipsCreated++;
      }

      // Product BELONGS_TO each fallback industry
      for (const indSlug of prod.industrySlugsFallback) {
        const indId = industryIdMap.get(indSlug);
        if (indId) {
          const relId = await addRelationship(id, indId, 'belongs_to', 0.8, 'seed-script');
          if (relId) relationshipsCreated++;
        }
      }
    }
  }
  console.log(`  → ${productCount} products seeded`);

  // ── 4. Vendors (Companies) ───────────────────────────────────────────────────

  console.log('Seeding vendors as company entities...');
  let vendorCount = 0;

  const vendorCatToIndustry: Record<string, string> = {
    'Defense': 'defense',
    'Defense IT': 'defense',
    'Cybersecurity': 'cybersecurity',
    'AI/ML': 'ai-ml',
    'Healthcare': 'healthcare',
    'Healthcare IT': 'healthcare',
    'Manufacturing': 'manufacturing',
    'Energy': 'energy',
    'Logistics': 'logistics',
    'Supply Chain': 'logistics',
    'Border Tech': 'defense',
    'Construction': 'construction',
    'Agriculture': 'agriculture',
    'Fintech': 'fintech',
    'Consulting': 'defense', // most consultants here are DoD-focused
  };

  for (const [vendorId, vendor] of Object.entries(EL_PASO_VENDORS)) {
    const slug = vendorId;
    const id = await upsertEntity({
      entity_type: 'company',
      name: vendor.name,
      slug,
      description: vendor.description.slice(0, 500),
      metadata: {
        website: vendor.website,
        iker_score: vendor.ikerScore,
        lat: vendor.lat,
        lon: vendor.lon,
        confidence: vendor.confidence,
      },
    });

    if (id) {
      vendorCount++;
      entitiesCreated++;

      // Company BELONGS_TO industry
      const industrySlug = vendorCatToIndustry[vendor.category];
      const industryId = industrySlug ? industryIdMap.get(industrySlug) : undefined;
      if (industryId) {
        const relId = await addRelationship(id, industryId, 'belongs_to', vendor.confidence, 'seed-script');
        if (relId) relationshipsCreated++;
      }

      // Company USES technology (match tags against tech names)
      for (const tag of vendor.tags) {
        const techId = techIdMap.get(tag.toLowerCase());
        if (techId) {
          const relId = await addRelationship(id, techId, 'uses', 0.7, 'seed-script');
          if (relId) relationshipsCreated++;
        }
      }

      // Company SUPPLIES product (match vendor category/tags against product vendor keywords)
      const vendorTerms = new Set<string>([
        vendor.category.toLowerCase(),
        ...vendor.tags.map((t) => t.toLowerCase()),
      ]);

      for (const prod of PRODUCT_SEEDS) {
        const prodSlug = prod.slug;
        const prodId = productIdMap.get(prodSlug);
        if (!prodId) continue;

        const hasMatch = prod.vendorCategoryKeywords.some((kw) => {
          const kwLower = kw.toLowerCase();
          return (
            vendorTerms.has(kwLower) ||
            Array.from(vendorTerms).some((t) => t.includes(kwLower) || kwLower.includes(t))
          );
        });

        if (hasMatch) {
          const relId = await addRelationship(id, prodId, 'supplies', 0.65, 'seed-script');
          if (relId) relationshipsCreated++;
        }
      }
    }
  }
  console.log(`  → ${vendorCount} vendors seeded`);

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log(`\n=== Seed Complete ===`);
  console.log(`  Entities created/updated : ${entitiesCreated}`);
  console.log(`  Relationships created    : ${relationshipsCreated}`);
  console.log(`\n  Entity breakdown:`);
  console.log(`    Industries  : ${industryIdMap.size}`);
  console.log(`    Technologies: ${techIdMap.size}`);
  console.log(`    Products    : ${productIdMap.size}`);
  console.log(`    Vendors     : ${vendorCount}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
