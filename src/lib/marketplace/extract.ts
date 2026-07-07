// AI listing extraction: turn a vendor document (spec sheet, brochure) into a
// DRAFT product or service listing. Strict no-invention contract — missing is
// correct, guessed is wrong. Draft-only: the vendor reviews before publishing.

import { aiDraft } from '@/lib/assistant/llm';
import { ListingKind, normalizeListingInput } from '@/lib/marketplace/types';

export interface ListingDraft {
  fields: Record<string, unknown>;
  summary: string;
}

const SYSTEM = (kind: ListingKind) => `You extract a standardized ${kind} listing from a vendor document for
NXT//LINK, an industrial B2B marketplace for the El Paso / Ciudad Juárez region.
STRICT RULES:
- NEVER invent, guess, or embellish. Only facts stated in the document.
- A missing field is CORRECT; a guessed field is WRONG. Omit unknown fields entirely.
- overview: 2-5 factual sentences in plain English.
- summary: one sentence telling the vendor what you found and what is missing.
Return ONLY JSON with any of these keys you can support from the document:
{"name":string,"category":string,"overview":string,"best_for":string[],"industries":string[],
${
  '' /* kind-specific keys below */
}${kind === 'product'
  ? '"use_cases":string[],"specs":{"<spec name>":"<value>"},"availability":["buy"|"rent"|"lease"|"quote"],"lead_time":string,'
  : '"service_areas":string[],"response_time":string,"process":string[],"certifications":string[],"pricing_model":string,"emergency_available":boolean,'
}
"pilot":{"available":boolean,"duration":string,"cost":string,"scope":string,"success_criteria":string[]},
"implementation":{"requirements":string[],"typical_timeline":string,"training":string,"integrations":string[]},
"warranty_support":{"warranty":string,"support_channels":string[],"sla":string,"maintenance":string},
"pricing":{"model":string,"range":string,"buy":boolean,"rent":boolean,"lease":boolean,"notes":string},
"fit":{"company_sizes":string[],"prerequisites":string[],"not_a_fit_for":string[]},
"roi":{"drivers":string[],"typical_payback":string,"example":string},
"summary":string}`;

/** Draft a listing from document text. Never throws. */
export async function extractListingDraft(kind: ListingKind, text: string): Promise<{ draft: ListingDraft; provider: string }> {
  const { result, provider } = await aiDraft<ListingDraft>({
    systemPrompt: SYSTEM(kind),
    userPrompt: `Document text:\n"""\n${text}\n"""\nExtract the ${kind} listing as JSON.`,
    temperature: 0.2,
    parse: (content) => {
      const json = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const o = JSON.parse(json) as Record<string, unknown>;
      const summary = typeof o.summary === 'string' ? o.summary.slice(0, 500) : 'Extraction complete.';
      delete o.summary;
      const fields = normalizeListingInput(kind, o);
      if (!Object.keys(fields).length) throw new Error('empty');
      return { fields, summary };
    },
    fallback: () => ({
      fields: {},
      summary: 'AI is unavailable right now — no draft could be created. Fill in the listing manually or try again later.',
    }),
  });
  return { draft: result, provider };
}
