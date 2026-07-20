// POST /api/chat  { messages:[{role,content}], mode?:'public'|'vendor', locale? }
// NXT//LINK assistant. Answers questions and, in 'vendor' mode, helps a company
// describe what they provide. Uses aiDraft (never throws; deterministic fallback
// when no LLM key). Logs to ai_draft_logs (best-effort).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { aiDraft, logAiDraft } from '@/lib/assistant/llm';

interface ChatMsg { role: 'user' | 'assistant' | 'system'; content: string }
interface ChatReply { reply: string; suggested_actions?: string[] }

const SYSTEM = `You are the NXT//LINK assistant — a bilingual (EN/ES) helper for a private
AI sourcing desk that connects El Paso / Juárez warehouses with vetted vendors.
Rules:
- Be concise, professional, and helpful. Plain language.
- You NEVER reveal vendor identities; a human at NXT//LINK reviews everything.
- You are not a lawyer; do not give legal advice.
- In 'vendor' mode, help a company explain what they provide, which categories
  they serve, and their service areas — encourage them to register.
- In 'public' mode, help a warehouse describe their need and point them to the
  right category. Suggest "Start My Search" when appropriate.
Return ONLY JSON: {"reply": string, "suggested_actions": string[]}`;

export async function POST(req: Request) {
  let body: { messages?: ChatMsg[]; mode?: string; locale?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  const MAX_MSG_LEN = 4000;
  const messages = Array.isArray(body.messages)
    ? body.messages.slice(-12).map((m) => ({ ...m, content: String(m.content ?? '').slice(0, MAX_MSG_LEN) }))
    : [];
  const mode = body.mode === 'vendor' ? 'vendor' : 'public';
  const locale = body.locale === 'es' ? 'es' : 'en';
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  if (!lastUser.trim()) return NextResponse.json({ ok: false, message: 'No message' }, { status: 400 });

  const transcript = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const userPrompt = `Mode: ${mode}. Reply language: ${locale === 'es' ? 'Spanish' : 'English'}.
Conversation so far:
${transcript}

Write the assistant's next reply as JSON.`;

  const { result, provider } = await aiDraft<ChatReply>({
    systemPrompt: SYSTEM,
    userPrompt,
    temperature: 0.6,
    parse: (content) => {
      const json = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const obj = JSON.parse(json) as ChatReply;
      if (!obj || typeof obj.reply !== 'string') throw new Error('bad shape');
      return obj;
    },
    fallback: () => fallbackReply(lastUser, mode, locale),
  });

  logAiDraft({
    ai_mode: 'chatbot',
    prompt_input: lastUser,
    draft_output: result,
    provider,
  }).catch(() => {});

  return NextResponse.json({ ok: true, provider, ...result });
}

// Deterministic, useful answer when no LLM provider is configured.
function fallbackReply(text: string, mode: 'public' | 'vendor', locale: 'en' | 'es'): ChatReply {
  const t = text.toLowerCase();
  const es = locale === 'es';
  if (mode === 'vendor') {
    return {
      reply: es
        ? 'Con gusto te registramos como proveedor. Dime: (1) nombre de tu empresa, (2) qué servicios o productos ofreces, (3) las zonas que cubres (El Paso, Juárez, Nuevo México) y (4) un correo de contacto. Con eso creo tu perfil y un humano de NXT//LINK te da seguimiento.'
        : "Happy to register your company. Tell me: (1) your company name, (2) what services or products you provide, (3) the areas you cover (El Paso, Juárez, New Mexico), and (4) a contact email. I'll create your profile and a human at NXT//LINK will follow up.",
      suggested_actions: ['open_vendor_signup'],
    };
  }
  const greet = /\b(hi|hello|hey|hola|buenas)\b/.test(t);
  return {
    reply: greet
      ? (es ? '¡Hola! Soy el asistente de NXT//LINK. ¿Qué necesita tu almacén? Puedo guiarte para encontrar el proveedor correcto.'
            : "Hi! I'm the NXT//LINK assistant. What does your warehouse need? I can guide you to the right vendor.")
      : (es ? 'Puedo ayudarte a describir lo que necesitas y enviarlo al equipo de NXT//LINK. Elige una categoría en "Iniciar búsqueda" o dime el problema en tus palabras.'
            : 'I can help you describe what you need and route it to the NXT//LINK team. Pick a category under "Start My Search", or describe the problem in your own words.'),
    suggested_actions: ['start_search'],
  };
}
