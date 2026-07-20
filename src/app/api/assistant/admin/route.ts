// POST /api/assistant/admin
// Admin AI: turns a client request into quote-ready drafts.
// Returns an internal summary, a protected (anonymized) quote packet, and a
// bilingual vendor-outreach message. Everything is a DRAFT until admin approves.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { ADMIN_PROMPT } from '@/lib/assistant/prompts';
import { aiDraft, logAiDraft } from '@/lib/assistant/llm';
import { isAdminRequest } from '@/lib/assistant/auth';

interface AdminDraft {
  internal_summary: {
    client_need: string;
    problem: string;
    quantity: string;
    timeline: string;
    location: string;
    budget: string;
    urgency: string;
    confidentiality: string;
    missing_info: string[];
    best_vendor_categories: string[];
    suggested_next_action: string;
  };
  quote_packet: {
    general_industry: string;
    general_location: string;
    problem_summary: string;
    scope: string;
    quantity: string;
    timeline: string;
    urgency: string;
    requirements: string[];
    questions_for_vendor: string[];
    quote_deadline: string;
  };
  vendor_outreach: { en: string; es: string };
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  let body: { request?: Record<string, unknown>; request_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }
  const r = body.request || {};
  const get = (k: string) => String(r[k] ?? (r.ai_summary as Record<string, unknown>)?.[k] ?? '');

  const userPrompt = `Create quote-ready drafts for this warehouse client request.
Respect confidentiality: the packet must be ANONYMOUS (no client name, general location only).
Return JSON exactly matching this shape:
{"internal_summary":{"client_need","problem","quantity","timeline","location","budget","urgency","confidentiality","missing_info":[],"best_vendor_categories":[],"suggested_next_action"},"quote_packet":{"general_industry","general_location","problem_summary","scope","quantity","timeline","urgency","requirements":[],"questions_for_vendor":[],"quote_deadline"},"vendor_outreach":{"en","es"}}

Request:
${JSON.stringify(r, null, 2)}`;

  const { result, provider } = await aiDraft<AdminDraft>({
    systemPrompt: ADMIN_PROMPT,
    userPrompt,
    temperature: 0.4,
    parse: (content) => JSON.parse(stripFences(content)) as AdminDraft,
    fallback: () => fallbackAdminDraft(get),
  });

  await logAiDraft({
    ai_mode: 'admin',
    request_id: body.request_id ?? null,
    prompt_input: userPrompt,
    draft_output: result,
    provider,
    visibility_used: { hide_client_identity: true, hide_budget: true },
  });

  return NextResponse.json({ ok: true, is_draft: true, provider, draft: result });
}

function fallbackAdminDraft(get: (k: string) => string): AdminDraft {
  const category = get('category') || 'Warehouse service';
  const location = get('location') || 'El Paso';
  const generalLocation = location.split(',')[0] || 'El Paso area';
  const quantity = get('quantity');
  const timeline = get('deadline') || 'To be confirmed';
  const urgency = get('urgency') || 'Standard';
  const budget = get('budget_range');
  const problem = get('problem') || 'Client described a warehouse operational need.';
  const missing: string[] = Array.isArray((get('missing_info') as unknown))
    ? (get('missing_info') as unknown as string[])
    : [];

  const recs: string[] = (() => {
    const c = category.toLowerCase();
    if (c.includes('forklift')) return ['Forklifts & Material Handling', 'Field Service & Maintenance'];
    if (c.includes('staff')) return ['Industrial Staffing', 'Workforce Solutions'];
    if (c.includes('tech')) return ['Warehouse Management', 'Automation & Robotics'];
    if (c.includes('transport') || c.includes('logist')) return ['Transportation Management', 'Cross-Border & Customs'];
    if (c.includes('facility') || c.includes('maintenance')) return ['Facility Maintenance', 'MEP & Compliance'];
    return ['NXT//LINK Discovery'];
  })();

  return {
    internal_summary: {
      client_need: category,
      problem,
      quantity,
      timeline,
      location,
      budget: budget || 'Not shared',
      urgency,
      confidentiality: 'Client identity hidden; budget hidden until approved.',
      missing_info: missing.length ? missing : ['Confirm exact deadline', 'Confirm budget range'],
      best_vendor_categories: recs,
      suggested_next_action: 'Review packet, approve, then route to matching vendors.',
    },
    quote_packet: {
      general_industry: 'Warehouse / logistics',
      general_location: generalLocation,
      problem_summary: problem,
      scope: category,
      quantity,
      timeline,
      urgency,
      requirements: ['Confirm service-area coverage', 'Confirm availability by deadline'],
      questions_for_vendor: ['Can you serve this location?', 'Estimated price range?', 'Response time?', 'What do you need to quote?'],
      quote_deadline: timeline,
    },
    vendor_outreach: {
      en: `NXT//LINK has a protected warehouse opportunity that may fit your service area. A warehouse operation in ${generalLocation} is looking for ${category.toLowerCase()}${quantity ? ` for ${quantity}` : ''}. Client identity is protected at this stage. Please confirm availability, estimated price range, response time, and any information needed to quote.`,
      es: `NXT//LINK tiene una oportunidad protegida de almacén que puede encajar en su área de servicio. Una operación de almacén en ${generalLocation} busca ${category.toLowerCase()}${quantity ? ` para ${quantity}` : ''}. La identidad del cliente está protegida en esta etapa. Por favor confirme disponibilidad, rango de precio estimado, tiempo de respuesta y cualquier información necesaria para cotizar.`,
    },
  };
}

function stripFences(s: string): string {
  return s.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}
