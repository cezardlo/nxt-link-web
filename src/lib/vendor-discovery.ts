import { getSupabaseClient } from '@/lib/supabase/client';
import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { normalizePublicHttpUrl } from '@/lib/http/url-safety';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { boundedDataPrompt, sanitizeUntrustedLlmInput } from '@/lib/llm/sanitize';

type ExtractedVendor = {
  company_name: string | null;
  company_url: string | null;
  description: string | null;
  primary_category: string | null;
  extraction_confidence: number | null;
  status: string | null;
};

function normalizeTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  const withoutFences = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(withoutFences) as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeVendor(extracted: Record<string, unknown>, sourceUrl: string): ExtractedVendor {
  return {
    company_name: asString(extracted.company_name) || asString(extracted.name),
    company_url: asString(extracted.company_url) || sourceUrl,
    description: asString(extracted.description),
    primary_category: asString(extracted.primary_category) || 'Other',
    extraction_confidence: asNumber(extracted.extraction_confidence) ?? 0.7,
    status: (asString(extracted.status) || 'approved').toLowerCase(),
  };
}

export async function discoverVendorFromUrl(urlInput: string): Promise<{
  inserted: boolean;
  vendor: ExtractedVendor;
}> {
  const url = await normalizePublicHttpUrl(urlInput);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  }

  const websiteResponse = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; NXTLinkBot/1.0; +https://nxt-link.local)',
      Accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  }, {
    cacheTtlMs: 10 * 60_000,
    staleIfErrorMs: 2 * 60 * 60_000,
    dedupeInFlight: true,
  });

  if (!websiteResponse.ok) {
    throw new Error(`Website fetch failed with status ${websiteResponse.status}.`);
  }

  const html = await websiteResponse.text();
  const text = normalizeTextFromHtml(html).slice(0, 15000);
  const sanitized = sanitizeUntrustedLlmInput(text, 15000);

  if (sanitized.sanitized_text.length < 120) {
    throw new Error('Website text is too short to extract company data.');
  }

  const ensemble = await runParallelJsonEnsemble<Record<string, unknown>>({
    systemPrompt:
      'Extract vendor/company details from website text. Return JSON only with keys: company_name, company_url, description, primary_category, extraction_confidence, status.',
    userPrompt: `Source URL: ${url}\nSanitization risk score: ${sanitized.risk_score}\nSanitization flags: ${sanitized.flags.join(', ') || 'none'}\n\n${boundedDataPrompt('Website Text', sanitized.sanitized_text)}`,
    temperature: 0.1,
    budget: {
      preferLowCostProviders: true,
      maxProviders: 3,
      reserveCompletionTokens: 250,
    },
    parse: (content) => parseJsonObject(content),
  });
  const extracted = ensemble.result;
  const vendor = normalizeVendor(extracted, url);

  if (!vendor.company_name) {
    throw new Error('Extraction did not return a company_name.');
  }

  const supabase = getSupabaseClient({ admin: true });

  const { data: existing, error: lookupError } = await supabase
    .from('vendors')
    .select('id')
    .eq('company_url', vendor.company_url)
    .limit(1);

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existing && existing.length > 0) {
    const { error: updateError } = await supabase
      .from('vendors')
      .update(vendor)
      .eq('id', existing[0].id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { inserted: false, vendor };
  }

  const { error: insertError } = await supabase.from('vendors').insert(vendor);

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { inserted: true, vendor };
}
