// src/lib/ai/extract-conference-intel.ts
// LLM-powered structured extraction from merged conference content.

import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { sanitizeUntrustedLlmInput, boundedDataPrompt } from '@/lib/llm/sanitize';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Exhibitor = {
  company_name: string;
  website: string;
  what_they_do: string;
  products: string[];
  technologies: string[];
  industry_tags: string[];
};

export type AttendeeProfile = {
  industry: string;
  job_roles: string[];
};

export type ConferenceIntelExtraction = {
  conference_name: string;
  industry: string;
  location: string;
  dates: string;
  exhibitors: Exhibitor[];
  attendee_profiles: AttendeeProfile[];
  themes: string[];
  confidence_score: number;
};

// ─── Prompt ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a structured data extraction engine for conference intelligence.
You receive scraped text from conference websites and extract exhibitor, attendee, and theme data.

STRICT RULES:
- Return ONLY valid JSON matching the exact schema below.
- Do NOT guess or fabricate data. If unknown, leave the field empty ("" or []).
- No marketing language: do NOT use words like "leading", "innovative", "cutting-edge", "world-class".
- Keep "what_they_do" to one clear factual sentence per company.
- Extract only what is directly supported by the input text.
- Deduplicate companies — if the same company appears multiple times, merge into one entry.
- Normalize company names (e.g., "ABC Corp." and "ABC Corporation" → pick the most complete form).
- If a company website URL is visible in the text, include it. Otherwise leave website as "".
- Tag each exhibitor with relevant industry_tags based on their description.
- confidence_score: 0-100 based on how much data was extractable. Below 50 means very sparse data.

JSON Schema:
{
  "conference_name": "string",
  "industry": "string — primary industry of this conference",
  "location": "string — city, state/country if available",
  "dates": "string — date range if available",
  "exhibitors": [
    {
      "company_name": "string",
      "website": "string (URL or empty)",
      "what_they_do": "string — 1 factual sentence, no fluff",
      "products": ["string"],
      "technologies": ["string"],
      "industry_tags": ["string"]
    }
  ],
  "attendee_profiles": [
    {
      "industry": "string",
      "job_roles": ["string"]
    }
  ],
  "themes": ["string — key topics/themes of the conference"],
  "confidence_score": "number 0-100"
}`;

// ─── Parser ─────────────────────────────────────────────────────────────────

function parseExtractionResponse(raw: string): ConferenceIntelExtraction {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleaned);

  // Validate and normalize
  const result: ConferenceIntelExtraction = {
    conference_name: typeof parsed.conference_name === 'string' ? parsed.conference_name : '',
    industry: typeof parsed.industry === 'string' ? parsed.industry : '',
    location: typeof parsed.location === 'string' ? parsed.location : '',
    dates: typeof parsed.dates === 'string' ? parsed.dates : '',
    exhibitors: Array.isArray(parsed.exhibitors)
      ? parsed.exhibitors.map(normalizeExhibitor).filter((e: Exhibitor) => e.company_name.length > 0)
      : [],
    attendee_profiles: Array.isArray(parsed.attendee_profiles)
      ? parsed.attendee_profiles.map(normalizeAttendeeProfile).filter((a: AttendeeProfile) => a.industry.length > 0 || a.job_roles.length > 0)
      : [],
    themes: Array.isArray(parsed.themes)
      ? parsed.themes.filter((t: unknown) => typeof t === 'string' && t.length > 0)
      : [],
    confidence_score: typeof parsed.confidence_score === 'number'
      ? Math.min(100, Math.max(0, Math.round(parsed.confidence_score)))
      : 0,
  };

  // Deduplicate exhibitors by normalized name
  result.exhibitors = deduplicateExhibitors(result.exhibitors);

  return result;
}

function normalizeExhibitor(raw: unknown): Exhibitor {
  const e = raw as Record<string, unknown>;
  return {
    company_name: normalizeCompanyName(String(e?.company_name ?? '')),
    website: normalizeUrl(String(e?.website ?? '')),
    what_they_do: stripMarketingFluff(String(e?.what_they_do ?? '')),
    products: toStringArray(e?.products),
    technologies: toStringArray(e?.technologies),
    industry_tags: toStringArray(e?.industry_tags),
  };
}

function normalizeAttendeeProfile(raw: unknown): AttendeeProfile {
  const a = raw as Record<string, unknown>;
  return {
    industry: String(a?.industry ?? ''),
    job_roles: toStringArray(a?.job_roles),
  };
}

function normalizeCompanyName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/,?\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Co\.?)$/i, '')
    .trim();
}

function normalizeUrl(url: string): string {
  if (!url || url === 'undefined' || url === 'null') return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.href;
  } catch {
    return '';
  }
}

const FLUFF_WORDS = /\b(leading|innovative|cutting-edge|world-class|best-in-class|groundbreaking|revolutionary|disruptive|next-generation|state-of-the-art|premier)\b/gi;

function stripMarketingFluff(text: string): string {
  return text.replace(FLUFF_WORDS, '').replace(/\s+/g, ' ').trim();
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function deduplicateExhibitors(exhibitors: Exhibitor[]): Exhibitor[] {
  const map = new Map<string, Exhibitor>();

  for (const ex of exhibitors) {
    const key = ex.company_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = map.get(key);

    if (!existing) {
      map.set(key, ex);
      continue;
    }

    // Merge: keep the entry with more data
    map.set(key, {
      company_name: ex.company_name.length > existing.company_name.length ? ex.company_name : existing.company_name,
      website: ex.website || existing.website,
      what_they_do: ex.what_they_do.length > existing.what_they_do.length ? ex.what_they_do : existing.what_they_do,
      products: [...new Set([...existing.products, ...ex.products])],
      technologies: [...new Set([...existing.technologies, ...ex.technologies])],
      industry_tags: [...new Set([...existing.industry_tags, ...ex.industry_tags])],
    });
  }

  return Array.from(map.values());
}

// ─── Main Extraction Function ───────────────────────────────────────────────

export async function extractConferenceIntel(
  mergedText: string,
  conferenceUrl: string,
): Promise<{
  extraction: ConferenceIntelExtraction;
  provider: string;
  quality: 'high' | 'medium' | 'low';
}> {
  const { sanitized_text } = sanitizeUntrustedLlmInput(mergedText, 60_000);

  const userPrompt = `Extract structured conference intelligence from the following scraped conference website content.

Conference URL: ${conferenceUrl}

${boundedDataPrompt('CONFERENCE_CONTENT', sanitized_text)}

Extract all exhibitors, attendee profiles, and themes. Return valid JSON only.`;

  const { result, selectedProvider } = await runParallelJsonEnsemble<ConferenceIntelExtraction>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.05,
    maxProviders: 2,
    budget: {
      reserveCompletionTokens: 4000,
      preferLowCostProviders: false,
    },
    parse: (content) => parseExtractionResponse(content),
  });

  const quality: 'high' | 'medium' | 'low' =
    result.confidence_score >= 70 ? 'high' :
    result.confidence_score >= 40 ? 'medium' : 'low';

  return { extraction: result, provider: selectedProvider, quality };
}
