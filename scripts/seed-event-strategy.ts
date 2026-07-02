#!/usr/bin/env npx tsx
// scripts/seed-event-strategy.ts — Seed CLEARLY LABELED sample rows for the
// Conference & Event Strategy platform so the admin UI has something to show.
// Usage: npx tsx scripts/seed-event-strategy.ts
//
// Every row is is_sample=true and name-prefixed "SAMPLE — ". No real event
// dates, prices, or claims are asserted: source URLs point at example.com and
// cost bands are illustrative. Replace samples with sourced records (source
// URL + verification date are REQUIRED for factual rows) as research lands.
//
// Idempotent: deletes existing is_sample=true rows in these tables, then
// re-inserts. Never touches non-sample rows.

import 'dotenv/config';

const SAMPLE_URL = 'https://example.com/replace-with-real-source';
const SAMPLE_DATE = '2026-01-01'; // placeholder verification date for sample rows

async function main() {
  const { getSupabaseClient, isSupabaseConfigured, hasSupabaseAdmin } = await import(
    '../src/lib/supabase/client'
  );

  if (!isSupabaseConfigured() || !hasSupabaseAdmin()) {
    console.error(
      '[seed:events] Supabase admin not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
    process.exit(1);
  }

  const db = getSupabaseClient({ admin: true });

  const tables = [
    'invite_list_members',
    'invite_lists',
    'event_pipeline_items',
    'event_concepts',
    'target_companies',
    'wow_ideas',
    'event_organizations',
  ];
  for (const table of tables) {
    const { error } = await db.from(table).delete().eq('is_sample', true);
    if (error) {
      console.error(`[seed:events] Failed clearing samples from ${table}: ${error.message}`);
      process.exit(1);
    }
  }
  console.log('[seed:events] Cleared previous sample rows.');

  // --- Event intelligence catalog -------------------------------------------
  const { data: events, error: eventsErr } = await db
    .from('event_organizations')
    .insert([
      {
        kind: 'conference',
        name: 'SAMPLE — Regional Warehouse & Logistics Expo',
        location: 'El Paso, TX',
        source_url: SAMPLE_URL,
        source_verified_on: SAMPLE_DATE,
        audience: 'Warehouse operators, 3PLs, distribution managers',
        industries: ['warehousing', 'logistics', 'barcode/RFID'],
        attendees_estimate: 'Illustrative sample — verify with organizer',
        relevance: 'Sample record showing how a sourced expo entry should look.',
        mission_fit: 'Worker-support angle: tools demoed from the operator’s point of view.',
        participation_recommendation: 'Sample: booth + demo station once verified.',
        estimated_cost: 'Illustrative band only — replace with sourced cost',
        timing_frequency: 'Sample — verify frequency with organizer',
        priority: 'high',
        score_customers: 80,
        score_vendors: 75,
        score_global_trends: 40,
        score_cross_border: 60,
        is_sample: true,
        notes: 'SAMPLE ROW — replace with a sourced record (source URL + verified date).',
      },
      {
        kind: 'chamber',
        name: 'SAMPLE — Border-Region Chamber of Commerce',
        location: 'El Paso, TX / Ciudad Juárez, CHIH',
        source_url: SAMPLE_URL,
        source_verified_on: SAMPLE_DATE,
        audience: 'Local business owners, industrial suppliers, service providers',
        industries: ['cross-border trade', 'manufacturing', 'services'],
        relevance: 'Sample: chambers are candidate partners for invite lists and co-hosted events.',
        mission_fit: 'Regional development mission aligns with worker-supportive positioning.',
        participation_recommendation: 'Sample: join + attend mixers before pitching co-hosting.',
        timing_frequency: 'Sample — typically monthly mixers; verify',
        priority: 'medium',
        score_customers: 55,
        score_vendors: 50,
        score_global_trends: 20,
        score_cross_border: 85,
        is_sample: true,
        notes: 'SAMPLE ROW — replace with the real chamber(s) after verification.',
      },
      {
        kind: 'economic_development',
        name: 'SAMPLE — Regional Economic Development Group',
        location: 'El Paso–Juárez region',
        source_url: SAMPLE_URL,
        source_verified_on: SAMPLE_DATE,
        audience: 'Site selectors, investors, large employers, public sector',
        industries: ['economic development', 'manufacturing', 'logistics'],
        relevance: 'Sample: EDC-style groups can convene manufacturers and warehouses at scale.',
        mission_fit: 'Workforce-development programs pair naturally with worker-support demos.',
        participation_recommendation: 'Sample: brief them on the platform; explore co-hosted forum.',
        timing_frequency: 'Sample — verify meeting cadence',
        priority: 'medium',
        score_customers: 45,
        score_vendors: 60,
        score_global_trends: 35,
        score_cross_border: 90,
        is_sample: true,
        notes: 'SAMPLE ROW — replace with sourced record.',
      },
    ])
    .select('id, name');
  if (eventsErr) throw new Error(`event_organizations: ${eventsErr.message}`);
  console.log(`[seed:events] event_organizations: ${events?.length ?? 0} sample rows`);

  // --- Wow ideas -------------------------------------------------------------
  const { error: ideasErr } = await db.from('wow_ideas').insert([
    {
      idea: 'SAMPLE — Try-it-yourself demo corridor: attendees do a task with and without the tool',
      where_used: 'Sample: common format at large industrial trade shows',
      why_impressive: 'Turns spectators into users; the before/after is felt, not claimed.',
      worker_support: 'Workers experience that the tool removes strain/search time — nothing replaces their judgment.',
      local_adaptation: 'Run a picking task with paper list vs. handheld scanner at a local showcase.',
      difficulty: 'low',
      cost_range: 'Illustrative: low — uses vendor demo kits',
      target_local_company: 'El Paso 3PL warehouses',
      demo_concept: 'Two identical mock pick lanes, timed, with a leaderboard.',
      source_url: SAMPLE_URL,
      source_verified_on: SAMPLE_DATE,
      is_sample: true,
      notes: 'SAMPLE ROW.',
    },
    {
      idea: 'SAMPLE — Bilingual digital work-instruction station with instant ES/EN toggle',
      where_used: 'Sample: seen in multinational plant training centers',
      why_impressive: 'Language toggle makes the same tool serve both sides of the border.',
      worker_support: 'Shortens training time and reduces errors without deskilling the role.',
      local_adaptation: 'Demo with a real assembly micro-task; Juárez operators validate the ES flow.',
      difficulty: 'medium',
      cost_range: 'Illustrative: medium',
      target_local_company: 'Juárez maquiladoras',
      demo_concept: 'Assemble-a-widget station; toggle language mid-task.',
      source_url: SAMPLE_URL,
      source_verified_on: SAMPLE_DATE,
      is_sample: true,
      notes: 'SAMPLE ROW.',
    },
    {
      idea: 'SAMPLE — Live cross-border shipment tracking wall',
      where_used: 'Sample: logistics visibility showcases',
      why_impressive: 'Makes the invisible visible: one screen, both sides of the crossing.',
      worker_support: 'Dispatchers and dock teams get answers without phone-tag.',
      local_adaptation: 'Track a consented demo shipment El Paso ↔ Juárez during the event.',
      difficulty: 'high',
      cost_range: 'Illustrative: depends on carrier integrations',
      target_local_company: 'Cross-border logistics firms',
      demo_concept: 'Wall display + narrated timeline of a real (consented) crossing.',
      source_url: SAMPLE_URL,
      source_verified_on: SAMPLE_DATE,
      is_sample: true,
      notes: 'SAMPLE ROW.',
    },
  ]);
  if (ideasErr) throw new Error(`wow_ideas: ${ideasErr.message}`);
  console.log('[seed:events] wow_ideas: 3 sample rows');

  // --- Target companies --------------------------------------------------------
  const { data: companies, error: companiesErr } = await db
    .from('target_companies')
    .insert([
      {
        name: 'SAMPLE — El Paso 3PL Warehouse Co.',
        segment: 'warehouse',
        industry: 'Third-party logistics',
        company_size: '51-200',
        location: 'El Paso, TX',
        pain_points: ['inventory accuracy', 'barcode adoption', 'training time'],
        tech_readiness: 'medium',
        decision_makers: [{ name: 'SAMPLE Ops Director', role: 'Operations' }],
        is_sample: true,
        notes: 'SAMPLE ROW — illustrative segmentation only.',
      },
      {
        name: 'SAMPLE — Juárez Electronics Maquiladora',
        segment: 'maquiladora',
        industry: 'Electronics manufacturing',
        company_size: '500+',
        location: 'Ciudad Juárez, CHIH',
        pain_points: ['quality inspection', 'digital work instructions', 'maintenance tracking'],
        tech_readiness: 'high',
        decision_makers: [{ name: 'SAMPLE Plant Manager', role: 'Plant management' }],
        is_sample: true,
        notes: 'SAMPLE ROW.',
      },
      {
        name: 'SAMPLE — Cross-Border Freight Lines',
        segment: 'logistics',
        industry: 'Freight / customs brokerage',
        company_size: '11-50',
        location: 'El Paso, TX',
        pain_points: ['cross-border visibility', 'customs paperwork'],
        tech_readiness: 'low',
        decision_makers: [],
        is_sample: true,
        notes: 'SAMPLE ROW.',
      },
      {
        name: 'SAMPLE — Borderland Packaging Supply',
        segment: 'supplier',
        industry: 'Packaging and labeling',
        company_size: '11-50',
        location: 'El Paso, TX',
        pain_points: ['order tracking', 'label compliance'],
        tech_readiness: 'medium',
        decision_makers: [],
        is_sample: true,
        notes: 'SAMPLE ROW.',
      },
    ])
    .select('id, name');
  if (companiesErr) throw new Error(`target_companies: ${companiesErr.message}`);
  console.log(`[seed:events] target_companies: ${companies?.length ?? 0} sample rows`);

  // --- One concept from a template ------------------------------------------
  const { EVENT_CONCEPT_TEMPLATES } = await import('../src/lib/events/templates');
  const template = EVENT_CONCEPT_TEMPLATES[0];
  const { data: concepts, error: conceptErr } = await db
    .from('event_concepts')
    .insert([
      {
        template_key: template.key,
        title: `SAMPLE — ${template.title}`,
        audience: template.audience,
        theme: template.theme,
        speakers: template.speakers,
        vendors: template.vendors,
        demos: template.demos,
        venue: template.venue,
        sponsors: template.sponsors,
        value_statement: template.value_statement,
        anti_sales_safeguards: template.anti_sales_safeguards,
        follow_up_plan: template.follow_up_plan,
        revenue_model: template.revenue_model,
        status: 'draft',
        is_sample: true,
        notes: 'SAMPLE ROW seeded from the template.',
      },
    ])
    .select('id');
  if (conceptErr) throw new Error(`event_concepts: ${conceptErr.message}`);
  const conceptId = concepts?.[0]?.id ?? null;
  console.log('[seed:events] event_concepts: 1 sample row');

  // --- Invite list + members ---------------------------------------------------
  const { data: lists, error: listErr } = await db
    .from('invite_lists')
    .insert([
      {
        name: 'SAMPLE — Warehouse Showcase invite list',
        purpose: 'Illustrates matching target companies to an event concept.',
        concept_id: conceptId,
        is_sample: true,
      },
    ])
    .select('id');
  if (listErr) throw new Error(`invite_lists: ${listErr.message}`);
  const listId = lists?.[0]?.id;
  if (listId && companies && companies.length >= 2) {
    const { error: memberErr } = await db.from('invite_list_members').insert([
      { list_id: listId, company_id: companies[0].id, role_at_event: 'attendee', status: 'proposed' },
      { list_id: listId, company_id: companies[2].id, role_at_event: 'attendee', status: 'proposed' },
    ]);
    if (memberErr) throw new Error(`invite_list_members: ${memberErr.message}`);
  }
  console.log('[seed:events] invite_lists: 1 sample list with 2 members');

  // --- Pipeline items ----------------------------------------------------------
  const { error: pipelineErr } = await db.from('event_pipeline_items').insert([
    {
      title: 'SAMPLE — Research candidate venues',
      stage: 'research',
      status: 'in_progress',
      concept_id: conceptId,
      owner: 'SAMPLE owner',
      notes: 'SAMPLE ROW.',
      outcomes: {},
      is_sample: true,
    },
    {
      title: 'SAMPLE — Recruit first demo vendors',
      stage: 'vendor_recruitment',
      status: 'todo',
      concept_id: conceptId,
      owner: 'SAMPLE owner',
      notes: 'SAMPLE ROW.',
      outcomes: {},
      is_sample: true,
    },
    {
      title: 'SAMPLE — Post-event follow-up + pilot conversion',
      stage: 'pilot_conversion',
      status: 'todo',
      concept_id: conceptId,
      owner: 'SAMPLE owner',
      notes: 'SAMPLE ROW — outcomes counters track meetings/audits/pilots/paid projects.',
      outcomes: { meetings: 0, audits: 0, pilots: 0, paid_projects: 0 },
      is_sample: true,
    },
  ]);
  if (pipelineErr) throw new Error(`event_pipeline_items: ${pipelineErr.message}`);
  console.log('[seed:events] event_pipeline_items: 3 sample rows');

  console.log('[seed:events] Done. All rows are is_sample=true and labeled SAMPLE.');
}

main().catch((err) => {
  console.error('[seed:events] Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
