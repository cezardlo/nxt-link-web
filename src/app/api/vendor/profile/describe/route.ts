// POST /api/vendor/profile/describe — signed-in vendor: draft a company
// description from what we already know (name, categories, industries, city,
// service areas, client types). Returns a DRAFT only; the vendor edits/keeps it
// in the portal, which then auto-saves. Falls back to a template with no LLM.

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { aiDraft, logAiDraft } from '@/lib/assistant/llm';

const list = (a: unknown, n = 6): string[] =>
  Array.isArray(a) ? (a as unknown[]).map((x) => String(x)).filter(Boolean).slice(0, n) : [];
const join = (a: string[]) => a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;

// Deterministic template so the button always produces something usable.
function templateDescription(v: {
  company_name?: string; city?: string | null; categories?: string[]; industries?: string[];
  service_areas?: string[]; client_types?: string[];
}): string {
  const name = v.company_name && v.company_name !== 'New company' ? v.company_name : 'Our company';
  const cats = join(list(v.categories, 4));
  const inds = join(list(v.industries, 3));
  const areas = join(list(v.service_areas, 4));
  const clients = join(list(v.client_types, 3));
  const parts: string[] = [];
  parts.push(cats ? `${name} provides ${cats}` + (inds ? ` for ${inds} operations` : '') + '.'
    : `${name} serves industrial buyers across the Borderplex.`);
  if (areas) parts.push(`We work across ${areas}.`);
  if (clients) parts.push(`We're a strong fit for ${clients}.`);
  parts.push('Reach out through NXT//LINK for a fast, protected quote.');
  return parts.join(' ');
}

export async function POST() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { data: v } = await db.from('vendor_profiles')
    .select('company_name, city, categories, industries, service_areas, client_types')
    .eq('id', vendor.id).maybeSingle();
  const profile = v || vendor;

  const facts = {
    company: profile.company_name || '',
    city: profile.city || '',
    categories: list(profile.categories),
    industries: list(profile.industries),
    service_areas: list(profile.service_areas),
    client_types: list(profile.client_types),
  };

  const draft = await aiDraft<{ description: string }>({
    systemPrompt: 'You write concise, credible B2B company descriptions for an industrial marketplace in the El Paso–Juárez Borderplex. 2–3 sentences, plain confident English, no hype, no emojis. Return JSON {"description": string}. Only use the facts given; do not invent certifications, years, or client names.',
    userPrompt: `Write a company description from these facts:\n${JSON.stringify(facts, null, 2)}`,
    temperature: 0.5,
    parse: (content: string) => {
      const obj = JSON.parse(content) as { description?: string };
      const d = String(obj.description || '').trim();
      if (!d) throw new Error('empty');
      return { description: d.slice(0, 600) };
    },
    fallback: () => ({ description: templateDescription(profile) }),
  });

  logAiDraft({ ai_mode: 'vendor_quote', vendor_id: vendor.id, provider: draft.provider, draft_output: draft.result }).catch(() => {});
  return NextResponse.json({ ok: true, description: draft.result.description, provider: draft.provider });
}
