// AI listing extraction: turn a vendor document (spec sheet, brochure) or a
// set of product PHOTOS into a DRAFT product or service listing. Strict
// no-invention contract — missing is correct, guessed is wrong. Draft-only:
// the vendor reviews before publishing.

import { aiDraft } from '@/lib/assistant/llm';
import { callGeminiVisionJson, type GeminiImagePart } from '@/lib/llm/gemini-vision';
import { ListingKind, normalizeListingInput } from '@/lib/marketplace/types';

export interface ListingDraft {
  fields: Record<string, unknown>;
  summary: string;
}

// The JSON schema is shared by both the text prompt and the photo prompt —
// same output shape either way, just different rules about where facts may
// come from.
const DRAFT_JSON_SCHEMA = (kind: ListingKind) => `Return ONLY JSON with any of these keys you can support:
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

const SYSTEM = (kind: ListingKind) => `You extract a standardized ${kind} listing from a vendor document for
NXT//LINK, an industrial B2B marketplace for the El Paso / Ciudad Juárez region.
STRICT RULES:
- NEVER invent, guess, or embellish. Only facts stated in the document.
- A missing field is CORRECT; a guessed field is WRONG. Omit unknown fields entirely.
- overview: 2-5 factual sentences in plain English.
- summary: one sentence telling the vendor what you found and what is missing.
${DRAFT_JSON_SCHEMA(kind)}`;

// Vision variant: same contract, but the source is 1-4 product PHOTOS
// instead of document text. Extra rule against inferring specs from mere
// visual appearance (a shiny forklift is not necessarily "new condition").
const VISION_SYSTEM = (kind: ListingKind) => `You extract a standardized ${kind} listing from PRODUCT PHOTOS for
NXT//LINK, an industrial B2B marketplace for the El Paso / Ciudad Juárez region.
STRICT RULES:
- NEVER invent, guess, or embellish. Only use what is legible or clearly shown in the photos:
  text on labels/nameplates/packaging, visible model numbers, and what the product visibly is.
- Do NOT infer specs, brand, or condition from general appearance alone — only from legible text.
- A missing field is CORRECT; a guessed field is WRONG. Omit unknown fields entirely.
- overview: 2-5 factual sentences describing only what is visibly shown.
- summary: one sentence telling the vendor what you found in the photos and what is missing.
${DRAFT_JSON_SCHEMA(kind)}`;

const AI_UNAVAILABLE_MESSAGE = 'AI is unavailable right now — no draft could be created. Fill in the listing manually or try again later.';
const AI_UNAVAILABLE_MESSAGE_PHOTOS = 'AI could not draft a listing from these photos right now. Fill in the listing manually, or try a brochure/text instead.';

/** Shared parse step for both the text and photo extraction paths: strip
 * markdown fences, parse JSON, pull out `summary`, and run the rest through
 * the same server-side normalizer that also guards manual saves. Throws on
 * anything unusable — callers decide how to degrade. */
function parseDraftContent(kind: ListingKind, content: string): ListingDraft {
  const json = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const o = JSON.parse(json) as Record<string, unknown>;
  const summary = typeof o.summary === 'string' ? o.summary.slice(0, 500) : 'Extraction complete.';
  delete o.summary;
  const fields = normalizeListingInput(kind, o);
  if (!Object.keys(fields).length) throw new Error('empty');
  return { fields, summary };
}

/** Draft a listing from document text. Never throws. */
export async function extractListingDraft(kind: ListingKind, text: string): Promise<{ draft: ListingDraft; provider: string }> {
  const { result, provider } = await aiDraft<ListingDraft>({
    systemPrompt: SYSTEM(kind),
    userPrompt: `Document text:\n"""\n${text}\n"""\nExtract the ${kind} listing as JSON.`,
    temperature: 0.2,
    parse: (content) => parseDraftContent(kind, content),
    fallback: () => ({ fields: {}, summary: AI_UNAVAILABLE_MESSAGE }),
  });
  return { draft: result, provider };
}

/** Draft a listing from 1-4 product photos. This does NOT go through
 * runParallelJsonEnsemble (text-only router) — it calls Gemini's vision
 * endpoint directly via callGeminiVisionJson, since Gemini is the only
 * configured provider with image support. Never throws: missing
 * GEMINI_API_KEY, a provider error, or an unparsable response all degrade to
 * the same friendly "could not extract" draft the text path already uses, so
 * the manual/PDF/text paths are completely unaffected. */
export async function extractListingDraftFromImages(kind: ListingKind, images: GeminiImagePart[]): Promise<{ draft: ListingDraft; provider: string }> {
  try {
    const content = await callGeminiVisionJson({
      systemPrompt: VISION_SYSTEM(kind),
      userPrompt: `Extract the ${kind} listing as JSON from these product photos.`,
      images,
      temperature: 0.2,
    });
    const draft = parseDraftContent(kind, content);
    return { draft, provider: 'gemini' };
  } catch {
    // Never leak the underlying reason (missing key, stale key, rate limit,
    // malformed JSON, etc.) to the vendor — same fail-closed-and-friendly
    // contract as extractListingDraft's fallback.
    return { draft: { fields: {}, summary: AI_UNAVAILABLE_MESSAGE_PHOTOS }, provider: 'fallback' };
  }
}
