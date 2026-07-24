'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IBM_Plex_Sans } from 'next/font/google';
import { ASSISTANT } from '@/lib/assistant/branding';
import { useLang } from '@/components/LanguageToggle';
import PublicHeader from '@/components/PublicHeader';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-intake',
  display: 'swap',
});

// ---- Types for API responses ----
interface Question {
  id: string;
  en: string;
  es: string;
  why_en?: string;
  why_es?: string;
}

interface IntakeResponseMore {
  ok: boolean;
  done: false;
  category: string;
  index: number;
  total: number;
  question: Question;
  // Set when this step just re-opened classification because the latest
  // answer contradicted the category the assistant had locked onto (e.g.
  // "not a forklift") — the UI acknowledges the switch instead of silently
  // changing the line of questioning.
  corrected?: boolean;
}

interface RequestSummary {
  problem?: string;
  category?: string;
  quantity?: string | number;
  location?: string;
  deadline?: string;
  budget_range?: string;
  urgency?: string;
  nda_required?: boolean;
  permissions?: string[];
  missing_info?: string[];
  recommended_categories?: string[];
  [key: string]: unknown;
}

interface IntakeResponseDone {
  ok: boolean;
  done: true;
  category: string;
  summary: RequestSummary;
}

type IntakeResponse = IntakeResponseMore | IntakeResponseDone;

interface SubmitResponse {
  ok: boolean;
  public_ref: string;
}

interface Answer {
  q: string;
  a: string;
  id: string;
}

interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
}

type Phase = 'intro' | 'asking' | 'summary' | 'submitted';

// ---- Style tokens ----
// Design System v1.0 (vault/Design-System.md) via the `--spec-*` CSS vars
// already wired in globals.css — flipped from the old dark #0A0A0F/system-ui
// theme to the light spec (Flow Blueprint 2026-07-22, Slice 2). Two levels
// of dark-surface secondary text (TEXT_2/TEXT_3 at ~2.5-3.2:1, an audited
// contrast failure) collapse into ONE AA-compliant secondary color on light
// surfaces — differentiated by size/weight instead of a third, dimmer gray.
const PAGE_BG = 'var(--spec-warm-white)';
const CARD_BG = '#ffffff';
const INPUT_BG = 'var(--spec-warm-white)';
const BORDER = 'var(--spec-border)';
const TEXT = 'var(--spec-ink)';
const TEXT_2 = 'var(--spec-text-2nd)';
const TEXT_3 = 'var(--spec-text-2nd)';
const MUTED = 'var(--spec-text-2nd)';
const ACCENT = 'var(--spec-violet)';
// Disabled primary buttons: a neutral fill (WCAG doesn't require contrast on
// disabled controls, but a dim violet-on-white reads as low-contrast text,
// not "disabled" — a neutral surface reads unambiguously as inactive).
const DISABLED_BG = 'var(--spec-border)';
const DISABLED_TEXT = 'var(--spec-text-2nd)';
const GREEN = 'var(--spec-success)';
const RED = 'var(--spec-error)';
const FONT_BODY = 'var(--font-ibm-plex-sans-intake),"IBM Plex Sans",system-ui,-apple-system,sans-serif';
const FONT_HEAD = 'var(--font-space-grotesk),"Space Grotesk",system-ui,sans-serif';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: INPUT_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  color: TEXT,
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: FONT_BODY,
};

// A buyer arriving from a vendor storefront that has no listings yet
// (marketplace/vendor/[id]/page.tsx's quote CTA) lands here with a cheap,
// client-only hint — ?vendor=<name>&vendor_id=<id>. No schema/API change:
// we just prefill the intro message and show a small banner so their intent
// to reach THAT vendor isn't lost. The mention flows into the free-text
// `initialText` sent to /api/assistant/intake like any other buyer wording.
function IntakeInner() {
  const sp = useSearchParams();
  const vendorHint = sp.get('vendor') || '';
  // Shared `nxt_lang` preference (same mechanism as the header on every other
  // anonymous-buyer page) — a buyer who switched to ES on the homepage lands
  // here already in ES, instead of this page's language resetting to EN.
  const [locale, setLocale] = useLang();
  const [initialText, setInitialText] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<RequestSummary | null>(null);
  const [category, setCategory] = useState<string>('unsure');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState('');

  // contact + files for summary phase
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [showFiles, setShowFiles] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);

  // submitted state
  const [publicRef, setPublicRef] = useState('');

  const isEs = locale === 'es';
  const tr = (en: string, es: string) => (isEs ? es : en);

  // Prefill once from the vendor hint so the mention rides along in whatever
  // the buyer sends — editable, not locked in.
  useEffect(() => {
    if (vendorHint) setInput((v) => v || tr(`Regarding ${vendorHint}: `, `Sobre ${vendorHint}: `));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorHint]);

  const introPlaceholder = tr(
    'I need maintenance for 6 forklifts in El Paso next week.',
    'Necesito mantenimiento para 6 montacargas en El Paso la próxima semana.'
  );

  async function callIntake(nextInitialText: string, nextAnswers: Answer[]) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/assistant/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialText: nextInitialText,
          category,
          answers: nextAnswers,
          locale,
        }),
      });
      const data = (await res.json()) as IntakeResponse;
      if (!data.ok) throw new Error('not ok');

      if (data.done) {
        setCategory(data.category);
        setSummary(data.summary);
        setCurrentQuestion(null);
        setProgress('');
        setPhase('summary');
      } else {
        setCategory(data.category);
        setCurrentQuestion(data.question);
        const qText = isEs ? data.question.es : data.question.en;
        setMessages((m) => {
          const next = [...m, { role: 'assistant' as const, text: qText }];
          // Acknowledge a mid-conversation correction (e.g. the buyer said
          // "not a forklift") instead of silently swapping the line of
          // questioning — surfaces that we heard them.
          if (data.corrected) {
            next.splice(next.length - 1, 0, {
              role: 'assistant',
              text: tr(
                "Got it — let's back up and ask more general questions.",
                'Entendido — retrocedamos y hagamos preguntas más generales.'
              ),
            });
          }
          return next;
        });
        setProgress(tr(
          `Question ${data.index + 1} of ${data.total}`,
          `Pregunta ${data.index + 1} de ${data.total}`
        ));
        setPhase('asking');
      }
    } catch {
      setError(tr(
        'Something went wrong. Please try again.',
        'Algo salió mal. Por favor inténtalo de nuevo.'
      ));
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const value = input.trim();
    if (!value || loading) return;

    if (phase === 'intro') {
      setInitialText(value);
      setMessages((m) => [...m, { role: 'user', text: value }]);
      setInput('');
      await callIntake(value, []);
      return;
    }

    if (phase === 'asking' && currentQuestion) {
      const qText = isEs ? currentQuestion.es : currentQuestion.en;
      const newAnswer: Answer = { q: qText, a: value, id: currentQuestion.id };
      const nextAnswers = [...answers, newAnswer];
      setAnswers(nextAnswers);
      setMessages((m) => [...m, { role: 'user', text: value }]);
      setInput('');
      await callIntake(initialText, nextAnswers);
      return;
    }
  }

  function handleEditAnswers() {
    // Simple approach: restart the conversation so the client can redo.
    setAnswers([]);
    setCurrentQuestion(null);
    setSummary(null);
    setCategory('unsure');
    setProgress('');
    setError('');
    setMessages((m) => [
      ...m,
      {
        role: 'assistant',
        text: tr(
          "Let's revise your request. Please describe your need again.",
          'Revisemos tu solicitud. Por favor describe tu necesidad de nuevo.'
        ),
      },
    ]);
    setPhase('intro');
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setFileNames(Array.from(files).map((f) => f.name));
  }

  async function handleSubmit() {
    if (!summary) return;
    if (!contactName.trim() || !contactEmail.trim()) {
      setError(tr(
        'Please enter your name and email.',
        'Por favor ingresa tu nombre y correo.'
      ));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/platform/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          contact: { name: contactName.trim(), email: contactEmail.trim() },
          locale,
          vendor_scope: 'both',
        }),
      });
      const data = (await res.json()) as SubmitResponse;
      if (!data.ok) throw new Error('not ok');
      setPublicRef(data.public_ref);
      setPhase('submitted');
    } catch {
      setError(tr(
        'Could not submit your request. Please try again.',
        'No se pudo enviar tu solicitud. Por favor inténtalo de nuevo.'
      ));
    } finally {
      setLoading(false);
    }
  }

  // ---- Render helpers ----
  const guardrail = tr(
    'Drafts are AI-assisted. A human at NXT//LINK reviews every request. Vendor names are never shown here.',
    'Los borradores son asistidos por AI. Un humano de NXT//LINK revisa cada solicitud. Los nombres de proveedores nunca se muestran aquí.'
  );

  return (
    <div className={ibmPlexSans.variable} style={{ minHeight: '100vh', background: PAGE_BG, color: TEXT, fontFamily: FONT_BODY }}>
      {/* ONE shared public header (Flow Blueprint 2026-07-22 §4, Slice 2) —
          replaces this page's old header-less/custom EN|ES-only nav. Bound
          to this page's own `locale` state (now the shared useLang/nxt_lang
          mechanism) so the header's toggle and the assistant's language stay
          the same single source of truth. */}
      <PublicHeader lang={locale} onLangChange={setLocale} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 60px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 'var(--spec-text-h2)', fontWeight: 800, letterSpacing: 'var(--spec-tracking-heading)', marginBottom: 6, lineHeight: 1.2, fontFamily: FONT_HEAD, color: TEXT }}>
            {isEs ? ASSISTANT.name_es : ASSISTANT.name}
          </h1>
          <p style={{ color: TEXT_3, fontSize: 15 }}>
            {isEs ? ASSISTANT.subtitle_es : ASSISTANT.subtitle}
          </p>
          {vendorHint && phase !== 'submitted' && (
            <div
              style={{
                marginTop: 14,
                fontSize: 13,
                color: 'var(--spec-violet-deep)',
                background: 'rgba(108,92,224,.08)',
                border: '1px solid rgba(108,92,224,.25)',
                borderRadius: 10,
                padding: '9px 12px',
                lineHeight: 1.5,
              }}
            >
              {tr(
                `Continuing from ${vendorHint}'s profile — we'll match you with vendors including them.`,
                `Continuando desde el perfil de ${vendorHint} — te conectaremos con proveedores, incluyéndolos a ellos.`
              )}
            </div>
          )}
        </div>

        {/* Submitted success card */}
        {phase === 'submitted' && (
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              padding: 32,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#EDF7F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 28,
                color: GREEN,
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: 'var(--spec-text-h3)', fontWeight: 800, letterSpacing: 'var(--spec-tracking-heading)', marginBottom: 12, fontFamily: FONT_HEAD }}>
              {tr('Request received', 'Solicitud recibida')}
            </h2>
            <p style={{ color: TEXT_2, fontSize: 16, marginBottom: 8 }}>
              {tr('Your reference:', 'Tu referencia:')}{' '}
              <span style={{ color: ACCENT, fontWeight: 700 }}>{publicRef}</span>
            </p>
            {/* "How it works" transparency timeline — an easy question ("what
                happens next?") converts better than a vague promise. */}
            <div style={{ maxWidth: 460, margin: '18px auto 0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                [tr('Today', 'Hoy'), tr('A human at NXT//LINK reviews your request — nothing is shared before that.', 'Un humano de NXT//LINK revisa tu solicitud — nada se comparte antes de eso.')],
                [tr('Next', 'Después'), tr('Matched vendors reply with quotes inside NXT//LINK. We notify you as they arrive.', 'Los proveedores compatibles responden con cotizaciones dentro de NXT//LINK. Te avisamos cuando lleguen.')],
                [tr('Then', 'Luego'), tr('You compare and decide. Posting is free — no commitment until you accept a quote.', 'Comparas y decides. Publicar es gratis — sin compromiso hasta que aceptes una cotización.')],
              ].map(([step, text], i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ flex: 'none', minWidth: 64, fontSize: 'var(--spec-text-caption)', fontWeight: 800, letterSpacing: 'var(--spec-tracking-eyebrow)', textTransform: 'uppercase', color: ACCENT, paddingTop: 2 }}>{step}</span>
                  <span style={{ color: TEXT_3, fontSize: 14, lineHeight: 1.55 }}>{text}</span>
                </div>
              ))}
            </div>
            <a
              href="/"
              style={{
                display: 'inline-block',
                marginTop: 24,
                padding: '12px 24px',
                background: ACCENT,
                color: '#fff',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              ← {tr('Back to NXT//LINK', 'Volver a NXT//LINK')}
            </a>
          </div>
        )}

        {/* Chat + input (intro / asking) */}
        {(phase === 'intro' || phase === 'asking') && (
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              padding: 24,
            }}
          >
            {/* Messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
              {phase === 'intro' && messages.length === 0 && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '90%',
                    background: 'var(--spec-surface)',
                    color: TEXT,
                    padding: '12px 14px',
                    borderRadius: 14,
                    fontSize: 15,
                    lineHeight: 1.5,
                  }}
                >
                  {tr(
                    "Hi! I'm here to help you describe what you need. Tell me in your own words — what are you looking for?",
                    'Hola! Estoy aquí para ayudarte a describir lo que necesitas. Cuéntame en tus propias palabras — ¿qué buscas?'
                  )}
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '90%',
                    background: m.role === 'user' ? ACCENT : 'var(--spec-surface)',
                    color: m.role === 'user' ? '#fff' : TEXT,
                    padding: '12px 14px',
                    borderRadius: 14,
                    fontSize: 15,
                    lineHeight: 1.5,
                  }}
                >
                  {m.text}
                </div>
              ))}

              {/* why helper line under current question */}
              {phase === 'asking' && currentQuestion && (currentQuestion.why_en || currentQuestion.why_es) && (
                <div style={{ alignSelf: 'flex-start', maxWidth: '90%', color: MUTED, fontSize: 13, paddingLeft: 4 }}>
                  {isEs ? currentQuestion.why_es : currentQuestion.why_en}
                </div>
              )}

              {progress && (
                <div style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
                  {progress}
                </div>
              )}

              {loading && (
                <div style={{ color: MUTED, fontSize: 13 }}>
                  {tr('Thinking…', 'Pensando…')}
                </div>
              )}
            </div>

            {error && (
              <p style={{ color: RED, fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}

            {/* Input row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <label htmlFor="intake-input" style={{ position: 'absolute', left: -9999 }}>
                {tr('Your message', 'Tu mensaje')}
              </label>
              <textarea
                id="intake-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={2}
                placeholder={phase === 'intro' ? introPlaceholder : tr('Type your answer…', 'Escribe tu respuesta…')}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{
                  padding: '12px 20px',
                  background: loading || !input.trim() ? DISABLED_BG : ACCENT,
                  color: loading || !input.trim() ? DISABLED_TEXT : '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tr('Send', 'Enviar')}
              </button>
            </div>

            {/* Manual redirect affordance — always available during the
                question flow, independent of the keyword self-correction
                above, so a buyer isn't stuck if the assistant locked onto
                the wrong thing and their wording didn't trip the automatic
                correction. */}
            {phase === 'asking' && (
              <button
                type="button"
                onClick={handleEditAnswers}
                disabled={loading}
                style={{
                  marginTop: 12,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: MUTED,
                  fontSize: 13,
                  textDecoration: 'underline',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {tr("That's not it — start over", 'Eso no es — empezar de nuevo')}
              </button>
            )}
          </div>
        )}

        {/* Request Summary card */}
        {phase === 'summary' && summary && (
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              padding: 28,
            }}
          >
            <h2 style={{ fontSize: 'var(--spec-text-h3)', fontWeight: 800, letterSpacing: 'var(--spec-tracking-heading)', marginBottom: 18, fontFamily: FONT_HEAD }}>
              {tr('Request Summary', 'Resumen de Solicitud')}
            </h2>

            <SummaryFields summary={summary} isEs={isEs} />

            {/* Missing info — ink-colored text for AA contrast; amber is a
                decorative tint/border only (raw amber text on a light surface
                measured ~3:1, below the AA floor — one of the audited
                contrast failures this reskin fixes). */}
            {summary.missing_info && summary.missing_info.length > 0 && (
              <div style={{ marginTop: 18, background: 'rgba(198,138,40,.08)', border: '1px solid rgba(198,138,40,.3)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ color: TEXT, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  {tr('Missing information', 'Información faltante')}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: TEXT, fontSize: 14, lineHeight: 1.6 }}>
                  {summary.missing_info.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended categories chips */}
            {summary.recommended_categories && summary.recommended_categories.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ color: TEXT_3, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  {tr('Recommended categories', 'Categorías recomendadas')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {summary.recommended_categories.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 12px',
                        background: 'rgba(108,92,224,.12)',
                        color: ACCENT,
                        border: '1px solid rgba(108,92,224,.35)',
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: 16, fontWeight: 700, margin: '26px 0 16px' }}>
              {tr('Does this look correct?', '¿Esto se ve correcto?')}
            </p>

            {/* Contact fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div>
                <label
                  htmlFor="contact-name"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: TEXT_2 }}
                >
                  {tr('Your name', 'Tu nombre')} <span style={{ color: ACCENT }}>*</span>
                </label>
                <input
                  id="contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  htmlFor="contact-email"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: TEXT_2 }}
                >
                  {tr('Email', 'Correo')} <span style={{ color: ACCENT }}>*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Files reveal */}
            {showFiles && (
              <div style={{ marginBottom: 18 }}>
                <input
                  type="file"
                  multiple
                  onChange={handleFiles}
                  style={{ color: TEXT_2, fontSize: 14 }}
                  aria-label={tr('Add files', 'Agregar archivos')}
                />
                {fileNames.length > 0 && (
                  <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: TEXT_2, fontSize: 14, lineHeight: 1.6 }}>
                    {fileNames.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
                <p style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>
                  {tr(
                    'Files are private by default — a human reviews before anything is shared.',
                    'Los archivos son privados por defecto — un humano revisa antes de compartir.'
                  )}
                </p>
              </div>
            )}

            {error && <p style={{ color: RED, fontSize: 13, marginBottom: 12 }}>{error}</p>}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: '1 1 160px',
                  padding: '14px',
                  background: loading ? DISABLED_BG : ACCENT,
                  color: loading ? DISABLED_TEXT : '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {loading
                  ? tr('Submitting…', 'Enviando…')
                  : tr('Submit Request', 'Enviar Solicitud')}
              </button>
              <button
                onClick={handleEditAnswers}
                disabled={loading}
                style={{
                  flex: '1 1 120px',
                  padding: '14px',
                  background: 'transparent',
                  color: TEXT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tr('Edit Answers', 'Editar Respuestas')}
              </button>
              <button
                onClick={() => setShowFiles((s) => !s)}
                disabled={loading}
                style={{
                  flex: '1 1 120px',
                  padding: '14px',
                  background: 'transparent',
                  color: TEXT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tr('Add Files', 'Agregar Archivos')}
              </button>
            </div>
          </div>
        )}

        {/* Guardrail note */}
        <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.6, marginTop: 20, textAlign: 'center' }}>
          {guardrail}
        </p>
      </div>
    </div>
  );
}

// ---- Summary fields sub-component ----
function SummaryFields({ summary, isEs }: { summary: RequestSummary; isEs: boolean }) {
  const tr = (en: string, es: string) => (isEs ? es : en);

  const rows: { label: string; value: React.ReactNode }[] = [];

  const push = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    rows.push({ label, value: String(value) });
  };

  push(tr('Problem', 'Problema'), summary.problem);
  push(tr('Category', 'Categoría'), summary.category);
  push(tr('Quantity', 'Cantidad'), summary.quantity);
  push(tr('Location', 'Ubicación'), summary.location);
  push(tr('Deadline', 'Fecha límite'), summary.deadline);
  push(tr('Budget range', 'Rango de presupuesto'), summary.budget_range);
  push(tr('Urgency', 'Urgencia'), summary.urgency);

  if (summary.nda_required !== undefined && summary.nda_required !== null) {
    rows.push({
      label: tr('NDA/MNDA needed', 'NDA/MNDA requerido'),
      value: summary.nda_required ? tr('Yes', 'Sí') : 'No',
    });
  }

  if (summary.permissions && summary.permissions.length > 0) {
    rows.push({
      label: tr('Permissions', 'Permisos'),
      value: (
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          {summary.permissions.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      ),
    });
  }

  if (rows.length === 0) {
    return (
      <p style={{ color: MUTED, fontSize: 14 }}>
        {tr('No details captured yet.', 'Aún no hay detalles capturados.')}
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'start' }}>
          <div style={{ color: TEXT_3, fontSize: 13, fontWeight: 600 }}>{row.label}</div>
          <div style={{ color: TEXT, fontSize: 14, lineHeight: 1.5 }}>{row.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={null}>
      <IntakeInner />
    </Suspense>
  );
}
