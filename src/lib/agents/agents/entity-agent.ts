// src/lib/agents/agents/entity-agent.ts
// Entity Extraction Agent — populates the knowledge graph from existing data sources.
// Extracts entities (companies, products, technologies) and builds relationships.

import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import { INDUSTRIES, TECHNOLOGY_CATALOG } from '@/lib/data/technology-catalog';
import {
  upsertEntity,
  addRelationship,
} from '@/db/queries/knowledge-graph';
import { isSupabaseConfigured } from '@/db/client';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type EntityAgentResult = {
  entities_created: number;
  relationships_created: number;
  industries: number;
  companies: number;
  technologies: number;
  products: number;
  locations: number;
  duration_ms: number;
};

// ─── Slug helper ───────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Category → Industry slug mapping ──────────────────────────────────────────

const CATEGORY_TO_INDUSTRY: Record<string, string> = {
  'AI / ML': 'ai-ml',
  'IoT': 'ai-ml',
  'Analytics': 'ai-ml',
  'AI/R&D': 'ai-ml',
  'Cybersecurity': 'cybersecurity',
  'Defense': 'defense',
  'Defense IT': 'defense',
  'Border Tech': 'border-tech',
  'Manufacturing': 'manufacturing',
  'Robotics': 'manufacturing',
  'Fabrication': 'manufacturing',
  'Robotics & Automation': 'manufacturing',
  'Warehouse Automation': 'logistics',
  'Warehousing': 'logistics',
  'Energy': 'energy',
  'Water Tech': 'energy',
  'Energy Tech': 'energy',
  'Health Tech': 'healthcare',
  'Healthcare': 'healthcare',
  'Logistics': 'logistics',
  'Trucking': 'logistics',
  'Supply Chain Software': 'logistics',
};

// ─── Main Agent ─────────────────────────────────────────────────────────────────

export async function runEntityAgent(): Promise<EntityAgentResult> {
  const startMs = Date.now();

  if (!isSupabaseConfigured()) {
    return {
      entities_created: 0, relationships_created: 0,
      industries: 0, companies: 0, technologies: 0, products: 0, locations: 0,
      duration_ms: Date.now() - startMs,
    };
  }

  let entitiesCreated = 0;
  let relationshipsCreated = 0;
  let industriesCount = 0;
  let companiesCount = 0;
  let technologiesCount = 0;
  let productsCount = 0;
  let locationsCount = 0;

  // ── 1. Create El Paso location entity ─────────────────────────────────────

  const elPasoId = await upsertEntity({
    entity_type: 'location',
    name: 'El Paso, Texas',
    slug: 'el-paso-tx',
    description: 'El Paso, Texas — US-Mexico border city, major logistics and defense hub',
    metadata: { lat: 31.7619, lon: -106.485, country: 'US', state: 'TX' },
  });
  if (elPasoId) { entitiesCreated++; locationsCount++; }

  // ── 2. Create industry entities ───────────────────────────────────────────

  const industryIds: Record<string, string> = {};
  for (const ind of INDUSTRIES) {
    const id = await upsertEntity({
      entity_type: 'industry',
      name: ind.label,
      slug: ind.slug,
      description: ind.description,
      metadata: { color: ind.color, category: ind.category },
    });
    if (id) {
      industryIds[ind.slug] = id;
      entitiesCreated++;
      industriesCount++;

      // Industry occurs in El Paso
      if (elPasoId) {
        const relId = await addRelationship(id, elPasoId, 'occurs_in', 1, 'entity-agent');
        if (relId) relationshipsCreated++;
      }
    }
  }

  // ── 3. Create technology entities + link to industries ────────────────────

  for (const tech of TECHNOLOGY_CATALOG) {
    const techSlug = toSlug(tech.name);
    const techId = await upsertEntity({
      entity_type: 'technology',
      name: tech.name,
      slug: techSlug,
      description: tech.description,
      metadata: {
        category: tech.category,
        maturityLevel: tech.maturityLevel,
        elPasoRelevance: tech.elPasoRelevance,
        governmentBudgetFY25M: tech.governmentBudgetFY25M,
      },
    });
    if (techId) {
      entitiesCreated++;
      technologiesCount++;

      // Find which industry this tech belongs to
      const matchedIndustry = INDUSTRIES.find(i => i.category === tech.category);
      if (matchedIndustry && industryIds[matchedIndustry.slug]) {
        const relId = await addRelationship(
          techId, industryIds[matchedIndustry.slug], 'belongs_to', 0.9, 'entity-agent',
        );
        if (relId) relationshipsCreated++;
      }
    }
  }

  // ── 4. Create vendor (company) entities + link to industries ──────────────

  const vendors = Object.values(EL_PASO_VENDORS);
  for (const vendor of vendors) {
    const vendorSlug = toSlug(vendor.name);
    const vendorId = await upsertEntity({
      entity_type: 'company',
      name: vendor.name,
      slug: vendorSlug,
      description: vendor.evidence?.join('. ') ?? null,
      metadata: {
        category: vendor.category,
        ikerScore: vendor.ikerScore,
        tags: vendor.tags,
        lat: vendor.lat,
        lon: vendor.lon,
        vendorId: vendor.id,
      },
    });
    if (vendorId) {
      entitiesCreated++;
      companiesCount++;

      // Company occurs in El Paso
      if (elPasoId) {
        const relId = await addRelationship(vendorId, elPasoId, 'occurs_in', 1, 'entity-agent');
        if (relId) relationshipsCreated++;
      }

      // Company belongs to industry
      const industrySlug = CATEGORY_TO_INDUSTRY[vendor.category];
      if (industrySlug && industryIds[industrySlug]) {
        const relId = await addRelationship(
          vendorId, industryIds[industrySlug], 'belongs_to', 0.85, 'entity-agent',
        );
        if (relId) relationshipsCreated++;
      }

      // Extract product entities from vendor tags
      for (const tag of vendor.tags.slice(0, 5)) {
        const productSlug = toSlug(`${vendor.name}-${tag}`);
        const productId = await upsertEntity({
          entity_type: 'product',
          name: `${tag} (${vendor.name})`,
          slug: productSlug,
          description: `${tag} capability provided by ${vendor.name}`,
          metadata: { vendor: vendor.name, vendorId: vendor.id },
        });
        if (productId) {
          entitiesCreated++;
          productsCount++;

          // Company creates product
          const relId = await addRelationship(vendorId, productId, 'creates', 0.8, 'entity-agent');
          if (relId) relationshipsCreated++;
        }
      }
    }
  }

  return {
    entities_created: entitiesCreated,
    relationships_created: relationshipsCreated,
    industries: industriesCount,
    companies: companiesCount,
    technologies: technologiesCount,
    products: productsCount,
    locations: locationsCount,
    duration_ms: Date.now() - startMs,
  };
}
