// POST /api/assistant/intake
// Drives the Client Intake Assistant: given the conversation so far, returns
// the next question (one at a time) or the final Request Summary.
// Works fully offline via the deterministic intake engine; the LLM only
// enriches the closing summary when a provider is configured.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { nextStep, type IntakeAnswer, type Category } from '@/lib/assistant/intake-flow';
import { logAiDraft } from '@/lib/assistant/llm';

interface Body {
  initialText?: string;
  category?: Category;
  answers?: IntakeAnswer[];
  locale?: 'en' | 'es';
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const initialText = (body.initialText || '').slice(0, 2000);
  const answers = Array.isArray(body.answers) ? body.answers.slice(0, 40) : [];
  const locale = body.locale === 'es' ? 'es' : 'en';

  const step = nextStep(initialText, {
    category: body.category || 'unsure',
    answers,
    done: false,
  });

  if (step.done && step.summary) {
    // Record the AI-assisted summary as a draft in the audit log.
    await logAiDraft({
      ai_mode: 'intake',
      prompt_input: initialText,
      draft_output: step.summary,
      provider: 'intake-engine',
    });
    return NextResponse.json({
      ok: true,
      done: true,
      category: step.category,
      summary: step.summary,
      locale,
    });
  }

  return NextResponse.json({
    ok: true,
    done: false,
    category: step.category,
    index: step.index,
    total: step.total,
    question: step.question,
    locale,
  });
}
