'use client';

import { useState } from 'react';
import { ASSISTANT, type Locale } from '@/lib/assistant/branding';

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
const PAGE_BG = '#0A0A0F';
const CARD_BG = '#111118';
const INPUT_BG = '#0A0A0F';
const BORDER = '#2A2A35';
const TEXT = '#F3F4F6';
const TEXT_2 = '#D1D5DB';
const TEXT_3 = '#9CA3AF';
const MUTED = '#6B7280';
const ACCENT = '#7C5CFC';
const GREEN = '#10B981';
const AMBER = '#F59E0B';
const RED = '#EF4444';

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
  fontFamily: 'system-ui, sans-serif',
};

export default function IntakePage() {
  const [locale, setLocale] = useState<Locale>('en');
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
        setMessages((m) => [...m, { role: 'assistant', text: qText }]);
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

  function Logo() {
    return (
      <a
        href="/"
        style={{
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: -1,
          textDecoration: 'none',
          color: TEXT,
        }}
      >
        NXT<span style={{ color: ACCENT }}>//</span>LINK
      </a>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, color: TEXT, fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #1A1A24',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Logo />
        {/* Language toggle */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
          <button
            onClick={() => setLocale('en')}
            style={{
              background: 'none',
              border: 'none',
              color: locale === 'en' ? ACCENT : MUTED,
              fontWeight: locale === 'en' ? 700 : 500,
              cursor: 'pointer',
              fontSize: 13,
              padding: '2px 6px',
            }}
          >
            EN
          </button>
          <span style={{ color: MUTED }}>|</span>
          <button
            onClick={() => setLocale('es')}
            style={{
              background: 'none',
              border: 'none',
              color: locale === 'es' ? ACCENT : MUTED,
              fontWeight: locale === 'es' ? 700 : 500,
              cursor: 'pointer',
              fontSize: 13,
              padding: '2px 6px',
            }}
          >
            ES
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 60px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, lineHeight: 1.2 }}>
            {isEs ? ASSISTANT.name_es : ASSISTANT.name}
          </h1>
          <p style={{ color: TEXT_3, fontSize: 15 }}>
            {isEs ? ASSISTANT.subtitle_es : ASSISTANT.subtitle}
          </p>
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
                background: '#10B98122',
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
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
              {tr('Request received', 'Solicitud recibida')}
            </h2>
            <p style={{ color: TEXT_2, fontSize: 16, marginBottom: 8 }}>
              {tr('Your reference:', 'Tu referencia:')}{' '}
              <span style={{ color: ACCENT, fontWeight: 700 }}>{publicRef}</span>
            </p>
            <p style={{ color: TEXT_3, fontSize: 15, lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>
              {tr(
                'NXT//LINK will follow up shortly. A human reviews every request before anything is shared.',
                'NXT//LINK dará seguimiento pronto. Un humano revisa cada solicitud antes de compartir algo.'
              )}
            </p>
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
                    background: '#1A1A24',
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
                    background: m.role === 'user' ? ACCENT : '#1A1A24',
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
                  background: loading || !input.trim() ? '#4A3D8F' : ACCENT,
                  color: '#fff',
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
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 18 }}>
              {tr('Request Summary', 'Resumen de Solicitud')}
            </h2>

            <SummaryFields summary={summary} isEs={isEs} />

            {/* Missing info */}
            {summary.missing_info && summary.missing_info.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ color: AMBER, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  {tr('Missing information', 'Información faltante')}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: AMBER, fontSize: 14, lineHeight: 1.6 }}>
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
                        background: '#7C5CFC22',
                        color: ACCENT,
                        border: `1px solid ${ACCENT}55`,
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
                  background: loading ? '#4A3D8F' : ACCENT,
                  color: '#fff',
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
      <p style={{ color: '#6B7280', fontSize: 14 }}>
        {tr('No details captured yet.', 'Aún no hay detalles capturados.')}
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'start' }}>
          <div style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>{row.label}</div>
          <div style={{ color: '#F3F4F6', fontSize: 14, lineHeight: 1.5 }}>{row.value}</div>
        </div>
      ))}
    </div>
  );
}
