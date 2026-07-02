// GET /api/events/export?entity=catalog|ideas|companies|concepts|invites|pipeline
// Admin-only CSV export of the Conference & Event Strategy tables.
// Column lists are explicit per entity: all business columns + is_sample
// (where the table has it) + created_at; created_by is never exported.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, hasSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { toCsv } from '@/lib/events/csv';

interface ExportSpec {
  table: string;
  columns: string[];
}

const EXPORTS: Record<string, ExportSpec> = {
  catalog: {
    table: 'event_organizations',
    columns: [
      'id',
      'kind',
      'name',
      'location',
      'source_url',
      'source_verified_on',
      'audience',
      'industries',
      'attendees_estimate',
      'relevance',
      'mission_fit',
      'participation_recommendation',
      'estimated_cost',
      'cost_source_url',
      'cost_verified_on',
      'timing_frequency',
      'priority',
      'score_customers',
      'score_vendors',
      'score_global_trends',
      'score_cross_border',
      'notes',
      'is_sample',
      'created_at',
    ],
  },
  ideas: {
    table: 'wow_ideas',
    columns: [
      'id',
      'idea',
      'where_used',
      'why_impressive',
      'worker_support',
      'local_adaptation',
      'difficulty',
      'cost_range',
      'target_local_company',
      'demo_concept',
      'source_url',
      'source_verified_on',
      'notes',
      'is_sample',
      'created_at',
    ],
  },
  companies: {
    table: 'target_companies',
    columns: [
      'id',
      'name',
      'segment',
      'industry',
      'company_size',
      'location',
      'pain_points',
      'tech_readiness',
      'decision_makers',
      'notes',
      'is_sample',
      'created_at',
    ],
  },
  concepts: {
    table: 'event_concepts',
    columns: [
      'id',
      'template_key',
      'title',
      'audience',
      'theme',
      'speakers',
      'vendors',
      'demos',
      'venue',
      'sponsors',
      'invitees',
      'value_statement',
      'anti_sales_safeguards',
      'follow_up_plan',
      'revenue_model',
      'status',
      'notes',
      'is_sample',
      'created_at',
    ],
  },
  // invite_list_members has no is_sample column (see the migration).
  invites: {
    table: 'invite_list_members',
    columns: [
      'id',
      'list_id',
      'company_id',
      'vendor_application_id',
      'role_at_event',
      'status',
      'notes',
      'created_at',
    ],
  },
  pipeline: {
    table: 'event_pipeline_items',
    columns: [
      'id',
      'title',
      'stage',
      'status',
      'concept_id',
      'event_org_id',
      'owner',
      'due_on',
      'notes',
      'outcomes',
      'is_sample',
      'created_at',
    ],
  },
};

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !hasSupabaseAdmin()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
  }

  const entity = new URL(req.url).searchParams.get('entity') ?? '';
  const spec = EXPORTS[entity];
  if (!spec) {
    return NextResponse.json(
      { ok: false, message: `entity must be one of: ${Object.keys(EXPORTS).join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const db = getSupabaseClient({ admin: true });
    const { data, error } = await db
      .from(spec.table)
      .select(spec.columns.join(','))
      .order('created_at', { ascending: false })
      .limit(10_000);
    if (error) throw error;

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    const csv = toCsv(rows, spec.columns.map((key) => ({ key })));
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="nxtlink-${entity}.csv"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'Export failed' },
      { status: 500 },
    );
  }
}
