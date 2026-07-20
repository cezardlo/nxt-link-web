// POST /api/assistant/vendor-quote
// Vendor AI: drafts a quote response from a protected packet + the vendor's
// profile and saved template. Output is a DRAFT the vendor must review/approve.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { VENDOR_QUOTE_PROMPT } from '@/lib/assistant/prompts';
import { aiDraft, logAiDraft } from '@/lib/assistant/llm';

interface QuoteDraft {
  short_response: string;
  price_range: string;
  included: string;
  excluded: string;
  timeline: string;
  required_next_info: string;
  terms: string;
  attachments_needed: string;
}

export async function POST(req: Request) {
  let body: {
    packet?: Record<string, unknown>;
    vendorProfile?: Record<string, unknown>;
    template?: Record<string, unknown>;
    vendor_id?: string;
    locale?: 'en' | 'es';
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const locale = body.locale === 'es' ? 'es' : 'en';
  const packet = body.packet || {};
  const template = body.template || {};
  const profile = body.vendorProfile || {};

  const userPrompt = `Draft a vendor quote response (DRAFT only) in ${locale === 'es' ? 'Spanish' : 'English'}.
Use the vendor's saved template values where present; ask for missing info instead of inventing prices.
Return JSON exactly: {"short_response","price_range","included","excluded","timeline","required_next_info","terms","attachments_needed"}

Opportunity packet:
${JSON.stringify(packet, null, 2)}

Vendor profile:
${JSON.stringify(profile, null, 2)}

Vendor saved template:
${JSON.stringify(template, null, 2)}`;

  const { result, provider } = await aiDraft<QuoteDraft>({
    systemPrompt: VENDOR_QUOTE_PROMPT,
    userPrompt,
    temperature: 0.4,
    parse: (content) => JSON.parse(stripFences(content)) as QuoteDraft,
    fallback: () => fallbackQuote(packet, template, locale),
  });

  await logAiDraft({
    ai_mode: 'vendor_quote',
    vendor_id: body.vendor_id ?? null,
    prompt_input: userPrompt,
    draft_output: result,
    provider,
  });

  return NextResponse.json({ ok: true, is_draft: true, provider, draft: result });
}

function fallbackQuote(
  packet: Record<string, unknown>,
  template: Record<string, unknown>,
  locale: 'en' | 'es',
): QuoteDraft {
  const scope = String(packet.scope || packet.problem_summary || 'the requested service');
  const loc = String(packet.general_location || 'your area');
  const tpl = (k: string) => String(template[k] || '');
  const es = locale === 'es';

  return {
    short_response: es
      ? `Gracias por la oportunidad. Podemos atender ${scope.toLowerCase()} en ${loc}. A continuación un borrador de cotización para su revisión.`
      : `Thanks for the opportunity. We can serve ${scope.toLowerCase()} in ${loc}. Below is a draft quote for your review.`,
    price_range: tpl('labor_rate') || tpl('pricing_model') || (es ? 'Por confirmar tras detalles' : 'To confirm after details'),
    included: tpl('included') || (es ? 'Mano de obra y servicio estándar' : 'Standard labor and service'),
    excluded: tpl('excluded') || (es ? 'Partes mayores, impuestos' : 'Major parts, taxes'),
    timeline: tpl('lead_time') || String(packet.timeline || (es ? 'Por confirmar' : 'To confirm')),
    required_next_info: es
      ? 'Confirme cantidad, ubicación exacta y fecha límite.'
      : 'Please confirm quantity, exact location, and deadline.',
    terms: tpl('terms') || tpl('payment_terms') || (es ? 'Términos estándar de NXT//LINK' : 'Standard NXT//LINK terms'),
    attachments_needed: es ? 'Cotización formal en PDF, hoja de especificaciones' : 'Formal quote PDF, spec sheet',
  };
}

function stripFences(s: string): string {
  return s.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}
