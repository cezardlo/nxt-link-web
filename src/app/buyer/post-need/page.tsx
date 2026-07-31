'use client';

// Buyer "Post a Need" wizard — Slice R2b
// (workplace/audit/flow-readiness-2026-07-30.md: request_kind='technology'
// had NO live buyer-facing entry point anywhere on the site — the backend
// (R1 structured columns + R3 vendor quote UI) was fully built and waiting,
// but no button/form on the live site could ever produce one. This page
// closes that gap for product/service/technology alike, plus an explicit
// "Not sure" lane that submits with request_kind = null, which R1's own
// validator already treats as valid — see src/lib/requests/structured.ts).
//
// Four steps in a centered card: (1) what do you need — three toggle cards +
// a quieter "Not sure" option, (2) one free-text description, (3) kind-
// adaptive key details (≤4 fields visible), (4) review + send. Posts to the
// EXISTING POST /api/platform/requests — the same route /intake already
// uses (client_requests + automatic vendor fan-out, src/lib/requests/
// dispatch.ts) — so this request gets matched to vendors and shows up on the
// buyer's own dashboard with zero new backend work. ZERO API changes.
//
// All step-validity + payload-building logic is pure and lives in
// src/lib/requests/postNeedWizard.ts (unit-tested against the REAL R1
// validator — tests/post-need-wizard.test.ts) so this file stays UI-only.
//
// Blind budget (technology step 3 only, optional, collapsed by default):
// maps straight to R1's budget_min/budget_max, which src/lib/requests/
// vendor-view.ts strips from EVERY vendor-facing response unconditionally —
// there is no "share" mechanism anywhere in this codebase to accidentally
// turn on, and this page never renders one.
//
// File attachments (RequestAttachmentUpload, src/components/marketplace/
// RequestAttachments.tsx) are DELIBERATELY NOT wired into the confirmation
// screen here: that component's upload API (POST /api/buyer/request-
// attachments) authorizes by looking the id up in `quote_requests`
// (the listing-detail/cart RFQ table), but this wizard creates a row in the
// DIFFERENT `client_requests` table (same one /intake writes to) — the id
// this page gets back would 404 against that endpoint. Wiring it for real
// needs a small ownership-check change on that API route, which is out of
// scope for a zero-API-change slice. Deferred, flagged in the build report.

import { useEffect, useRef, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { Package, Wrench, Cpu, HelpCircle, ArrowLeft, Check } from 'lucide-react';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';
import { MOTION_CSS } from '@/components/motion/Motion';
import type { RequestKind } from '@/lib/requests/structured';
import {
  type PostNeedSelection, isStep1Valid, isStep2Valid, isStep3Valid,
  QUANTITY_UNITS, DEFAULT_QUANTITY_UNIT, type QuantityUnit,
  TIMELINE_OPTIONS, type TimelineOption,
  buildPostNeedPayload,
} from '@/lib/requests/postNeedWizard';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-postneed',
  display: 'swap',
});

const T: Record<Lang, Record<string, string>> = {
  en: {
    docTitle: 'Post a need — NXT//LINK',
    backToDashboard: 'Back to dashboard',
    stepOf: 'Step {n} of 4',
    loading: 'Loading…',
    signInRequired: 'Sign in to post a need.',
    signInCta: 'Sign in →',
    verifyRequired: 'Verify your email first — check your inbox for the confirmation link.',
    step1Heading: 'What do you need?',
    step1Sub: "Pick the closest match — we'll ask the right follow-up questions.",
    kindProductLabel: 'Product', kindProductHint: 'Equipment, parts, materials, supplies',
    kindServiceLabel: 'Service', kindServiceHint: 'Installation, maintenance, staffing, logistics',
    kindTechnologyLabel: 'Technology', kindTechnologyHint: 'Software, systems, integrations',
    kindUnsureLabel: "Not sure — describe it and we'll route it",
    step1CtaProduct: 'Continue with Product', step1CtaService: 'Continue with Service',
    step1CtaTechnology: 'Continue with Technology', step1CtaUnsure: 'Continue',
    step2Heading: 'Describe it',
    step2Label: 'Describe what you need',
    step2Hint: 'At least 10 characters',
    descPhProduct: 'e.g. 50 pallet jacks, electric, need by next month for our new warehouse',
    descPhService: 'e.g. Safety audit of 14 forklifts across two shifts, OSHA compliance',
    descPhTechnology: 'e.g. Cloud inventory software for 3 warehouses, needs to integrate with our existing ERP',
    descPhUnsure: "Tell us what you're trying to solve — we'll match you with the right vendors",
    step2Cta: 'Continue to details',
    backLabel: 'Back',
    step3Heading: 'Key details',
    locationLabel: 'Location', locationPh: 'City, state',
    timelineLabel: 'When do you need this?',
    timelineAsap: 'ASAP', timelineWeek: 'Within 1 week', timelineMonth: 'Within 1 month', timelineFlexible: 'Flexible',
    quantityLabel: 'Quantity', unitLabel: 'Unit',
    unit_pieces: 'Pieces', unit_sets: 'Sets', unit_pallets: 'Pallets', unit_units: 'Units', unit_hours: 'Hours', unit_loads: 'Loads',
    usersLocationsLabel: 'Number of users or locations', usersLocationsPh: 'e.g. 50', usersSuffix: 'users',
    currentSystemsLabel: 'Current systems to integrate (optional)', currentSystemsPh: 'e.g. QuickBooks, SAP',
    addBudgetToggle: '+ Add a budget range (optional)',
    budgetMinLabel: 'Minimum', budgetMaxLabel: 'Maximum',
    budgetPrivacyNote: 'Only you see this — unless you choose to share it.',
    step3Cta: 'Review request',
    step4Heading: 'Review & send',
    reviewType: 'Type', reviewDescription: 'Description', reviewLocation: 'Location', reviewTimeline: 'When',
    reviewQuantity: 'Quantity', reviewUsersLocations: 'Users / locations', reviewCurrentSystems: 'Current systems',
    reviewBudget: 'Budget', reviewNotSpecified: 'Not specified', reviewPrivateNote: 'private',
    reassurance: "We'll notify you as soon as quotes arrive.",
    sendLabel: 'Send request', sendingLabel: 'Sending…',
    sendError: 'Could not send your request — please try again.',
    confirmHeading: 'Request sent!',
    confirmBody: "We'll notify you as soon as quotes arrive.",
    confirmRefPrefix: 'Reference:',
    goToDashboard: 'Go to my dashboard',
    typeUnsure: 'Not sure yet',
  },
  es: {
    docTitle: 'Publica una necesidad — NXT//LINK',
    backToDashboard: 'Volver al panel',
    stepOf: 'Paso {n} de 4',
    loading: 'Cargando…',
    signInRequired: 'Inicia sesión para publicar una necesidad.',
    signInCta: 'Iniciar sesión →',
    verifyRequired: 'Verifica tu correo primero — revisa tu bandeja de entrada por el enlace de confirmación.',
    step1Heading: '¿Qué necesitas?',
    step1Sub: 'Elige la opción más cercana — te haremos las preguntas indicadas.',
    kindProductLabel: 'Producto', kindProductHint: 'Equipo, piezas, materiales, insumos',
    kindServiceLabel: 'Servicio', kindServiceHint: 'Instalación, mantenimiento, personal, logística',
    kindTechnologyLabel: 'Tecnología', kindTechnologyHint: 'Software, sistemas, integraciones',
    kindUnsureLabel: 'No estoy seguro — descríbelo y te ayudamos a dirigirlo',
    step1CtaProduct: 'Continuar con Producto', step1CtaService: 'Continuar con Servicio',
    step1CtaTechnology: 'Continuar con Tecnología', step1CtaUnsure: 'Continuar',
    step2Heading: 'Descríbelo',
    step2Label: 'Describe lo que necesitas',
    step2Hint: 'Al menos 10 caracteres',
    descPhProduct: 'ej. 50 patines hidráulicos eléctricos, los necesitamos el próximo mes para nuestro nuevo almacén',
    descPhService: 'ej. Auditoría de seguridad de 14 montacargas en dos turnos, cumplimiento OSHA',
    descPhTechnology: 'ej. Software de inventario en la nube para 3 almacenes, debe integrarse con nuestro ERP actual',
    descPhUnsure: 'Cuéntanos qué estás tratando de resolver — te conectaremos con los proveedores correctos',
    step2Cta: 'Continuar a los detalles',
    backLabel: 'Atrás',
    step3Heading: 'Detalles clave',
    locationLabel: 'Ubicación', locationPh: 'Ciudad, estado',
    timelineLabel: '¿Cuándo lo necesitas?',
    timelineAsap: 'Lo antes posible', timelineWeek: 'Dentro de 1 semana', timelineMonth: 'Dentro de 1 mes', timelineFlexible: 'Flexible',
    quantityLabel: 'Cantidad', unitLabel: 'Unidad',
    unit_pieces: 'Piezas', unit_sets: 'Juegos', unit_pallets: 'Tarimas', unit_units: 'Unidades', unit_hours: 'Horas', unit_loads: 'Cargas',
    usersLocationsLabel: 'Número de usuarios o ubicaciones', usersLocationsPh: 'ej. 50', usersSuffix: 'usuarios',
    currentSystemsLabel: 'Sistemas actuales a integrar (opcional)', currentSystemsPh: 'ej. QuickBooks, SAP',
    addBudgetToggle: '+ Agregar un rango de presupuesto (opcional)',
    budgetMinLabel: 'Mínimo', budgetMaxLabel: 'Máximo',
    budgetPrivacyNote: 'Solo tú lo ves — a menos que elijas compartirlo.',
    step3Cta: 'Revisar solicitud',
    step4Heading: 'Revisar y enviar',
    reviewType: 'Tipo', reviewDescription: 'Descripción', reviewLocation: 'Ubicación', reviewTimeline: 'Cuándo',
    reviewQuantity: 'Cantidad', reviewUsersLocations: 'Usuarios / ubicaciones', reviewCurrentSystems: 'Sistemas actuales',
    reviewBudget: 'Presupuesto', reviewNotSpecified: 'No especificado', reviewPrivateNote: 'privado',
    reassurance: 'Te avisaremos en cuanto lleguen cotizaciones.',
    sendLabel: 'Enviar solicitud', sendingLabel: 'Enviando…',
    sendError: 'No se pudo enviar tu solicitud — inténtalo de nuevo.',
    confirmHeading: '¡Solicitud enviada!',
    confirmBody: 'Te avisaremos en cuanto lleguen cotizaciones.',
    confirmRefPrefix: 'Referencia:',
    goToDashboard: 'Ir a mi panel',
    typeUnsure: 'Aún no estoy seguro',
  },
};

const KIND_ICON: Record<RequestKind, typeof Package> = { product: Package, service: Wrench, technology: Cpu };

function kindLabel(t: Record<string, string>, k: PostNeedSelection): string {
  if (k === 'product') return t.kindProductLabel;
  if (k === 'service') return t.kindServiceLabel;
  if (k === 'technology') return t.kindTechnologyLabel;
  return t.typeUnsure;
}

export default function PostNeedPage() {
  const [lang, setLang] = useLang();
  const t = T[lang];

  useEffect(() => { document.title = t.docTitle; }, [t.docTitle]);

  const [checking, setChecking] = useState(true);
  const [authState, setAuthState] = useState<'ok' | 'signed-out' | 'unverified'>('signed-out');
  const [contactName, setContactName] = useState('');

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [phase, setPhase] = useState<'wizard' | 'done'>('wizard');

  const [selection, setSelection] = useState<PostNeedSelection | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [timeline, setTimeline] = useState<TimelineOption | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<QuantityUnit>(DEFAULT_QUANTITY_UNIT);
  const [usersOrLocations, setUsersOrLocations] = useState<number | null>(null);
  const [currentSystems, setCurrentSystems] = useState('');
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [publicRef, setPublicRef] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);

  // Sign-in check + best-effort prefill (buyer's own profile city → location,
  // contact_name → contact.name on submit) — SAME GET /api/buyer/profile the
  // rest of /buyer already calls, zero new endpoint. A network hiccup here
  // never blocks the wizard itself; the real gate is the 401 the submit POST
  // enforces server-side either way.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/buyer/profile')
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 401) { setAuthState('signed-out'); return; }
        const data = await r.json().catch(() => null);
        if (!data?.ok) { setAuthState('signed-out'); return; }
        if (!data.verified) { setAuthState('unverified'); return; }
        setAuthState('ok');
        if (data.profile?.city) setLocation((v) => v || String(data.profile.city));
        if (data.profile?.contact_name) setContactName(String(data.profile.contact_name));
      })
      .catch(() => setAuthState('signed-out'))
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);

  // Step transitions get the shared slide-up-and-fade panel treatment
  // (Motion.tsx .nxm-panel) via a remount key — reduced-motion safe for
  // free (globals.css collapses it), no second motion system.
  useEffect(() => {
    cardRef.current?.scrollIntoView({ block: 'nearest' });
  }, [step]);

  const step1Ok = isStep1Valid(selection);
  const step2Ok = isStep2Valid(description);
  const step3Ok = selection ? isStep3Valid(selection, { location, timeline, quantity, usersOrLocations }) : false;

  const TIMELINE_LABEL: Record<TimelineOption, string> = {
    asap: t.timelineAsap, week: t.timelineWeek, month: t.timelineMonth, flexible: t.timelineFlexible,
  };
  const UNIT_LABEL: Record<QuantityUnit, string> = {
    pieces: t.unit_pieces, sets: t.unit_sets, pallets: t.unit_pallets, units: t.unit_units, hours: t.unit_hours, loads: t.unit_loads,
  };

  function goNext() { setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s)); }
  function goBack() { setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s)); }

  async function handleSend() {
    if (!selection || sending) return;
    setSending(true); setError('');
    const payload = buildPostNeedPayload({
      selection,
      description,
      location,
      timelineLabel: timeline ? TIMELINE_LABEL[timeline] : null,
      quantity: selection === 'product' ? quantity : null,
      quantityUnitLabel: selection === 'product' ? UNIT_LABEL[unit] : null,
      usersOrLocations: selection === 'technology' ? usersOrLocations : null,
      currentSystems: selection === 'technology' ? currentSystems : '',
      usersUnitLabel: selection === 'technology' ? t.usersSuffix : null,
      budgetMin: selection === 'technology' && budgetOpen && budgetMin.trim() ? Number(budgetMin) : null,
      budgetMax: selection === 'technology' && budgetOpen && budgetMax.trim() ? Number(budgetMax) : null,
      contactName,
      locale: lang,
    });
    try {
      const res = await fetch('/api/platform/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { setAuthState('signed-out'); setSending(false); return; }
      const data = await res.json().catch(() => null);
      if (!data?.ok) { setError(t.sendError); setSending(false); return; }
      setPublicRef(String(data.public_ref || ''));
      setPhase('done');
    } catch {
      setError(t.sendError);
    }
    setSending(false);
  }

  const stepHeading = step === 1 ? t.step1Heading : step === 2 ? t.step2Heading : step === 3 ? t.step3Heading : t.step4Heading;

  return (
    <div className={`pn ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: MOTION_CSS + CSS }} />
      <header className="pn-nav">
        <a className="pn-brand" href="/buyer"><b>NXT<i>{'//'}</i>LINK</b></a>
        <LanguageToggle lang={lang} onChange={setLang} variant="light" />
      </header>

      <main className="pn-shell">
        {checking ? (
          <div className="pn-empty">{t.loading}</div>
        ) : authState === 'signed-out' ? (
          <div className="pn-empty">
            <p>{t.signInRequired}</p>
            <a className="pn-signincta" href={`/login?next=${encodeURIComponent('/buyer/post-need')}`}>{t.signInCta}</a>
          </div>
        ) : authState === 'unverified' ? (
          <div className="pn-empty"><p>{t.verifyRequired}</p></div>
        ) : phase === 'done' ? (
          <div className="pn-confirm nxm-in">
            <ConfirmCheck />
            <h1>{t.confirmHeading}</h1>
            <p>{t.confirmBody}</p>
            {publicRef && <p className="pn-ref">{t.confirmRefPrefix} <b>{publicRef}</b></p>}
            <a className="pn-primary pn-confirmcta" href="/buyer">{t.goToDashboard}</a>
          </div>
        ) : (
          <div className="pn-cardwrap">
            <a className="pn-backlink" href="/buyer"><ArrowLeft size={15} strokeWidth={2} aria-hidden="true" /> {t.backToDashboard}</a>

            <div
              className="pn-dots" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step}
              aria-label={t.stepOf.replace('{n}', String(step))}
            >
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={'pn-dot' + (i < step ? ' done' : i === step ? ' current' : '')} />
              ))}
            </div>

            <div key={step} ref={cardRef} className="pn-card nxm-panel">
              <h1>{stepHeading}</h1>

              {step === 1 && (
                <>
                  <p className="pn-sub">{t.step1Sub}</p>
                  <div className="pn-kinds" role="group" aria-label={t.step1Heading}>
                    {(['product', 'service', 'technology'] as RequestKind[]).map((k) => {
                      const Icon = KIND_ICON[k];
                      const label = kindLabel(t, k);
                      const hint = k === 'product' ? t.kindProductHint : k === 'service' ? t.kindServiceHint : t.kindTechnologyHint;
                      const on = selection === k;
                      return (
                        <button
                          key={k} type="button" className={'pn-kind nxm-press' + (on ? ' on' : '')}
                          aria-pressed={on} onClick={() => setSelection(k)}
                        >
                          {on && <Check size={14} strokeWidth={3} className="pn-kindcheck" aria-hidden="true" />}
                          <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                          <b>{label}</b>
                          <span>{hint}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button" className={'pn-unsure' + (selection === 'unsure' ? ' on' : '')}
                    aria-pressed={selection === 'unsure'} onClick={() => setSelection('unsure')}
                  >
                    <HelpCircle size={15} strokeWidth={1.75} aria-hidden="true" />
                    {t.kindUnsureLabel}
                  </button>
                  <div className="pn-foot">
                    <span />
                    <button type="button" className="pn-primary" disabled={!step1Ok} onClick={goNext}>
                      {selection === 'product' ? t.step1CtaProduct
                        : selection === 'service' ? t.step1CtaService
                        : selection === 'technology' ? t.step1CtaTechnology
                        : t.step1CtaUnsure}
                    </button>
                  </div>
                </>
              )}

              {step === 2 && selection && (
                <>
                  <div className="pn-field">
                    <label htmlFor="pn-desc">{t.step2Label}</label>
                    <textarea
                      id="pn-desc" rows={5} value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        selection === 'product' ? t.descPhProduct
                          : selection === 'service' ? t.descPhService
                          : selection === 'technology' ? t.descPhTechnology
                          : t.descPhUnsure
                      }
                    />
                    <small>{t.step2Hint}</small>
                  </div>
                  <div className="pn-foot">
                    <button type="button" className="pn-ghost" onClick={goBack}>{t.backLabel}</button>
                    <button type="button" className="pn-primary" disabled={!step2Ok} onClick={goNext}>{t.step2Cta}</button>
                  </div>
                </>
              )}

              {step === 3 && selection && (
                <>
                  <div className="pn-field">
                    <label htmlFor="pn-loc">{t.locationLabel}</label>
                    <input id="pn-loc" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t.locationPh} maxLength={300} />
                  </div>

                  {selection === 'product' && (
                    <div className="pn-row">
                      <div className="pn-field">
                        <label htmlFor="pn-qty">{t.quantityLabel}</label>
                        <input
                          id="pn-qty" type="number" min={1} inputMode="numeric" value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                        />
                      </div>
                      <div className="pn-field">
                        <label htmlFor="pn-unit">{t.unitLabel}</label>
                        <select id="pn-unit" value={unit} onChange={(e) => setUnit(e.target.value as QuantityUnit)}>
                          {QUANTITY_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {selection === 'technology' && (
                    <>
                      <div className="pn-field">
                        <label htmlFor="pn-users">{t.usersLocationsLabel}</label>
                        <input
                          id="pn-users" type="number" min={1} inputMode="numeric"
                          value={usersOrLocations ?? ''} placeholder={t.usersLocationsPh}
                          onChange={(e) => { const n = Number(e.target.value); setUsersOrLocations(e.target.value && Number.isFinite(n) && n > 0 ? Math.round(n) : null); }}
                        />
                      </div>
                      <div className="pn-field">
                        <label htmlFor="pn-systems">{t.currentSystemsLabel}</label>
                        <input id="pn-systems" type="text" value={currentSystems} onChange={(e) => setCurrentSystems(e.target.value)} placeholder={t.currentSystemsPh} maxLength={300} />
                      </div>
                    </>
                  )}

                  <div className="pn-field">
                    <span className="pn-label">{t.timelineLabel}</span>
                    <div className="pn-chips" role="group" aria-label={t.timelineLabel}>
                      {TIMELINE_OPTIONS.map((opt) => (
                        <button
                          key={opt} type="button" className={'pn-chip' + (timeline === opt ? ' on' : '')}
                          aria-pressed={timeline === opt} onClick={() => setTimeline(opt)}
                        >
                          {TIMELINE_LABEL[opt]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selection === 'technology' && (
                    budgetOpen ? (
                      <div className="pn-field">
                        <span className="pn-label">{t.addBudgetToggle.replace('+ ', '')}</span>
                        <div className="pn-row">
                          <div className="pn-field">
                            <label htmlFor="pn-bmin">{t.budgetMinLabel}</label>
                            <input id="pn-bmin" type="number" min={0} inputMode="numeric" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
                          </div>
                          <div className="pn-field">
                            <label htmlFor="pn-bmax">{t.budgetMaxLabel}</label>
                            <input id="pn-bmax" type="number" min={0} inputMode="numeric" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
                          </div>
                        </div>
                        <small className="pn-privacynote">{t.budgetPrivacyNote}</small>
                      </div>
                    ) : (
                      <button type="button" className="pn-addbudget" onClick={() => setBudgetOpen(true)}>{t.addBudgetToggle}</button>
                    )
                  )}

                  <div className="pn-foot">
                    <button type="button" className="pn-ghost" onClick={goBack}>{t.backLabel}</button>
                    <button type="button" className="pn-primary" disabled={!step3Ok} onClick={goNext}>{t.step3Cta}</button>
                  </div>
                </>
              )}

              {step === 4 && selection && (
                <>
                  <div className="pn-review">
                    <div className="pn-reviewrow"><span>{t.reviewType}</span><b>{kindLabel(t, selection)}</b></div>
                    <div className="pn-reviewrow pn-reviewblock"><span>{t.reviewDescription}</span><p>{description}</p></div>
                    <div className="pn-reviewrow"><span>{t.reviewLocation}</span><b>{location || t.reviewNotSpecified}</b></div>
                    {selection === 'product' && (
                      <div className="pn-reviewrow"><span>{t.reviewQuantity}</span><b>{quantity} {UNIT_LABEL[unit]}</b></div>
                    )}
                    {selection === 'technology' && (
                      <div className="pn-reviewrow"><span>{t.reviewUsersLocations}</span><b>{usersOrLocations ?? t.reviewNotSpecified}</b></div>
                    )}
                    {selection === 'technology' && currentSystems.trim() && (
                      <div className="pn-reviewrow"><span>{t.reviewCurrentSystems}</span><b>{currentSystems}</b></div>
                    )}
                    <div className="pn-reviewrow"><span>{t.reviewTimeline}</span><b>{timeline ? TIMELINE_LABEL[timeline] : t.reviewNotSpecified}</b></div>
                    {selection === 'technology' && budgetOpen && (budgetMin || budgetMax) && (
                      <div className="pn-reviewrow">
                        <span>{t.reviewBudget}</span>
                        <b>{budgetMin || '0'}{' – '}{budgetMax || '…'} <em>({t.reviewPrivateNote})</em></b>
                      </div>
                    )}
                  </div>
                  <p className="pn-reassurance">{t.reassurance}</p>
                  {error && <p className="pn-error" role="alert">{error}</p>}
                  <div className="pn-foot">
                    <button type="button" className="pn-ghost" onClick={goBack} disabled={sending}>{t.backLabel}</button>
                    <button type="button" className="pn-primary" onClick={handleSend} disabled={sending}>{sending ? t.sendingLabel : t.sendLabel}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Self-drawing violet checkmark for the confirmation screen — same stroke-
// dasharray/dashoffset technique already established in
// src/app/vendor/onboarding/page.tsx and src/components/buyer/
// AcceptCelebration.tsx, new namespace (pn-) so it doesn't touch either.
// Reduced-motion safe via the sitewide rule in globals.css (collapses every
// animation duration, including this one, to near-zero).
function ConfirmCheck() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="pn-confirmcheck">
      <circle cx="28" cy="28" r="25" stroke="var(--spec-violet,#6C5CE0)" strokeWidth="2.25" className="pn-checkring" />
      <path d="M17 29 24.5 36.5 39 20" stroke="var(--spec-violet,#6C5CE0)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="pn-checkdraw" />
    </svg>
  );
}

const CSS = `
.pn{min-height:100dvh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-postneed),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;}
.pn *{box-sizing:border-box;}
.pn a:focus-visible,.pn button:focus-visible,.pn input:focus-visible,.pn textarea:focus-visible,.pn select:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.pn-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:20;}
.pn-brand{display:flex;align-items:baseline;gap:2px;color:var(--spec-ink,#141320);text-decoration:none;}
.pn-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;letter-spacing:-.01em;}
.pn-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.pn-shell{display:flex;align-items:flex-start;justify-content:center;padding:40px 20px calc(60px + env(safe-area-inset-bottom));}
.pn-empty{text-align:center;padding:80px 0;color:var(--spec-text-2nd,#615F72);display:flex;flex-direction:column;gap:14px;align-items:center;}
.pn-signincta{color:#fff;background:var(--spec-violet,#6C5CE0);border-radius:10px;padding:12px 20px;font-weight:700;font-size:14px;text-decoration:none;min-height:44px;display:inline-flex;align-items:center;}
.pn-signincta:hover{background:var(--spec-violet-deep,#4A3DB0);}
.pn-cardwrap{width:100%;max-width:640px;}
.pn-backlink{display:inline-flex;align-items:center;gap:6px;color:var(--spec-text-2nd,#615F72);font-size:13px;font-weight:600;text-decoration:none;margin-bottom:18px;min-height:24px;}
.pn-backlink:hover{color:var(--spec-violet-deep,#4A3DB0);}
.pn-dots{display:flex;gap:6px;margin-bottom:18px;}
.pn-dot{flex:1;max-width:64px;height:4px;border-radius:99px;background:var(--spec-border,#E2DFEC);transition:background var(--spec-duration-reveal,220ms) var(--spec-ease,ease);}
.pn-dot.done{background:var(--spec-violet,#6C5CE0);opacity:.5;}
.pn-dot.current{background:var(--spec-violet,#6C5CE0);}
.pn-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:20px;padding:32px;box-shadow:0 12px 32px rgba(108,92,224,.08);}
.pn-card h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:23px;font-weight:700;letter-spacing:-.01em;margin:0 0 6px;}
.pn-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;margin:0 0 20px;}
.pn-kinds{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:18px;margin-bottom:12px;}
@media(max-width:560px){.pn-kinds{grid-template-columns:1fr;}}
.pn-kind{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;background:var(--spec-warm-white,#F8F7FB);border:1.5px solid var(--spec-border,#E2DFEC);border-radius:14px;padding:16px 14px;cursor:pointer;color:var(--spec-ink,#141320);min-height:44px;transition:border-color .15s,background .15s,transform .15s,box-shadow .15s;}
.pn-kind:hover{border-color:var(--spec-violet,#6C5CE0);transform:translateY(-2px);box-shadow:0 8px 20px rgba(20,19,32,.08);}
.pn-kind.on{border-color:var(--spec-violet,#6C5CE0);background:rgba(108,92,224,.07);}
.pn-kind svg:not(.pn-kindcheck){color:var(--spec-violet-deep,#4A3DB0);}
.pn-kind b{font-size:14.5px;font-weight:700;}
.pn-kind span{font-size:11.5px;color:var(--spec-text-2nd,#615F72);line-height:1.4;}
.pn-kindcheck{position:absolute;top:12px;right:12px;color:var(--spec-violet,#6C5CE0);}
.pn-unsure{display:inline-flex;align-items:center;gap:7px;background:none;border:none;font-family:inherit;font-size:13px;font-weight:600;color:var(--spec-text-2nd,#615F72);cursor:pointer;padding:8px 2px;min-height:44px;}
.pn-unsure:hover{color:var(--spec-violet-deep,#4A3DB0);}
.pn-unsure.on{color:var(--spec-violet-deep,#4A3DB0);font-weight:700;}
.pn-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
.pn-field label,.pn-label{font-size:13px;font-weight:600;color:var(--spec-ink,#141320);}
.pn-field input,.pn-field select,.pn-field textarea{font-family:inherit;font-size:14.5px;padding:11px 13px;min-height:44px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);outline:none;resize:vertical;width:100%;}
.pn-field input:focus,.pn-field select:focus,.pn-field textarea:focus{border-color:var(--spec-violet,#6C5CE0);}
.pn-field small{color:var(--spec-text-2nd,#615F72);font-size:11.5px;}
.pn-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media(max-width:480px){.pn-row{grid-template-columns:1fr;}}
.pn-chips{display:flex;flex-wrap:wrap;gap:8px;}
.pn-chip{font-family:inherit;font-size:13px;font-weight:600;padding:9px 14px;min-height:44px;border-radius:99px;border:1.5px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-text-2nd,#615F72);cursor:pointer;transition:all .12s;}
.pn-chip:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.pn-chip.on{background:var(--spec-violet,#6C5CE0);border-color:var(--spec-violet,#6C5CE0);color:#fff;}
.pn-addbudget{display:inline-flex;align-items:center;background:none;border:none;font-family:inherit;font-size:13px;font-weight:700;color:var(--spec-violet-deep,#4A3DB0);cursor:pointer;padding:6px 0;min-height:44px;}
.pn-addbudget:hover{color:var(--spec-violet,#6C5CE0);}
.pn-privacynote{color:var(--spec-text-2nd,#615F72);font-size:11.5px;margin-top:-4px;}
.pn-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:24px;padding-top:20px;border-top:1px solid var(--spec-border,#E2DFEC);}
.pn-primary{font-family:inherit;font-size:14.5px;font-weight:700;padding:13px 22px;min-height:48px;border-radius:11px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease-out);text-decoration:none;display:inline-flex;align-items:center;justify-content:center;}
.pn-primary:hover:not(:disabled){background:var(--spec-violet-deep,#4A3DB0);}
.pn-primary:disabled{opacity:.5;cursor:not-allowed;}
.pn-ghost{font-family:inherit;font-size:14px;font-weight:600;padding:13px 18px;min-height:48px;border-radius:11px;border:1.5px solid var(--spec-border,#E2DFEC);background:none;color:var(--spec-ink,#141320);cursor:pointer;}
.pn-ghost:hover:not(:disabled){border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.pn-ghost:disabled{opacity:.5;cursor:not-allowed;}
.pn-review{display:flex;flex-direction:column;gap:12px;margin:6px 0 18px;}
.pn-reviewrow{display:flex;justify-content:space-between;gap:16px;font-size:13.5px;border-bottom:1px solid var(--spec-border,#E2DFEC);padding-bottom:10px;}
.pn-reviewrow span{color:var(--spec-text-2nd,#615F72);flex-shrink:0;}
.pn-reviewrow b{text-align:right;font-weight:700;}
.pn-reviewrow em{font-style:normal;color:var(--spec-text-2nd,#615F72);font-weight:500;font-size:11.5px;}
.pn-reviewblock{flex-direction:column;align-items:flex-start;gap:4px;}
.pn-reviewblock p{margin:0;font-weight:500;color:var(--spec-ink,#141320);line-height:1.5;text-align:left;white-space:pre-wrap;}
.pn-reassurance{font-size:13px;color:var(--spec-text-2nd,#615F72);line-height:1.6;margin:0;}
.pn-error{color:var(--spec-error,#CE4B43);font-size:13px;margin:10px 0 0;}
.pn-confirm{width:100%;max-width:420px;text-align:center;padding:60px 20px;display:flex;flex-direction:column;align-items:center;gap:8px;}
.pn-confirmcheck{margin-bottom:10px;}
.pn-checkring{opacity:.35;}
.pn-checkdraw{stroke-dasharray:32;stroke-dashoffset:32;animation:pn-draw 420ms 200ms var(--nxm-ease-entrance,ease-out) forwards;}
@keyframes pn-draw{to{stroke-dashoffset:0;}}
.pn-confirm h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:6px 0 0;}
.pn-confirm p{color:var(--spec-text-2nd,#615F72);font-size:14px;margin:0;}
.pn-ref{font-size:13px;}
.pn-confirmcta{margin-top:16px;}
@media(max-width:640px){
  .pn-shell{padding:0;align-items:stretch;}
  .pn-cardwrap{max-width:none;padding:20px 16px calc(20px + env(safe-area-inset-bottom));}
  .pn-card{border-radius:0;border-left:none;border-right:none;box-shadow:none;padding:24px 4px;}
  .pn-foot{position:sticky;bottom:0;background:rgba(255,255,255,.96);backdrop-filter:blur(16px);margin:24px -4px 0;padding:16px 4px calc(16px + env(safe-area-inset-bottom));}
  .pn-primary,.pn-ghost{flex:1;}
}
`;
