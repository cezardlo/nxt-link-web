// POST /api/demo/login {role:'vendor'|'buyer'} — demo bypass for evaluation.
// Ensures a demo account exists (email pre-confirmed, no verification wall)
// and returns its credentials so the client can sign in immediately.
// The demo vendor email matches the "Rio Grande Industrial Services (DEMO)"
// vendor profile, so first login auto-links to a storefront with listings.
// NOTE: remove or gate this route before real production launch.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, hasSupabaseAdmin } from '@/lib/supabase/client';

const DEMO = {
  vendor: { email: 'demo-services@nxtlink-demo.example', role: 'vendor' },
  buyer: { email: 'demo-buyer@nxtlink-demo.example', role: 'client' },
} as const;
const DEMO_PASSWORD = 'NxtDemo2026!';

export async function POST(req: Request) {
  let body: { role?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const kind = body.role === 'vendor' ? 'vendor' : body.role === 'buyer' ? 'buyer' : null;
  if (!kind) return NextResponse.json({ ok: false, message: "role must be 'vendor' or 'buyer'" }, { status: 400 });
  if (!hasSupabaseAdmin()) return NextResponse.json({ ok: false, message: 'Demo login is not configured' }, { status: 503 });

  const target = DEMO[kind];
  const db = getSupabaseClient({ admin: true });

  // Create the confirmed demo user; if it already exists, that's fine.
  const { error } = await db.auth.admin.createUser({
    email: target.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { role: target.role, demo: true },
  });
  if (error && !/already|exists|registered/i.test(error.message)) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: target.email, password: DEMO_PASSWORD });
}
