// src/lib/agents/agents/vendor-kg-linker.ts
// Vendor → Knowledge Graph Linker — creates company entities in the KG
// for enriched vendors and links them to industries and technologies.
// Runs after scoring to connect vendors into the intelligence graph.

import { getDb, isSupabaseConfigured } from '@/db/client';
import {
  upsertEntity,
  resolveEntity,
  addRelationship,
} from '@/db/queries/knowledge-graph';
import type { EnrichedVendorRow } from '@/db/queries/exhibitors';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type LinkingReport = {
  vendors_processed: number;
  entities_created: number;
  entities_existing: number;
  relationships_created: number;
  duration_ms: number;
};

// ─── Industry Slug Mapping ──────────────────────────────────────────────────────

function industrySlug(industry: string): string {
  return industry.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Main Linker ────────────────────────────────────────────────────────────────

export async function runVendorKgLinker(options: {
  minConfidence?: number;
  limit?: number;
} = {}): Promise<LinkingReport> {
  const start = Date.now();
  const { minConfidence = 0.5, limit = 100 } = options;

  if (!isSupabaseConfigured()) {
    return { vendors_processed: 0, entities_created: 0, entities_existing: 0, relationships_created: 0, duration_ms: 0 };
  }

  const db = getDb();
  const { data } = await db
    .from('enriched_vendors')
    .select('*')
    .gte('confidence', minConfidence)
    .order('confidence', { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) {
    return { vendors_processed: 0, entities_created: 0, entities_existing: 0, relationships_created: 0, duration_ms: Date.now() - start };
  }

  const vendors = data as EnrichedVendorRow[];
  let entitiesCreated = 0;
  let entitiesExisting = 0;
  let relationshipsCreated = 0;

  for (const v of vendors) {
    const slug = v.canonical_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // ── Upsert company entity ─────────────────────────────────────────────
    const existingId = await resolveEntity(v.canonical_name, 'company');

    let entityId: string | null;
    if (existingId) {
      entityId = existingId;
      entitiesExisting++;
    } else {
      entityId = await upsertEntity({
        entity_type: 'company',
        name: v.canonical_name,
        slug,
        description: v.description || null,
        metadata: {
          official_domain: v.official_domain,
          vendor_type: v.vendor_type,
          products: v.products,
          technologies: v.technologies,
          country: v.country,
          employee_estimate: v.employee_estimate,
          conference_sources: v.conference_sources,
          discovery_source: 'vendor_pipeline',
        },
      });
      if (entityId) entitiesCreated++;
    }

    if (!entityId) continue;

    // ── Link to industries ────────────────────────────────────────────────
    for (const industry of v.industries) {
      const indSlug = industrySlug(industry);
      // Resolve or create industry entity
      let indId = await resolveEntity(industry, 'industry');
      if (!indId) {
        indId = await upsertEntity({
          entity_type: 'industry',
          name: industry,
          slug: indSlug,
        });
      }
      if (indId) {
        await addRelationship(entityId, indId, 'belongs_to', v.confidence, 'vendor_pipeline');
        relationshipsCreated++;
      }
    }

    // ── Link to technologies ──────────────────────────────────────────────
    for (const tech of v.technologies) {
      const techSlug = tech.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let techId = await resolveEntity(tech, 'technology');
      if (!techId) {
        techId = await upsertEntity({
          entity_type: 'technology',
          name: tech,
          slug: techSlug,
        });
      }
      if (techId) {
        await addRelationship(entityId, techId, 'uses', v.confidence, 'vendor_pipeline');
        relationshipsCreated++;
      }
    }

    // ── Link products ─────────────────────────────────────────────────────
    for (const product of v.products.slice(0, 5)) {
      const prodSlug = product.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let prodId = await resolveEntity(product, 'product');
      if (!prodId) {
        prodId = await upsertEntity({
          entity_type: 'product',
          name: product,
          slug: prodSlug,
          description: `Product by ${v.canonical_name}`,
        });
      }
      if (prodId) {
        await addRelationship(entityId, prodId, 'creates', v.confidence, 'vendor_pipeline');
        relationshipsCreated++;
      }
    }
  }

  return {
    vendors_processed: vendors.length,
    entities_created: entitiesCreated,
    entities_existing: entitiesExisting,
    relationships_created: relationshipsCreated,
    duration_ms: Date.now() - start,
  };
}
