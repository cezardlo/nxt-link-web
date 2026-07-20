// AI brochure extraction: turn an uploaded vendor document into a DRAFT
// profile. The AI never invents facts — anything not in the document stays
// empty. Nothing is saved here; the vendor reviews and approves in the portal.

import { aiDraft } from '@/lib/assistant/llm';

export interface ProfileDraft {
  company_name: string | null;
  description: string | null;
  categories: string[];
  service_areas: string[];
  industries: string[];
  client_types: string[];
  website: string | null;
  phone: string | null;
  city: string | null;
  summary: string;
}

const MAX_TEXT_CHARS = 20000;

/** Extract plain text from an uploaded file. Returns null if unsupported. */
export async function extractTextFromBytes(bytes: Uint8Array, fileType: string, fileName: string): Promise<string | null> {
  const isPdf = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  try {
    if (isPdf) {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const doc = await getDocumentProxy(bytes);
      const { text } = await extractText(doc, { mergePages: true });
      return String(text || '').slice(0, MAX_TEXT_CHARS) || null;
    }
    if (fileType.startsWith('text/')) {
      return new TextDecoder().decode(bytes).slice(0, MAX_TEXT_CHARS) || null;
    }
  } catch {
    return null;
  }
  return null; // images / office docs: not extractable yet
}

const SYSTEM = `You extract vendor-profile data from a company brochure for NXT//LINK,
a private B2B sourcing platform for the El Paso / Ciudad Juárez industrial region.
STRICT RULES:
- NEVER invent, guess, or embellish. Only use facts stated in the document.
- A missing field is CORRECT; a guessed field is WRONG. Use null / [] when absent.
- description: 2-4 sentences, factual, in the document's own terms (English).
- categories/service_areas/industries/client_types: short phrases from the document.
- summary: one sentence telling the vendor what you found and what you could not find.
Return ONLY JSON:
{"company_name":string|null,"description":string|null,"categories":string[],
"service_areas":string[],"industries":string[],"client_types":string[],
"website":string|null,"phone":string|null,"city":string|null,"summary":string}`;

function cleanArr(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => String(s).trim().slice(0, 80)).filter(Boolean).slice(0, max);
}
function cleanStr(v: unknown, max: number): string | null {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : '';
  return s || null;
}

/** Draft a vendor profile from document text. Never throws. */
export async function extractProfileDraft(text: string): Promise<{ draft: ProfileDraft; provider: string }> {
  const { result, provider } = await aiDraft<ProfileDraft>({
    systemPrompt: SYSTEM,
    userPrompt: `Document text:\n"""\n${text}\n"""\nExtract the vendor profile as JSON.`,
    temperature: 0.2,
    parse: (content) => {
      const json = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const o = JSON.parse(json) as Record<string, unknown>;
      return {
        company_name: cleanStr(o.company_name, 200),
        description: cleanStr(o.description, 4000),
        categories: cleanArr(o.categories, 30),
        service_areas: cleanArr(o.service_areas, 20),
        industries: cleanArr(o.industries, 20),
        client_types: cleanArr(o.client_types, 20),
        website: cleanStr(o.website, 300),
        phone: cleanStr(o.phone, 60),
        city: cleanStr(o.city, 120),
        summary: cleanStr(o.summary, 500) || 'Extraction complete.',
      };
    },
    fallback: () => ({
      company_name: null, description: null, categories: [], service_areas: [],
      industries: [], client_types: [], website: null, phone: null, city: null,
      summary: 'AI is unavailable right now — no draft could be created. Please fill in your profile manually or try again later.',
    }),
  });
  return { draft: result, provider };
}
