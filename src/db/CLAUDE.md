# Database Layer — CLAUDE.md

## Access Pattern

Always use `getDb()` from `@/db/client`, never `getSupabaseClient()` directly.

```typescript
import { getDb, isSupabaseConfigured } from '../client';

// Read operations
const db = getDb();

// Write operations (bypasses RLS)
const db = getDb({ admin: true });
```

All query functions follow: `isSupabaseConfigured()` check → Supabase query → fallback to hardcoded TS data on error.

## Key Tables and Relationships

| Table | Primary Key | Key Foreign Keys |
|-------|-------------|-----------------|
| `vendors` | `id` (text) | — |
| `conferences` | `id` (text) | — |
| `conference_intel` | `id` (text) | `conference_id` → conferences |
| `exhibitors` | `id` (text) | `conference_id` → conferences |
| `enriched_vendors` | `id` (text) | — |
| `conference_vendor_links` | `id` (uuid) | `conference_id`, `vendor_id` → vendors, `exhibitor_id` → exhibitors |
| `conference_scrape_runs` | `id` (uuid) | — |
| `intel_signals` | `id` (text) | — |
| `knowledge_graph_entities` | `id` (text) | — |
| `knowledge_graph_relationships` | `id` (text) | `source_id`, `target_id` → entities |

## Migration Naming

Format: `YYYYMMDD_descriptive_name.sql` (e.g., `20260401_conference_vendor_links.sql`)

Place in `supabase/migrations/`. Apply via Supabase MCP `apply_migration`.

## Batch Operations

Always chunk large upserts:

```typescript
for (let i = 0; i < records.length; i += 100) {
  const batch = records.slice(i, i + 100);
  await db.from(table).upsert(batch, { onConflict: 'id' });
}
```

## RLS

All tables have RLS enabled. Public read policies exist for all tables. Write operations use `getDb({ admin: true })` which bypasses RLS via the service role key.
