// GET /api/admin/overview — counts backing the operator console's "Needs
// your attention" dashboard and nav badges (src/app/admin/page.tsx), PLUS
// the full operator dashboard payload (src/app/admin/dashboard/page.tsx).
// Admin only. See src/lib/admin/overview.ts and src/lib/admin/dashboard.ts
// for exactly what each number queries — all real reads, nothing fabricated
// (traffic reports connected:false until Vercel Web Analytics is enabled).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { getAdminOverviewCounts, EMPTY_ADMIN_OVERVIEW_COUNTS } from '@/lib/admin/overview';
import { getOperatorDashboard, emptyOperatorDashboard } from '@/lib/admin/dashboard';

export async function GET(req: Request) {
  // Fail closed: no admin session → 401, no data, no shape hints.
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, counts: EMPTY_ADMIN_OVERVIEW_COUNTS, dashboard: emptyOperatorDashboard() });
  }

  const db = getSupabaseClient({ admin: true });
  const [counts, dashboard] = await Promise.all([
    getAdminOverviewCounts(db),
    getOperatorDashboard(db),
  ]);
  return NextResponse.json({ ok: true, counts, dashboard });
}
