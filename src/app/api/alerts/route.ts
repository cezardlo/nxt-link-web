// GET /api/alerts — list user alert rules
// POST /api/alerts — create a new alert rule
// DELETE /api/alerts?id=xxx — delete an alert rule

import { NextResponse } from 'next/server';
import { getDb, isSupabaseConfigured } from '@/db/client';

export const dynamic = 'force-dynamic';

type AlertRule = {
  id: string;
  keyword: string;
  sector: string | null;
  signal_types: string[];
  min_importance: number;
  enabled: boolean;
  created_at: string;
};

type AlertRuleInsert = {
  keyword: string;
  sector?: string | null;
  signal_types?: string[];
  min_importance?: number;
};

// In-memory fallback
const localAlerts: AlertRule[] = [];
let localCounter = 1;

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, alerts: localAlerts, source: 'local' });
  }

  const db = getDb();
  const { data, error } = await db
    .from('alert_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, alerts: data ?? [], source: 'supabase' });
}

export async function POST(request: Request) {
  const body = await request.json() as AlertRuleInsert;

  if (!body.keyword?.trim()) {
    return NextResponse.json({ ok: false, message: 'keyword is required' }, { status: 400 });
  }

  const rule = {
    keyword: body.keyword.trim().toLowerCase(),
    sector: body.sector ?? null,
    signal_types: body.signal_types ?? [],
    min_importance: body.min_importance ?? 0.5,
    enabled: true,
  };

  if (!isSupabaseConfigured()) {
    const created: AlertRule = {
      ...rule,
      id: `local-${localCounter++}`,
      created_at: new Date().toISOString(),
    };
    localAlerts.push(created);
    return NextResponse.json({ ok: true, alert: created, source: 'local' });
  }

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('alert_rules')
    .insert(rule)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, alert: data, source: 'supabase' });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const idx = localAlerts.findIndex(a => a.id === id);
    if (idx >= 0) localAlerts.splice(idx, 1);
    return NextResponse.json({ ok: true });
  }

  const db = getDb({ admin: true });
  const { error } = await db.from('alert_rules').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
