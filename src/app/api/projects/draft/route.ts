// POST /api/projects/draft { text } — turn a buyer's plain-language problem
// into a STRUCTURED draft (name, problem, operational effect, candidate
// categories, suggested info). No account needed to draft; you sign in only to
// SAVE it (reciprocity + IKEA-effect: let them build before we ask).
//
// The AI never invents specs/prices — it only reorganizes what the buyer said
// and proposes categories drawn from OUR canonical taxonomy. Deterministic
// fallback guarantees a usable draft even with no AI provider configured.

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { aiDraft, logAiDraft } from '@/lib/assistant/llm';

interface ProjectDraft {
  name: string;
  problem: string;
  operational_effect: string;
  category_slugs: string[];
  suggested_info: string[];
}

function fallbackDraft(text: string, catalog: { slug: string; label_en: string }[]): ProjectDraft {
  const lower = text.toLowerCase();
  const hits = catalog
    .filter((c) => {
      const words = c.label_en.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
      return words.some((w) => lower.includes(w));
    })
    .slice(0, 5)
    .map((c) => c.slug);
  const firstSentence = text.trim().split(/[.\n]/)[0].slice(0, 120);
  return {
    name: firstSentence ? firstSentence.replace(/^(our|we|the)\s+/i, '').slice(0, 80) : 'New project',
    problem: text.trim().slice(0, 600),
    operational_effect: '',
    category_slugs: hits,
    suggested_info: ['Location / facility', 'Quantity or scope', 'Required timeline', 'Budget range'],
  };
}

export async function POST(req: Request) {
  let body: { text?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 2000) : '';
  if (text.length < 4) return NextResponse.json({ ok: false, message: 'Tell us a little more about what you need.' }, { status: 400 });

  // Pull the canonical taxonomy so the AI can only pick real categories.
  let catalog: { slug: string; label_en: string; label_es: string; kind: string }[] = [];
  if (isSupabaseConfigured()) {
    const db = getSupabaseClient({ admin: true });
    const { data } = await db.from('categories').select('slug, label_en, label_es, kind').eq('active', true);
    catalog = (data as typeof catalog) || [];
  }

  const catList = catalog.map((c) => `${c.slug} (${c.kind}: ${c.label_en})`).join('\n');

  const { result, provider } = await aiDraft<ProjectDraft>({
    systemPrompt:
      'You organize an industrial buyer\'s plain-language problem into a structured project draft. ' +
      'Do NOT invent facts, specs, prices, brands, or quantities the buyer did not state. ' +
      'Return STRICT JSON: {"name": string (<=80 chars, action-oriented), "problem": string, ' +
      '"operational_effect": string (the business impact, or ""), ' +
      '"category_slugs": string[] (ONLY slugs from the provided list, up to 5, most relevant first), ' +
      '"suggested_info": string[] (up to 6 short questions whose answers would help vendors quote)}. ' +
      'Choose categories only from this list:\n' + (catList || '(none)'),
    userPrompt: text,
    temperature: 0.3,
    parse: (content: string): ProjectDraft => {
      const match = content.match(/\{[\s\S]*\}/);
      const raw = JSON.parse(match ? match[0] : content) as Partial<ProjectDraft>;
      const valid = new Set(catalog.map((c) => c.slug));
      return {
        name: String(raw.name || '').slice(0, 80) || 'New project',
        problem: String(raw.problem || text).slice(0, 600),
        operational_effect: String(raw.operational_effect || '').slice(0, 300),
        category_slugs: Array.isArray(raw.category_slugs)
          ? raw.category_slugs.filter((s) => valid.has(String(s))).slice(0, 5)
          : [],
        suggested_info: Array.isArray(raw.suggested_info)
          ? raw.suggested_info.map((s) => String(s).slice(0, 100)).slice(0, 6)
          : [],
      };
    },
    fallback: () => fallbackDraft(text, catalog),
  });

  // Enrich chosen slugs with bilingual labels for the UI.
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));
  const categories = result.category_slugs.map((slug) => {
    const c = bySlug.get(slug);
    return { slug, kind: c?.kind || 'product', label_en: c?.label_en || slug, label_es: c?.label_es || slug };
  });

  await logAiDraft({ ai_mode: 'intake', prompt_input: text, draft_output: result, provider });

  return NextResponse.json({ ok: true, draft: { ...result, categories } });
}
