// POST /api/vendor/onboard/concierge — NXT AI Vendor Onboarding Concierge.
// From a company name + one-sentence summary, drafts a full profile: a polished
// description, a tagline, suggested categories, and up to 5 suggested offerings
// (products/services). Returns a DRAFT only — the vendor reviews it in the portal
// and applies it (which saves the profile + creates the offerings as drafts).

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { aiDraft, logAiDraft } from '@/lib/assistant/llm';

interface Offering { kind: 'product' | 'service'; name: string; category: string; }
interface Concierge { description: string; tagline: string; categories: string[]; offerings: Offering[]; }

const clean = (s: unknown, max = 200) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const arr = (a: unknown, n: number, max = 80) =>
  Array.isArray(a) ? Array.from(new Set((a as unknown[]).map((x) => clean(x, max)).filter(Boolean))).slice(0, n) : [];

// Deterministic fallback so the concierge always returns something usable.
function fallback(company: string, summary: string): Concierge {
  const name = company && company !== 'New company' ? company : 'Our company';
  const s = summary.replace(/\s+/g, ' ').trim();
  const offerings: Offering[] = [];
  const has = (re: RegExp) => re.test(s);
  if (has(/\bsell|sale|supply|distribut/i)) offerings.push({ kind: 'product', name: 'Product sales', category: 'Sales' });
  if (has(/\brent|lease|rental/i)) offerings.push({ kind: 'service', name: 'Rentals', category: 'Rentals' });
  if (has(/\brepair|service|maintenance|fix/i)) offerings.push({ kind: 'service', name: 'Repair & maintenance', category: 'Maintenance' });
  if (has(/\binstall/i)) offerings.push({ kind: 'service', name: 'Installation', category: 'Installation' });
  const description = `${name} ${s ? `— ${s.charAt(0).toLowerCase()}${s.slice(1)}` : 'serves industrial buyers across the El Paso–Juárez Borderplex'}. Reach out through NXT//LINK for a fast, protected quote.`;
  return { description: clean(description, 600), tagline: clean(s || `${name} on the Borderplex`, 120), categories: [], offerings };
}

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  let body: { company_name?: string; summary?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const company = clean(body.company_name, 200) || vendor.company_name || '';
  const summary = clean(body.summary, 400);
  if (!summary) return NextResponse.json({ ok: false, message: 'Tell me in one sentence what your company does.' }, { status: 400 });

  const draft = await aiDraft<Concierge>({
    systemPrompt: 'You are NXT AI, onboarding a vendor onto an industrial marketplace in the El Paso–Juárez Borderplex. From a company name and one-sentence summary, draft their profile. Return JSON {"description": string (2-3 sentences, plain confident English, no hype/emojis), "tagline": string (<=120 chars), "categories": string[] (up to 6 concrete offering categories, e.g. "Forklift Repair"), "offerings": [{"kind":"product"|"service","name":string,"category":string}] (up to 5)}. Only use what the summary implies; never invent certifications, years, brands, or client names.',
    userPrompt: `Company: ${company}\nWhat they do: ${summary}`,
    temperature: 0.5,
    parse: (content: string) => {
      const o = JSON.parse(content) as Partial<Concierge>;
      const offerings = (Array.isArray(o.offerings) ? o.offerings : []).map((x) => ({
        kind: x?.kind === 'service' ? 'service' as const : 'product' as const,
        name: clean(x?.name, 120), category: clean(x?.category, 80),
      })).filter((x) => x.name).slice(0, 5);
      const description = clean(o.description, 600);
      if (!description) throw new Error('empty');
      return { description, tagline: clean(o.tagline, 120), categories: arr(o.categories, 6), offerings };
    },
    fallback: () => fallback(company, summary),
  });

  logAiDraft({ ai_mode: 'intake', vendor_id: vendor.id, provider: draft.provider, draft_output: draft.result, prompt_input: `${company} | ${summary}` }).catch(() => {});
  return NextResponse.json({ ok: true, provider: draft.provider, ...draft.result });
}
