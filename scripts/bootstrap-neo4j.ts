#!/usr/bin/env npx tsx
// ─── Bootstrap Neo4j — Create schema + detect connections ────────────────────
// Run: npx tsx scripts/bootstrap-neo4j.ts
//
// Prerequisites:
//   NEO4J_URI, NEO4J_PASSWORD in .env.local
//   Supabase configured with signal data
//   (Optional) Qdrant for vector similarity connections

import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // also load .env as fallback

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER ?? 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const NEO4J_DATABASE = process.env.NEO4J_DATABASE ?? NEO4J_USER;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getHttpBase(): string {
  if (!NEO4J_URI) return '';
  return NEO4J_URI.replace('neo4j+s://', 'https://').replace('neo4j://', 'http://');
}

async function neo4jQuery(cypher: string, params: Record<string, unknown> = {}) {
  if (!NEO4J_URI || !NEO4J_PASSWORD) throw new Error('Neo4j not configured');
  const httpBase = getHttpBase();
  const res = await fetch(`${httpBase}/db/${NEO4J_DATABASE}/query/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${NEO4J_USER}:${NEO4J_PASSWORD}`).toString('base64')}`,
    },
    body: JSON.stringify({ statement: cypher, parameters: params }),
  });
  const data = await res.json();
  if (data.errors?.length) {
    throw new Error(JSON.stringify(data.errors[0]));
  }
  // Query API v2 returns { data: { fields: [...], values: [[...], ...] } }
  const fields = data.data?.fields as string[] | undefined;
  const values = data.data?.values as unknown[][] | undefined;
  if (!fields || !values) return [];
  return values.map(row => {
    const obj: Record<string, unknown> = {};
    fields.forEach((f, i) => { obj[f] = row[i]; });
    return { row: Object.values(obj) };
  });
}

async function main() {
  console.log('🚀 Neo4j Bootstrap — NXT LINK');
  console.log('─'.repeat(50));

  if (!NEO4J_URI || !NEO4J_PASSWORD) {
    console.error('❌ Missing NEO4J_URI or NEO4J_PASSWORD in .env.local');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase env vars');
    process.exit(1);
  }

  console.log(`✓ Neo4j: ${NEO4J_URI}`);
  console.log(`✓ Supabase: ${SUPABASE_URL}`);

  // ── Step 1: Create constraints and indexes ──
  console.log('\n📦 Step 1: Creating schema...');

  const schemaStatements = [
    'CREATE CONSTRAINT signal_id IF NOT EXISTS FOR (s:Signal) REQUIRE s.id IS UNIQUE',
    'CREATE CONSTRAINT company_name IF NOT EXISTS FOR (c:Company) REQUIRE c.name IS UNIQUE',
    'CREATE CONSTRAINT technology_name IF NOT EXISTS FOR (t:Technology) REQUIRE t.name IS UNIQUE',
    'CREATE CONSTRAINT industry_name IF NOT EXISTS FOR (i:Industry) REQUIRE i.name IS UNIQUE',
    'CREATE INDEX signal_detected IF NOT EXISTS FOR (s:Signal) ON (s.detected_at)',
    'CREATE INDEX signal_severity IF NOT EXISTS FOR (s:Signal) ON (s.severity)',
  ];

  for (const stmt of schemaStatements) {
    try {
      await neo4jQuery(stmt);
      console.log(`  ✓ ${stmt.slice(0, 60)}...`);
    } catch (err) {
      console.log(`  ⚠ ${(err as Error).message.slice(0, 80)}`);
    }
  }

  // ── Step 2: Fetch signals from Supabase ──
  console.log('\n📡 Step 2: Fetching signals...');

  let signals: Array<{
    id: string; title: string; summary?: string; description?: string;
    severity?: string; priority?: string; signal_type?: string;
    detected_at?: string; company?: string; industry?: string;
  }> = [];

  // Try intel_signals first, then kg_signals
  for (const table of ['intel_signals', 'kg_signals']) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&order=detected_at.desc&limit=200`,
      { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        signals = data;
        console.log(`  ✓ Found ${signals.length} signals in ${table}`);
        break;
      }
    }
  }

  if (signals.length === 0) {
    console.log('  → No signals found. Creating sample nodes for testing...');
    await createSampleGraph();
    return;
  }

  // ── Step 3: Create Signal nodes ──
  console.log(`\n🔗 Step 3: Creating ${signals.length} Signal nodes...`);
  let created = 0;

  for (const sig of signals) {
    try {
      await neo4jQuery(
        `MERGE (s:Signal {id: $id})
         SET s.title = $title,
             s.severity = $severity,
             s.signal_type = $type,
             s.detected_at = $detected_at`,
        {
          id: sig.id,
          title: sig.title,
          severity: sig.severity || sig.priority || 'P3',
          type: sig.signal_type || 'unknown',
          detected_at: sig.detected_at || new Date().toISOString(),
        }
      );
      created++;

      // Extract and link company if present
      const company = sig.company || extractCompany(sig.title);
      if (company) {
        await neo4jQuery(
          `MERGE (c:Company {name: $name})
           WITH c
           MATCH (s:Signal {id: $signalId})
           MERGE (s)-[:MENTIONS {confidence: 0.8}]->(c)`,
          { name: company, signalId: sig.id }
        );
      }

      // Link to industry if present
      const industry = sig.industry || sig.signal_type;
      if (industry) {
        await neo4jQuery(
          `MERGE (i:Industry {name: $name})
           WITH i
           MATCH (s:Signal {id: $signalId})
           MERGE (s)-[:RELATES_TO]->(i)`,
          { name: industry, signalId: sig.id }
        );
      }
    } catch (err) {
      console.error(`  ⚠ Failed: ${(err as Error).message.slice(0, 60)}`);
    }

    if (created % 20 === 0) process.stdout.write(`  → ${created}/${signals.length}\r`);
  }
  console.log(`  ✓ Created ${created} signal nodes`);

  // ── Step 4: Detect temporal connections ──
  console.log('\n⏱ Step 4: Detecting temporal connections (7-day window)...');
  try {
    const result = await neo4jQuery(
      `MATCH (a:Signal), (b:Signal)
       WHERE a.id < b.id
         AND a.detected_at IS NOT NULL AND b.detected_at IS NOT NULL
         AND abs(duration.between(date(a.detected_at), date(b.detected_at)).days) <= 7
       WITH a, b LIMIT 500
       MERGE (a)-[r:TEMPORALLY_NEAR]->(b)
       SET r.gap_days = abs(duration.between(date(a.detected_at), date(b.detected_at)).days)
       RETURN count(r) as connections`
    );
    const count = result[0]?.row?.[0] ?? 0;
    console.log(`  ✓ Created ${count} temporal connections`);
  } catch (err) {
    console.log(`  ⚠ Temporal: ${(err as Error).message.slice(0, 80)}`);
  }

  // ── Step 5: Detect entity connections ──
  console.log('\n🏢 Step 5: Detecting entity connections (shared companies)...');
  try {
    const result = await neo4jQuery(
      `MATCH (a:Signal)-[:MENTIONS]->(c:Company)<-[:MENTIONS]-(b:Signal)
       WHERE a.id < b.id
       WITH a, b, collect(c.name) as shared LIMIT 500
       MERGE (a)-[r:ENTITY_LINKED]->(b)
       SET r.shared_entities = shared
       RETURN count(r) as connections`
    );
    const count = result[0]?.row?.[0] ?? 0;
    console.log(`  ✓ Created ${count} entity connections`);
  } catch (err) {
    console.log(`  ⚠ Entity: ${(err as Error).message.slice(0, 80)}`);
  }

  // ── Summary ──
  console.log('\n' + '─'.repeat(50));
  try {
    const stats = await neo4jQuery(
      `MATCH (n) RETURN labels(n)[0] as label, count(n) as count ORDER BY count DESC`
    );
    console.log('📊 Graph contents:');
    for (const row of stats) {
      console.log(`  ${row.row[0]}: ${row.row[1]} nodes`);
    }
    const edgeStats = await neo4jQuery(
      `MATCH ()-[r]->() RETURN type(r) as type, count(r) as count ORDER BY count DESC`
    );
    for (const row of edgeStats) {
      console.log(`  ${row.row[0]}: ${row.row[1]} edges`);
    }
  } catch {
    // stats query failed, not critical
  }

  console.log('\n✅ Neo4j bootstrap complete!');
}

// Simple company name extraction from signal titles
function extractCompany(title: string): string | null {
  // Look for capitalized multi-word names before common verbs
  const match = title.match(/^([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+){0,3})\s(?:acquires|launches|announces|partners|wins|secures|raises|files|expands|reports)/);
  return match?.[1] ?? null;
}

async function createSampleGraph() {
  console.log('\n📝 Creating sample graph for testing...');

  const samples = [
    { id: 'sample-1', title: 'Palantir wins Army IDIQ contract', severity: 'P0', company: 'Palantir', industry: 'defense' },
    { id: 'sample-2', title: 'Raytheon files GAO protest', severity: 'P1', company: 'Raytheon', industry: 'defense' },
    { id: 'sample-3', title: 'Anthropic raises $3B Series D', severity: 'P0', company: 'Anthropic', industry: 'ai-ml' },
    { id: 'sample-4', title: 'OpenAI launches GPT-5', severity: 'P1', company: 'OpenAI', industry: 'ai-ml' },
    { id: 'sample-5', title: 'Fort Bliss modernization RFI', severity: 'P2', company: null, industry: 'defense' },
  ];

  for (const s of samples) {
    await neo4jQuery(
      `MERGE (s:Signal {id: $id}) SET s.title = $title, s.severity = $severity`,
      { id: s.id, title: s.title, severity: s.severity }
    );
    if (s.company) {
      await neo4jQuery(
        `MERGE (c:Company {name: $name}) WITH c MATCH (s:Signal {id: $id}) MERGE (s)-[:MENTIONS]->(c)`,
        { name: s.company, id: s.id }
      );
    }
    await neo4jQuery(
      `MERGE (i:Industry {name: $name}) WITH i MATCH (s:Signal {id: $id}) MERGE (s)-[:RELATES_TO]->(i)`,
      { name: s.industry, id: s.id }
    );
  }

  // Add connections
  await neo4jQuery(`MATCH (a:Signal {id:'sample-1'}),(b:Signal {id:'sample-2'}) MERGE (a)-[:CAUSED_BY {confidence:0.85}]->(b)`);
  await neo4jQuery(`MATCH (a:Signal {id:'sample-3'}),(b:Signal {id:'sample-4'}) MERGE (a)-[:THEMATICALLY_SIMILAR {score:0.88}]->(b)`);
  await neo4jQuery(`MATCH (a:Signal {id:'sample-1'}),(b:Signal {id:'sample-5'}) MERGE (a)-[:TEMPORALLY_NEAR {gap_days:5}]->(b)`);

  console.log('  ✓ Created 5 signals, 4 companies, 2 industries, 3 connections');
  console.log('\n✅ Sample graph ready for testing!');
}

main().catch(console.error);
