// POST /api/assistant/terms
// Vendor AI: drafts quote terms + the NXT//LINK introduction/commission
// agreement. Always a DRAFT and explicitly NOT legal advice.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { VENDOR_QUOTE_PROMPT } from '@/lib/assistant/prompts';
import { aiDraft, logAiDraft } from '@/lib/assistant/llm';
import { generateTerms, type TermsBlock, type TermsOptions } from '@/lib/assistant/terms';

export async function POST(req: Request) {
  let body: TermsOptions & { locale?: 'en' | 'es'; vendor_id?: string; scope?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }
  const locale = body.locale === 'es' ? 'es' : 'en';
  const opts: TermsOptions = {
    vendorName: body.vendorName,
    category: body.category,
    validityDays: body.validityDays,
    nda: body.nda,
    emergency: body.emergency,
    warrantyMonths: body.warrantyMonths,
  };

  const baseline = generateTerms(locale, opts);

  const userPrompt = `Refine these DRAFT vendor quote terms for a ${opts.category || 'warehouse'} job${opts.vendorName ? ` by ${opts.vendorName}` : ''} in ${locale === 'es' ? 'Spanish' : 'English'}.
Keep them professional, fair, and concise. Do NOT give legal advice. Keep the NXT//LINK introduction agreement clause and the disclaimer intact.
Return JSON with exactly these keys: quote_validity, payment_terms, warranty, exclusions, lead_time, emergency_service, liability_insurance, confidentiality, introduction_agreement, terms_and_conditions, disclaimer.

Starting draft:
${JSON.stringify(baseline, null, 2)}`;

  const { result, provider } = await aiDraft<TermsBlock>({
    systemPrompt: VENDOR_QUOTE_PROMPT,
    userPrompt,
    temperature: 0.3,
    parse: (content) => {
      const parsed = JSON.parse(content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()) as Partial<TermsBlock>;
      // Always force the disclaimer + introduction agreement to remain present.
      return { ...baseline, ...parsed, disclaimer: baseline.disclaimer, introduction_agreement: parsed.introduction_agreement || baseline.introduction_agreement };
    },
    fallback: () => baseline,
  });

  await logAiDraft({
    ai_mode: 'vendor_quote',
    vendor_id: body.vendor_id ?? null,
    prompt_input: userPrompt,
    draft_output: result,
    provider,
  });

  return NextResponse.json({ ok: true, is_draft: true, provider, terms: result });
}
