'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IBM_Plex_Sans } from 'next/font/google';
import { ClipboardCheck, Inbox, Scale } from 'lucide-react';
import { ASSISTANT } from '@/lib/assistant/branding';
import { useLang } from '@/components/LanguageToggle';
import PublicHeader from '@/components/PublicHeader';
import { MOTION_CSS, staggerStyle } from '@/components/motion/Motion';

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
  // Slice R1b (2026-07-30) — how many vendors actually received this
  // request via each send mode (auto-match vs buyer-invited).
  dispatched?: number;
  invited?: number;
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

// A buyer arriving from a vendor storefront that has no listings yet
// (marketplace/vendor/[id]/page.tsx's quote CTA) lands here with a cheap,
// client-only hint — ?vendor=<name>&vendor_id=<id>. No schema/API change:
// we just prefill the intro message and show a small banner so their intent
// to reach THAT vendor isn't lost. The mention flows into the free-text
// `initialText` sent to /api/assistant/intake like any other buyer wording.
function IntakeInner() {
  const sp = useSearchParams();
  const vendorHint = sp.get('vendor') || '';
  // Slice R1b (2026-07-30) — "invite specific vendors" send mode. A buyer
  // storefront/listing CTA links here with ?vendor_id=&invite=1 (see
  // marketplace/vendor/[id] and marketplace/[kind]/[id]); the vendor_id-only
  // hint (no ?invite=1) is the OLDER, unchanged behavior — a soft text
  // mention, still auto-matched normally. Only the explicit invite=1 flag
  // changes the send mode.
  const vendorId = sp.get('vendor_id') || '';
  const inviteMode = Boolean(vendorId) && sp.get('invite') === '1';
  const [alsoAutoMatch, setAlsoAutoMatch] = useState(false);
  const [invitedCount, setInvitedCount] = useState(0);
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
  // Set when submit is rejected because the visitor isn't signed in
  // (/api/platform/requests now requires a session — security fix C2). We show
  // a friendly "sign in to send" prompt instead of a generic error.
  const [needsSignin, setNeedsSignin] = useState(false);

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

  // Step back ONE question (Cesar 2026-07-31: "give me an option to go back —
  // they can go back"). The engine is deterministic over the answers array, so
  // undo = drop the last answer, prune the transcript's trailing
  // [user answer, assistant question(s)] bubbles, prefill the input with the
  // old answer for editing, and re-ask. From the FIRST question, back returns
  // to the intro with the original description prefilled.
  async function handleGoBack() {
    if (loading || phase !== 'asking') return;
    if (answers.length === 0) {
      setCurrentQuestion(null);
      setProgress('');
      setInput(initialText);
      setMessages((m) => {
        const next = [...m];
        while (next.length && next[next.length - 1].role === 'assistant') next.pop();
        if (next.length && next[next.length - 1].role === 'user') next.pop();
        return next;
      });
      setPhase('intro');
      return;
    }
    const last = answers[answers.length - 1];
    const prevAnswers = answers.slice(0, -1);
    setAnswers(prevAnswers);
    setMessages((m) => {
      const next = [...m];
      while (next.length && next[next.length - 1].role === 'assistant') next.pop();
      if (next.length && next[next.length - 1].role === 'user') next.pop();
      return next;
    });
    setInput(last?.a || '');
    await callIntake(initialText, prevAnswers);
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
    setNeedsSignin(false);
    try {
      const res = await fetch('/api/platform/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          contact: { name: contactName.trim(), email: contactEmail.trim() },
          locale,
          vendor_scope: 'both',
          // Slice R1b — only present at all when the buyer arrived via an
          // explicit "Invite to quote" CTA; otherwise identical to every
          // existing caller (default send_mode 'auto_match', unchanged).
          ...(inviteMode ? {
            invite_vendor_ids: [vendorId],
            send_mode: alsoAutoMatch ? 'both' : 'invite',
          } : {}),
        }),
      });
      if (res.status === 401) { setNeedsSignin(true); return; }
      const data = (await res.json()) as SubmitResponse;
      if (!data.ok) throw new Error('not ok');
      setPublicRef(data.public_ref);
      setInvitedCount(data.invited || 0);
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
  // Slice R1b copy fix: this line used to unconditionally claim "vendor names
  // are never shown here" — already inaccurate whenever a vendor hint banner
  // was showing (the pre-existing vendorHint feature), and more visibly so
  // now that invite mode names the vendor in the banner, the checkbox, and
  // the confirmation. Drop that clause whenever a vendor name is actually on
  // screen; keep it for the ordinary (no vendor hint) case. Flagged for
  // Cesar's copy sign-off like every other new/changed string in this slice.
  const guardrail = vendorHint
    ? tr(
        'Drafts are AI-assisted. A human at NXT//LINK reviews every request.',
        'Los borradores son asistidos por AI. Un humano de NXT//LINK revisa cada solicitud.'
      )
    : tr(
        'Drafts are AI-assisted. A human at NXT//LINK reviews every request. Vendor names are never shown here.',
        'Los borradores son asistidos por AI. Un humano de NXT//LINK revisa cada solicitud. Los nombres de proveedores nunca se muestran aquí.'
      );

  return (
    <div className={`iq ${ibmPlexSans.variable}`}>
      {/* Design System v1.0 scoped-CSS refactor (2026-07-28, design batch 6):
          this page used to be 100% inline style={{}} objects, which meant no
          button on the RFQ flow could get a :hover state. Converted to the
          site's standard className + <style> pattern (same shape as /account,
          /buyer, /projects) — visual output is unchanged except for the
          hover/active/focus-visible polish called out in the CSS below.
          Zero state-machine, question-logic, validation, or submit/dispatch
          code touched — only the JSX style attribute → className mapping. */}
      <style dangerouslySetInnerHTML={{ __html: MOTION_CSS + IQ_CSS }} />

      {/* ONE shared public header (Flow Blueprint 2026-07-22 §4, Slice 2) —
          replaces this page's old header-less/custom EN|ES-only nav. Bound
          to this page's own `locale` state (now the shared useLang/nxt_lang
          mechanism) so the header's toggle and the assistant's language stay
          the same single source of truth. */}
      <PublicHeader lang={locale} onLangChange={setLocale} />

      <div className="iq-wrap">
        {/* Header */}
        <div className="iq-head">
          <h1>{isEs ? ASSISTANT.name_es : ASSISTANT.name}</h1>
          <p className="iq-sub">{isEs ? ASSISTANT.subtitle_es : ASSISTANT.subtitle}</p>
          {vendorHint && phase !== 'submitted' && (
            <div className="iq-hint">
              {inviteMode
                ? tr(
                    `You're inviting ${vendorHint} to quote on this request — it will be sent to them directly.`,
                    `Estás invitando a ${vendorHint} a cotizar esta solicitud — se le enviará directamente.`
                  )
                : tr(
                    `Continuing from ${vendorHint}'s profile — we'll match you with vendors including them.`,
                    `Continuando desde el perfil de ${vendorHint} — te conectaremos con proveedores, incluyéndolos a ellos.`
                  )}
            </div>
          )}
        </div>

        {/* Submitted success card */}
        {phase === 'submitted' && (
          <div className="iq-card iq-card--success nxm-in">
            <div className="iq-checkicon">
              <svg width="28" height="28" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="iq-checkdraw" />
              </svg>
            </div>
            <h2 className="iq-successh2">{tr('Request received', 'Solicitud recibida')}</h2>
            <p className="iq-refline">
              {tr('Your reference:', 'Tu referencia:')}{' '}
              <span className="iq-refval">{publicRef}</span>
            </p>
            {/* Slice R1b — honest confirmation of what actually happened:
                invitedCount comes straight from the server (0 if the chosen
                vendor couldn't be reached and the request fell back to
                auto-match instead — never claimed as sent when it wasn't). */}
            {inviteMode && invitedCount > 0 && (
              <p className="iq-invitedline">
                {tr(`Invited: ${vendorHint || 'the vendor you chose'}`, `Invitado: ${vendorHint || 'el proveedor que elegiste'}`)}
              </p>
            )}
            {/* "How it works" transparency timeline — an easy question ("what
                happens next?") converts better than a vague promise. */}
            <div className="iq-timeline">
              {([
                { step: tr('Today', 'Hoy'), text: tr('A human at NXT//LINK reviews your request — nothing is shared before that.', 'Un humano de NXT//LINK revisa tu solicitud — nada se comparte antes de eso.'), Icon: ClipboardCheck },
                { step: tr('Next', 'Después'), text: tr('Matched vendors reply with quotes inside NXT//LINK. We notify you as they arrive.', 'Los proveedores compatibles responden con cotizaciones dentro de NXT//LINK. Te avisamos cuando lleguen.'), Icon: Inbox },
                { step: tr('Then', 'Luego'), text: tr('You compare and decide. Posting is free — no commitment until you accept a quote.', 'Comparas y decides. Publicar es gratis — sin compromiso hasta que aceptes una cotización.'), Icon: Scale },
              ] as const).map(({ step, text, Icon }, i) => (
                <div key={i} className="iq-timeline-row nxm-in" style={staggerStyle(i)}>
                  <span className="iq-timeline-icon" aria-hidden="true"><Icon size={15} strokeWidth={1.75} /></span>
                  <span className="iq-timeline-step">{step}</span>
                  <span className="iq-timeline-text">{text}</span>
                </div>
              ))}
            </div>
            <a href="/" className="iq-backlink">
              ← {tr('Back to NXT//LINK', 'Volver a NXT//LINK')}
            </a>
          </div>
        )}

        {/* Chat + input (intro / asking) */}
        {(phase === 'intro' || phase === 'asking') && (
          <div className="iq-card iq-card--chat">
            {/* Messages */}
            <div className="iq-messages">
              {phase === 'intro' && messages.length === 0 && (
                <div className="iq-bubble iq-bubble--assistant nxm-in">
                  {tr(
                    "Hi! I'm here to help you describe what you need. Tell me in your own words — what are you looking for?",
                    'Hola! Estoy aquí para ayudarte a describir lo que necesitas. Cuéntame en tus propias palabras — ¿qué buscas?'
                  )}
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`iq-bubble nxm-in ${m.role === 'user' ? 'iq-bubble--user' : 'iq-bubble--assistant'}`}
                >
                  {m.text}
                </div>
              ))}

              {/* why helper line under current question */}
              {phase === 'asking' && currentQuestion && (currentQuestion.why_en || currentQuestion.why_es) && (
                <div className="iq-why">
                  {isEs ? currentQuestion.why_es : currentQuestion.why_en}
                </div>
              )}

              {progress && <div className="iq-progress">{progress}</div>}

              {loading && <div className="iq-thinking">{tr('Thinking…', 'Pensando…')}</div>}
            </div>

            {error && <p className="iq-error">{error}</p>}
            {needsSignin && (
              <p className="iq-error">
                {tr('Please sign in to send your request.', 'Inicia sesión para enviar tu solicitud.')}{' '}
                <a className="iq-signin" href={`/login?next=${encodeURIComponent('/intake')}`}>{tr('Sign in →', 'Iniciar sesión →')}</a>
              </p>
            )}

            {/* Input row */}
            <div className="iq-inputrow">
              <label htmlFor="intake-input" className="iq-sr-only">
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
                className="iq-input iq-input--area"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="iq-sendbtn"
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
              <div className="iq-flowctl">
                <button
                  type="button"
                  onClick={handleGoBack}
                  disabled={loading}
                  className="iq-restart"
                >
                  ← {tr('Go back', 'Regresar')}
                </button>
                <button
                  type="button"
                  onClick={handleEditAnswers}
                  disabled={loading}
                  className="iq-restart"
                >
                  {tr("That's not it — start over", 'Eso no es — empezar de nuevo')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Request Summary card */}
        {phase === 'summary' && summary && (
          <div className="iq-card iq-card--summary nxm-in">
            <h2 className="iq-summaryh2">{tr('Request Summary', 'Resumen de Solicitud')}</h2>

            <SummaryFields summary={summary} isEs={isEs} />

            {/* Missing info — ink-colored text for AA contrast; amber is a
                decorative tint/border only (raw amber text on a light surface
                measured ~3:1, below the AA floor — one of the audited
                contrast failures this reskin fixes). */}
            {summary.missing_info && summary.missing_info.length > 0 && (
              <div className="iq-missing">
                <div className="iq-missing-label">{tr('Missing information', 'Información faltante')}</div>
                <ul className="iq-missing-list">
                  {summary.missing_info.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended categories chips */}
            {summary.recommended_categories && summary.recommended_categories.length > 0 && (
              <div className="iq-cats">
                <div className="iq-cats-label">{tr('Recommended categories', 'Categorías recomendadas')}</div>
                <div className="iq-chips">
                  {summary.recommended_categories.map((c, i) => (
                    <span key={i} className="iq-chip">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="iq-confirmline">{tr('Does this look correct?', '¿Esto se ve correcto?')}</p>

            {/* Contact fields */}
            <div className="iq-contactgrid">
              <div>
                <label htmlFor="contact-name" className="iq-label">
                  {tr('Your name', 'Tu nombre')} <span className="iq-req">*</span>
                </label>
                <input
                  id="contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="iq-input"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="iq-label">
                  {tr('Email', 'Correo')} <span className="iq-req">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="iq-input"
                />
              </div>
            </div>

            {/* Files reveal */}
            {showFiles && (
              <div className="iq-files">
                <input
                  type="file"
                  multiple
                  onChange={handleFiles}
                  className="iq-fileinput"
                  aria-label={tr('Add files', 'Agregar archivos')}
                />
                {fileNames.length > 0 && (
                  <ul className="iq-filelist">
                    {fileNames.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
                <p className="iq-filenote">
                  {tr(
                    'Files are private by default — a human reviews before anything is shared.',
                    'Los archivos son privados por defecto — un humano revisa antes de compartir.'
                  )}
                </p>
              </div>
            )}

            {/* Slice R1b — invite mode: this request is being sent ONLY to
                the invited vendor (no auto-match blast) unless the buyer
                explicitly opts in here. */}
            {inviteMode && (
              <label className="iq-invitecheck">
                <input
                  type="checkbox"
                  checked={alsoAutoMatch}
                  onChange={(e) => setAlsoAutoMatch(e.target.checked)}
                />
                {tr(
                  `Also match me with other vendors automatically (in addition to ${vendorHint || 'this vendor'})`,
                  `También conéctame con otros proveedores automáticamente (además de ${vendorHint || 'este proveedor'})`
                )}
              </label>
            )}

            {error && <p className="iq-error">{error}</p>}
            {needsSignin && (
              <p className="iq-error">
                {tr('Please sign in to send your request.', 'Inicia sesión para enviar tu solicitud.')}{' '}
                <a className="iq-signin" href={`/login?next=${encodeURIComponent('/intake')}`}>{tr('Sign in →', 'Iniciar sesión →')}</a>
              </p>
            )}

            {/* Action buttons */}
            <div className="iq-actions">
              <button onClick={handleSubmit} disabled={loading} className="iq-submitbtn">
                {loading
                  ? tr('Submitting…', 'Enviando…')
                  : tr('Submit Request', 'Enviar Solicitud')}
              </button>
              <button onClick={handleEditAnswers} disabled={loading} className="iq-secondarybtn">
                {tr('Edit Answers', 'Editar Respuestas')}
              </button>
              <button onClick={() => setShowFiles((s) => !s)} disabled={loading} className="iq-secondarybtn">
                {tr('Add Files', 'Agregar Archivos')}
              </button>
            </div>
          </div>
        )}

        {/* Guardrail note */}
        <p className="iq-guardrail">{guardrail}</p>
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
        <ul className="iq-permlist">
          {summary.permissions.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      ),
    });
  }

  if (rows.length === 0) {
    return <p className="iq-empty">{tr('No details captured yet.', 'Aún no hay detalles capturados.')}</p>;
  }

  return (
    <div className="iq-fields">
      {rows.map((row, i) => (
        <div key={i} className="iq-field-row">
          <div className="iq-field-label">{row.label}</div>
          <div className="iq-field-value">{row.value}</div>
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

// ---- Styles ----
// Design System v1.0 (vault/Design-System.md) via the `--spec-*` CSS vars
// already wired in globals.css — flipped from the old dark #0A0A0F/system-ui
// theme to the light spec (Flow Blueprint 2026-07-22, Slice 2). Two levels
// of dark-surface secondary text (TEXT_2/TEXT_3 at ~2.5-3.2:1, an audited
// contrast failure) collapse into ONE AA-compliant secondary color on light
// surfaces — differentiated by size/weight instead of a third, dimmer gray.
//
// Converted 2026-07-28 (design batch 6) from 100% inline style={{}} objects
// to this scoped-CSS + className pattern (matching /account, /buyer,
// /projects) so buttons can finally get real :hover states. Every rule below
// carries forward the exact property values from the old inline style
// objects — the only *new* declarations are the hover/active/focus-visible
// polish, called out inline. Disabled-state buttons that previously branched
// their inline style on `loading`/`disabled` now use the native `:disabled`
// selector instead — the underlying `disabled={...}` expressions are
// unchanged, this just lets CSS read the same boolean the DOM already has.
const IQ_CSS = `
.iq{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-intake),"IBM Plex Sans",system-ui,-apple-system,sans-serif;}

/* Focus ring — matches every other reskinned page's own scoped rule. */
.iq a:focus-visible,.iq button:focus-visible,.iq input:focus-visible,.iq textarea:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;border-radius:6px;}

.iq-wrap{max-width:640px;margin:0 auto;padding:40px 20px 60px;}

.iq-head{margin-bottom:28px;}
.iq-head h1{font-size:var(--spec-text-h2);font-weight:800;letter-spacing:var(--spec-tracking-heading);margin-bottom:6px;line-height:1.2;font-family:var(--font-space-grotesk),"Space Grotesk",system-ui,sans-serif;color:var(--spec-ink,#141320);}
.iq-sub{color:var(--spec-text-2nd,#615F72);font-size:15px;}
.iq-hint{margin-top:14px;font-size:13px;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.08);border:1px solid rgba(108,92,224,.25);border-radius:10px;padding:9px 12px;line-height:1.5;}

.iq-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:18px;}
.iq-card--success{padding:32px;text-align:center;}
.iq-card--chat{padding:24px;}
.iq-card--summary{padding:28px;}

.iq-checkicon{width:64px;height:64px;border-radius:50%;background:#EDF7F1;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px;color:var(--spec-success,#2F9E6A);}
/* Self-drawing checkmark — same stroke-dasharray/dashoffset technique as
   vendor/onboarding's CheckDraw and AcceptCelebration's acx-draw (each page
   keeps a local copy, namespaced, rather than a shared import). */
.iq-checkdraw{stroke-dasharray:20;stroke-dashoffset:20;animation:iq-draw 480ms 200ms var(--nxm-ease-entrance,ease-out) forwards;}
@keyframes iq-draw{to{stroke-dashoffset:0;}}
.iq-successh2{font-size:var(--spec-text-h3);font-weight:800;letter-spacing:var(--spec-tracking-heading);margin-bottom:12px;font-family:var(--font-space-grotesk),"Space Grotesk",system-ui,sans-serif;}
.iq-summaryh2{font-size:var(--spec-text-h3);font-weight:800;letter-spacing:var(--spec-tracking-heading);margin-bottom:18px;font-family:var(--font-space-grotesk),"Space Grotesk",system-ui,sans-serif;}

.iq-refline{color:var(--spec-text-2nd,#615F72);font-size:16px;margin-bottom:8px;}
.iq-refval{color:var(--spec-violet,#6C5CE0);font-weight:700;}
.iq-invitedline{color:var(--spec-violet-deep,#4A3DB0);font-size:13px;font-weight:600;margin:-4px 0 12px;}

.iq-invitecheck{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;color:var(--spec-text-2nd,#615F72);line-height:1.5;margin-top:14px;cursor:pointer;}
.iq-invitecheck input{margin-top:2px;accent-color:var(--spec-violet,#6C5CE0);}

.iq-timeline{max-width:460px;margin:18px auto 0;text-align:left;display:flex;flex-direction:column;gap:12px;}
.iq-timeline-row{display:flex;gap:12px;align-items:flex-start;}
.iq-timeline-icon{flex:none;width:26px;height:26px;border-radius:8px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);display:flex;align-items:center;justify-content:center;margin-top:1px;}
.iq-timeline-step{flex:none;min-width:56px;font-size:var(--spec-text-caption);font-weight:800;letter-spacing:var(--spec-tracking-eyebrow);text-transform:uppercase;color:var(--spec-violet,#6C5CE0);padding-top:2px;}
.iq-timeline-text{color:var(--spec-text-2nd,#615F72);font-size:14px;line-height:1.55;}

/* Back-to-home CTA is an <a>, not a <button>, so it doesn't get the global
   button:active rule (globals.css:161) — add its own hover + press feedback,
   same treatment as the audit's homepage anchor-CTA recommendation. */
.iq-backlink{display:inline-block;margin-top:24px;padding:12px 24px;background:var(--spec-violet,#6C5CE0);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease),transform var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.iq-backlink:hover{background:var(--spec-violet-deep,#4A3DB0);}
.iq-backlink:active{transform:scale(.98);}

.iq-messages{display:flex;flex-direction:column;gap:12px;margin-bottom:18px;}
.iq-bubble{max-width:90%;padding:12px 14px;border-radius:14px;font-size:15px;line-height:1.5;}
.iq-bubble--assistant{align-self:flex-start;background:var(--spec-surface,#EFEDF5);color:var(--spec-ink,#141320);}
.iq-bubble--user{align-self:flex-end;background:var(--spec-violet,#6C5CE0);color:#fff;}
.iq-why{align-self:flex-start;max-width:90%;color:var(--spec-text-2nd,#615F72);font-size:13px;padding-left:4px;}
.iq-progress{color:var(--spec-violet,#6C5CE0);font-size:12px;font-weight:600;letter-spacing:.5px;}
.iq-thinking{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.iq-error{color:var(--spec-error,#CE4B43);font-size:13px;margin-bottom:12px;}
.iq-signin{color:var(--spec-violet-deep,#4A3DB0);font-weight:700;text-decoration:underline;}
.iq-signin:hover{color:var(--spec-violet,#6C5CE0);}

.iq-inputrow{display:flex;gap:10px;align-items:flex-end;}
.iq-sr-only{position:absolute;left:-9999px;}

.iq-input,.iq-input--area{width:100%;padding:12px 14px;background:var(--spec-warm-white,#F8F7FB);border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;color:var(--spec-ink,#141320);font-size:15px;outline:none;box-sizing:border-box;font-family:var(--font-ibm-plex-sans-intake),"IBM Plex Sans",system-ui,-apple-system,sans-serif;}
.iq-input--area{resize:vertical;}

/* Primary buttons — hover/active/transition polish (design batch 6). All
   four ("Send", "Submit Request", "Edit Answers", "Add Files") previously
   only branched their fill color on loading/disabled and never had a hover
   state at all, since inline styles can't express :hover. */
.iq-sendbtn{padding:12px 20px;background:var(--spec-violet,#6C5CE0);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.iq-sendbtn:hover{background:var(--spec-violet-deep,#4A3DB0);}
.iq-sendbtn:disabled{background:var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);cursor:not-allowed;}

.iq-flowctl{display:flex;gap:18px;align-items:center;flex-wrap:wrap;}
.iq-restart{margin-top:12px;background:transparent;border:none;padding:0;color:var(--spec-text-2nd,#615F72);font-size:13px;text-decoration:underline;cursor:pointer;transition:color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.iq-restart:hover{color:var(--spec-violet-deep,#4A3DB0);}
.iq-restart:disabled{cursor:not-allowed;}

.iq-missing{margin-top:18px;background:rgba(198,138,40,.08);border:1px solid rgba(198,138,40,.3);border-radius:10px;padding:12px 14px;}
.iq-missing-label{color:var(--spec-ink,#141320);font-size:13px;font-weight:700;margin-bottom:6px;}
.iq-missing-list{margin:0;padding-left:18px;color:var(--spec-ink,#141320);font-size:14px;line-height:1.6;}

.iq-cats{margin-top:18px;}
.iq-cats-label{color:var(--spec-text-2nd,#615F72);font-size:13px;font-weight:600;margin-bottom:8px;}
.iq-chips{display:flex;flex-wrap:wrap;gap:8px;}
.iq-chip{padding:4px 12px;background:rgba(108,92,224,.12);color:var(--spec-violet,#6C5CE0);border:1px solid rgba(108,92,224,.35);border-radius:999px;font-size:13px;font-weight:600;}

.iq-confirmline{font-size:16px;font-weight:700;margin:26px 0 16px;}

.iq-contactgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;}
.iq-label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--spec-text-2nd,#615F72);}
.iq-req{color:var(--spec-violet,#6C5CE0);}

.iq-files{margin-bottom:18px;}
.iq-fileinput{color:var(--spec-text-2nd,#615F72);font-size:14px;}
.iq-filelist{margin:10px 0 0;padding-left:18px;color:var(--spec-text-2nd,#615F72);font-size:14px;line-height:1.6;}
.iq-filenote{color:var(--spec-text-2nd,#615F72);font-size:12px;margin-top:8px;}

.iq-actions{display:flex;flex-wrap:wrap;gap:12px;}
.iq-submitbtn{flex:1 1 160px;padding:14px;background:var(--spec-violet,#6C5CE0);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.iq-submitbtn:hover{background:var(--spec-violet-deep,#4A3DB0);}
.iq-submitbtn:disabled{background:var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);cursor:wait;}

.iq-secondarybtn{flex:1 1 120px;padding:14px;background:transparent;color:var(--spec-ink,#141320);border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease),border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.iq-secondarybtn:hover{background:var(--spec-warm-white,#F8F7FB);border-color:#C7C2DE;}

.iq-guardrail{color:var(--spec-text-2nd,#615F72);font-size:12px;line-height:1.6;margin-top:20px;text-align:center;}

.iq-fields{display:flex;flex-direction:column;gap:12px;}
.iq-field-row{display:grid;grid-template-columns:140px 1fr;gap:12px;align-items:start;}
.iq-field-label{color:var(--spec-text-2nd,#615F72);font-size:13px;font-weight:600;}
.iq-field-value{color:var(--spec-ink,#141320);font-size:14px;line-height:1.5;}
.iq-permlist{margin:0;padding-left:18px;line-height:1.6;}
.iq-empty{color:var(--spec-text-2nd,#615F72);font-size:14px;}
`;
