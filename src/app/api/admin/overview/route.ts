// GET /api/admin/overview — counts backing the operator console's "Needs
// your attention" dashboard and nav badges (src/app/admin/page.tsx). Admin
// only. See src/lib/admin/overview.ts for exactly what each count queries
// and why "open disputes" is omitted (no real table).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { getAdminOverviewCounts, EMPTY_ADMIN_OVERVIEW_COUNTS } from '@/lib/admin/overview';

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, counts: EMPTY_ADMIN_OVERVIEW_COUNTS });

  const db = getSupabaseClient({ admin: true });
  const counts = await getAdminOverviewCounts(db);
  return NextResponse.json({ ok: true, counts });
}
