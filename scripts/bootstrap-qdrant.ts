#!/usr/bin/env npx tsx
// ─── Bootstrap Qdrant — Create collection + embed existing signals ───────────
// Run: npx tsx scripts/bootstrap-qdrant.ts
//
// Prerequisites:
//   QDRANT_URL, QDRANT_API_KEY, OPENAI_API_KEY in .env.local
//   Supabase configured with intel_signals table

import 'dotenv/config';

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const COLLECTION = 'signals';
const EMBEDDING_DIM = 1536;
const BATCH_SIZE = 20;

async function main() {
  console.log('🚀 Qdrant Bootstrap — NXT LINK');
  console.log('─'.repeat(50));

  // ── Check env vars ──
  if (!QDRANT_URL || !QDRANT_API_KEY) {
    console.error('❌ Missing QDRANT_URL or QDRANT_API_KEY in .env.local');
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY in .env.local');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase env vars');
    process.exit(1);
  }

  console.log(`✓ Qdrant: ${QDRANT_URL}`);
  console.log(`✓ OpenAI: configured`);
  console.log(`✓ Supabase: ${SUPABASE_URL}`);

  // ── Step 1: Create collection ──
  console.log('\n📦 Step 1: Creating signals collection...');
  const createRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'api-key': QDRANT_API_KEY },
    body: JSON.stringify({
      vectors: { size: EMBEDDING_DIM, distance: 'Cosine' },
      optimizers_config: { indexing_threshold: 0 }, // Index immediately
    }),
  });

  if (createRes.ok || createRes.status === 409) {
    console.log('  ✓ Collection ready');
  } else {
    const err = await createRes.text();
    console.log(`  ⚠ Collection response: ${createRes.status} — ${err}`);
  }

  // ── Step 2: Fetch signals from Supabase ──
  console.log('\n📡 Step 2: Fetching signals from Supabase...');
  const signalsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/intel_signals?select=id,title,summary&order=detected_at.desc&limit=500`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  if (!signalsRes.ok) {
    // Try kg_signals instead
    console.log('  ⚠ intel_signals not found, trying kg_signals...');
    const kgRes = await fetch(
      `${SUPABASE_URL}/rest/v1/kg_signals?select=id,title,description&order=detected_at.desc&limit=500`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!kgRes.ok) {
      console.error(`  ❌ No signal tables found: ${kgRes.status}`);
      console.log('  → Proceeding without initial embeddings (they\'ll be created as signals arrive)');
      return;
    }
    var signals: Array<{ id: string; title: string; summary?: string; description?: string }> = await kgRes.json();
  } else {
    var signals: Array<{ id: string; title: string; summary?: string; description?: string }> = await signalsRes.json();
  }

  console.log(`  ✓ Found ${signals.length} signals`);

  if (signals.length === 0) {
    console.log('  → No signals to embed. Done!');
    return;
  }

  // ── Step 3: Embed in batches ──
  console.log(`\n🧠 Step 3: Embedding ${signals.length} signals (batch size ${BATCH_SIZE})...`);
  let embedded = 0;
  let failed = 0;

  for (let i = 0; i < signals.length; i += BATCH_SIZE) {
    const batch = signals.slice(i, i + BATCH_SIZE);
    const texts = batch.map(s => `${s.title}. ${s.summary || s.description || ''}`);

    // Get embeddings from OpenAI
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
    });

    if (!embRes.ok) {
      console.error(`  ❌ OpenAI embedding failed: ${embRes.status}`);
      failed += batch.length;
      continue;
    }

    const embData = await embRes.json();
    const vectors = embData.data as Array<{ index: number; embedding: number[] }>;

    // Upsert to Qdrant
    const points = vectors.map((v) => ({
      id: batch[v.index].id,
      vector: v.embedding,
      payload: {
        title: batch[v.index].title,
        summary: batch[v.index].summary || batch[v.index].description || '',
      },
    }));

    const upsertRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'api-key': QDRANT_API_KEY },
      body: JSON.stringify({ points }),
    });

    if (upsertRes.ok) {
      embedded += batch.length;
    } else {
      console.error(`  ❌ Qdrant upsert failed: ${upsertRes.status}`);
      failed += batch.length;
    }

    process.stdout.write(`  → ${embedded}/${signals.length} embedded\r`);

    // Rate limit: max 60 requests/min to OpenAI
    if (i + BATCH_SIZE < signals.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n\n✅ Done! Embedded ${embedded} signals, ${failed} failed`);
  console.log('─'.repeat(50));
}

main().catch(console.error);
