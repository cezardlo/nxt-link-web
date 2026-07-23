// GET /api/marketplace/suggest?q= — live search autocomplete for the marketplace.
// Returns up to ~8 suggestions tagged by type so the UI can differentiate
// "conveyor belt" (product) from "conveyor belt installation" (service) from a
// category. Public, cached briefly. Empty/short query → no suggestions.

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const esc = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

interface Suggestion { label: string; type: 'product' | 'service' | 'category'; }

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (q.length < 2 || !isSupabaseConfigured()) return NextResponse.json({ ok: true, suggestions: [] });

  const db = getSupabaseClient({ admin: true });
  const like = `%${esc(q)}%`;
  const [{ data: products }, { data: services }, { data: cats }] = await Promise.all([
    db.from('marketplace_products').select('name').eq('status', 'published').ilike('name', like).limit(6),
    db.from('marketplace_services').select('name').eq('status', 'published').ilike('name', like).limit(6),
    db.from('categories').select('label_en').eq('active', true).ilike('label_en', like).limit(6),
  ]);

  const seen = new Set<string>();
  const out: Suggestion[] = [];
  const push = (label: string | null | undefined, type: Suggestion['type']) => {
    const l = (label || '').trim();
    if (!l) return;
    const key = l.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key); out.push({ label: l, type });
  };
  // Categories first (broad intent), then concrete listings.
  for (const c of cats || []) push(c.label_en as string, 'category');
  for (const p of products || []) push(p.name as string, 'product');
  for (const s of services || []) push(s.name as string, 'service');

  return NextResponse.json({ ok: true, suggestions: out.slice(0, 8) });
}
