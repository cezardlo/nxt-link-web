#!/usr/bin/env npx tsx
// ─── Bootstrap Qdrant — Create collection + embed existing signals ───────────
// Run: npx tsx scripts/bootstrap-qdrant.ts
//
// Uses Gemini embeddings (FREE) — falls back to OpenAI if configured

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const COLLECTION = 'signals';
const EMBEDDING_DIM = GEMINI_API_KEY ? 3072 : 1536;
const BATCH_SIZE = 10;

async function embedText(text: string): Promise<number[] | null> {
  // Try Gemini first (free)
  if (GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/gemini-embedding-001',
            content: { parts: [{ text: text.slice(0, 10000) }] },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        return data.embedding?.values ?? null;
      }
    } catch {}
  }
  // Fallback to OpenAI
  if (OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data?.[0]?.embedding ?? null;
      }
    } catch {}
  }
  return null;
}

async function main() {
  console.log('🚀 Qdrant Bootstrap — NXT LINK');
  console.log('─'.repeat(50));

  if (!QDRANT_URL || !QDRANT_API_KEY) {
    console.error('❌ Missing QDRANT_URL or QDRANT_API_KEY');
    process.exit(1);
  }
  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY or OPENAI_API_KEY');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase env vars');
    process.exit(1);
  }

  console.log(`✓ Qdrant: ${QDRANT_URL.slice(0, 40)}...`);
  console.log(`✓ Embeddings: ${GEMINI_API_KEY ? 'Gemini (free, 3072 dim)' : 'OpenAI (1536 dim)'}`);
  console.log(`✓ Supabase: configured`);

  // Step 1: Create collection
  console.log('\n📦 Step 1: Creating signals collection...');
  const createRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'api-key': QDRANT_API_KEY },
    body: JSON.stringify({
      vectors: { size: EMBEDDING_DIM, distance: 'Cosine' },
    }),
  });

  if (createRes.ok || createRes.status === 409) {
    console.log(`  ✓ Collection ready (${EMBEDDING_DIM} dimensions)`);
  } else {
    const err = await createRes.text();
    console.log(`  ⚠ ${createRes.status}: ${err.slice(0, 100)}`);
  }

  // Step 2: Fetch signals
  console.log('\n📡 Step 2: Fetching signals from Supabase...');
  let signals: Array<{ id: string; title: string; summary?: string; description?: string }> = [];

  for (const table of ['kg_signals', 'intel_signals']) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=id,title,description&order=detected_at.desc&limit=200`,
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
    console.log('  → No signals found. Done.');
    return;
  }

  // Step 3: Embed and upsert
  console.log(`\n🧠 Step 3: Embedding ${signals.length} signals...`);
  let embedded = 0;
  let failed = 0;

  for (let i = 0; i < signals.length; i += BATCH_SIZE) {
    const batch = signals.slice(i, i + BATCH_SIZE);

    for (const sig of batch) {
      const text = `${sig.title}. ${sig.description || sig.summary || ''}`;
      const vector = await embedText(text);

      if (!vector) {
        failed++;
        continue;
      }

      const upsertRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'api-key': QDRANT_API_KEY },
        body: JSON.stringify({
          points: [{
            id: sig.id,
            vector,
            payload: { title: sig.title, summary: sig.description || sig.summary || '' },
          }],
        }),
      });

      if (upsertRes.ok) {
        embedded++;
      } else {
        failed++;
      }

      // Rate limit for Gemini
      await new Promise(r => setTimeout(r, 150));
    }

    process.stdout.write(`  → ${embedded}/${signals.length} embedded (${failed} failed)\r`);
  }

  console.log(`\n\n✅ Done! ${embedded} signals embedded, ${failed} failed`);
  console.log('─'.repeat(50));
}

main().catch(console.error);
