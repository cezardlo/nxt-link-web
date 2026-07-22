'use client';

// Create account — two clear steps:
//   1) "How will you use NXT//LINK?" — Buy for my company (recommended) /
//      Join as a vendor / Buyer and vendor.
//   2) Enter email + password + accept the Terms/Privacy (click-wrap).
// Operator accounts are granted by the NXT Link team, never self-served.
// Account creation happens SERVER-SIDE via POST /api/auth/signup (one signup
// system, all lanes) so the terms acceptance is recorded fail-closed before
// the account exists. Sends the Supabase confirmation email; the account
// stays limited until the email is verified.
// Vendors from this ORGANIC lane are routed into /apply — the admin-reviewed
// application flow (invited vendors join via /join/<token> instead).
//
// 2026-07-22 RESTYLE ("match Codex's look"): Cesar reviewed a further-along
// Codex build at localhost:3014 and asked to match it — the dark two-panel
// "STEP 1 OF 2 / YOUR INDUSTRIAL BUYING WORKSPACE" role-selector screen
// (src/app/signup/page.tsx in a separate local reference checkout, read-only
// design reference). Reproduced here: same look, same 3-way role choice
// (Buy for my company [recommended] / Join as a vendor / Buyer and vendor),
// same right-panel trust card. AUTH WIRING IS UNCHANGED — still THIS
// branch's /api/auth/signup, /auth/callback, and Google/LinkedIn/Microsoft
// buttons (flag-gated exactly as before):
//   - "Buy for my company"   -> role 'client' (buyer path, no profile step)
//   - "Join as a vendor"     -> role 'vendor' (organic PENDING lane, /apply
//                                after email confirm)
//   - "Buyer and vendor"     -> role 'vendor' — SAME account, SAME organic
//                                vendor lane (a buyer can always browse and
//                                request quotes; there is no separate
//                                "buyer-only" gate to lift). Never sent to
//                                the API as a third value — the fee engine,
//                                /apply, and /auth/callback only know
//                                'client' | 'vendor'.
// Did NOT copy from the reference build: its extra "full name" / "company
// name" step-2 fields (this branch's /api/auth/signup does not accept or
// persist them — adding fields that silently vanish would be a broken
// promise, not a faithful port) and its Google-only OAuth wiring (this
// branch already supports Google + LinkedIn + Microsoft, all flag-gated via
// src/lib/auth/oauth.ts — kept exactly as-is).
//
// Continue with Google / LinkedIn / Microsoft (flags NEXT_PUBLIC_AUTH_GOOGLE,
// _LINKEDIN, _AZURE): Fiverr pattern on the details step — buttons stacked +
// "or" divider above the form, gated behind the same click-wrap checkbox
// (moved to the top when any flag is on). Vendor role threads
// oauth_lane=organic (the exact same PENDING lane /vendor-signup uses — an
// OAuth click is inherently the "quick" one-click path, so any vendor OAuth
// click gets that lane regardless of which screen it started from, or which
// provider); buyer role threads oauth_lane=buyer (no profile to create,
// click-wrap still recorded fail-closed). See src/lib/auth/oauth.ts.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, RefreshCw, ShoppingCart, Store } from 'lucide-react';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import OAuthButton from '@/components/OAuthButton';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';
import { GOOGLE_TERMS_ERROR_MSG, bilingualCopy, ANY_OAUTH_ENABLED } from '@/lib/auth/oauth';

type Mode = 'buyer' | 'vendor' | 'both';
type Step = 'role' | 'details';

// Vendor/supplier business types (maturity + kind) captured at signup and
// stored in user metadata for the vendor's fit profile. Unchanged from the
// prior pass — same values /api/auth/signup already accepts as vendor_type.
const VENDOR_TYPES: Array<{ value: string; en: string; es: string }> = [
  { value: 'Manufacturer', en: 'Manufacturer', es: 'Fabricante' },
  { value: 'Distributor / Supplier', en: 'Distributor / product vendor', es: 'Distribuidor / proveedor' },
  { value: 'Service provider', en: 'Service provider', es: 'Proveedor de servicios' },
  { value: 'System integrator', en: 'System integrator', es: 'Integrador de sistemas' },
  { value: 'Consultant', en: 'Consultant', es: 'Consultor' },
  { value: 'Startup / emerging', en: 'Startup / emerging', es: 'Startup / emergente' },
  { value: 'Other', en: 'Other', es: 'Otro' },
];

const T: Record<Lang, Record<string, string>> = {
  en: {
    step: 'Step', of: 'of', back: 'Back to account type',
    eyebrow: 'Your industrial buying workspace',
    roleTitle: 'How will you use NXT//LINK?',
    roleSub: 'Choose what fits today. You can use buyer tools and vendor tools from the same account.',
    buyer: 'Buy for my company',
    recommended: 'Recommended start',
    buyerDesc: 'Find vendors, request quotes, and track purchases.',
    vendor: 'Join as a vendor',
    vendorDesc: 'Publish products and services, answer buyers, and manage quotes.',
    both: 'Buyer and vendor',
    bothDesc: 'Use one account for sourcing and for your company’s vendor storefront.',
    continue: 'Continue',
    detailsTitle: 'Create your account',
    detailsSub: 'This takes about a minute. You can finish your profile after you enter.',
    account: 'Account',
    email: 'Work email',
    password: 'Password (8+ characters)',
    show: 'Show', hide: 'Hide',
    vendorType: 'What kind of business is it? (optional)',
    agreeStart: 'I agree to the', terms: 'Terms of Service', and: 'and', privacy: 'Privacy Policy',
    orEmail: 'or continue with email',
    create: 'Create account', creating: 'Creating…',
    signInLead: 'Already have an account?', signIn: 'Sign in',
    team: 'NXT Link operator? Team accounts are provided internally.',
    trustTitle: 'Free to join and start a conversation',
    trustText: 'There is no fee to ask questions, request a quote, or propose a pilot. NXT//LINK earns a clearly disclosed commission only when business is completed through the platform.',
    trustActions: 'RFQs · quotes · messages',
    trustTeam: 'NXT//LINK team accounts are provided internally.',
    sentTitle: 'Check your email',
    sentText: 'We sent a confirmation link to',
    sentBuyer: 'Until your email is verified, some actions stay limited.',
    sentVendor: 'After you verify, the next step is a short vendor application — a human on our team reviews every one.',
    confirmed: 'Already confirmed? Sign in',
    errTerms: 'Please accept the Terms of Service and Privacy Policy.',
    errCreate: 'Could not create the account. Try again.',
  },
  es: {
    step: 'Paso', of: 'de', back: 'Volver al tipo de cuenta',
    eyebrow: 'Tu espacio de compras industriales',
    roleTitle: '¿Cómo usarás NXT//LINK?',
    roleSub: 'Elige lo que necesitas hoy. Puedes comprar y vender desde la misma cuenta.',
    buyer: 'Comprar para mi empresa',
    recommended: 'Inicio recomendado',
    buyerDesc: 'Encuentra proveedores, solicita cotizaciones y sigue tus compras.',
    vendor: 'Unirme como proveedor',
    vendorDesc: 'Publica productos y servicios, responde a compradores y gestiona cotizaciones.',
    both: 'Comprador y proveedor',
    bothDesc: 'Usa una cuenta para abastecerte y para el escaparate de proveedor de tu empresa.',
    continue: 'Continuar',
    detailsTitle: 'Crea tu cuenta',
    detailsSub: 'Toma cerca de un minuto. Puedes completar tu perfil después de entrar.',
    account: 'Cuenta',
    email: 'Correo de trabajo',
    password: 'Contraseña (8+ caracteres)',
    show: 'Mostrar', hide: 'Ocultar',
    vendorType: '¿Qué tipo de empresa es? (opcional)',
    agreeStart: 'Acepto los', terms: 'Términos de Servicio', and: 'y el', privacy: 'Aviso de Privacidad',
    orEmail: 'o continúa con correo',
    create: 'Crear cuenta', creating: 'Creando…',
    signInLead: '¿Ya tienes una cuenta?', signIn: 'Inicia sesión',
    team: '¿Eres del equipo NXT Link? Las cuentas de operador se otorgan internamente.',
    trustTitle: 'Gratis para unirte y comenzar una conversación',
    trustText: 'No hay costo por hacer preguntas, pedir una cotización o proponer un piloto. NXT//LINK gana una comisión claramente informada solo cuando el negocio se completa dentro de la plataforma.',
    trustActions: 'Cotizaciones · solicitudes · mensajes',
    trustTeam: 'Las cuentas del equipo NXT//LINK se otorgan internamente.',
    sentTitle: 'Revisa tu correo',
    sentText: 'Enviamos un enlace de confirmación a',
    sentBuyer: 'Hasta que verifiques tu correo, algunas acciones permanecen limitadas.',
    sentVendor: 'Después de verificar, el siguiente paso es una breve solicitud de proveedor — nuestro equipo revisa cada una.',
    confirmed: '¿Ya confirmaste? Inicia sesión',
    errTerms: 'Acepta los Términos de Servicio y el Aviso de Privacidad.',
    errCreate: 'No pudimos crear la cuenta. Intenta de nuevo.',
  },
};

const ROLE_OPTIONS: Array<{ mode: Mode; icon: typeof ShoppingCart; titleKey: 'buyer' | 'vendor' | 'both'; descKey: 'buyerDesc' | 'vendorDesc' | 'bothDesc' }> = [
  { mode: 'buyer', icon: ShoppingCart, titleKey: 'buyer', descKey: 'buyerDesc' },
  { mode: 'vendor', icon: Store, titleKey: 'vendor', descKey: 'vendorDesc' },
  { mode: 'both', icon: RefreshCw, titleKey: 'both', descKey: 'bothDesc' },
];

export default function SignupPage() {
  const [lang, setLang] = useLang();
  const t = T[lang];
  const [step, setStep] = useState<Step>('role');
  // Buyer is the safest reversible default for a marketplace visitor.
  const [mode, setMode] = useState<Mode>('buyer');
  const [vendorType, setVendorType] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // /auth/callback bounces back here with ?err=google_terms when the
  // fail-closed terms recording on an OAuth path couldn't be written —
  // surface the same bilingual error the email path shows on that failure.
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('err') === 'google_terms') {
        setErr(bilingualCopy(GOOGLE_TERMS_ERROR_MSG, lang));
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Buyer and vendor" is the SAME account + SAME organic vendor lane as
  // plain "vendor" — there is no third role in the data model, only a third
  // choice in this UI (task instruction: role choices map to the two
  // existing lanes).
  const sellerMode = mode === 'vendor' || mode === 'both';
  const apiRole: 'client' | 'vendor' = sellerMode ? 'vendor' : 'client';
  const roleLabel = t[mode];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) {
      setErr(t.errTerms);
      return;
    }
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role: apiRole,
          vendor_type: sellerMode ? vendorType || null : null,
          locale: lang,
          terms_accepted: agree,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) { setErr(j.message || t.errCreate); setBusy(false); return; }
      if (j.session) {
        // Email confirmation disabled in project settings — go straight in.
        // Organic vendors go to the application/review flow, buyers to /buyer.
        await fetch('/api/auth/me');
        window.location.href = sellerMode ? '/apply?from=signup' : '/buyer';
        return;
      }
      setSent(true);
    } catch {
      setErr(t.errCreate);
    }
    setBusy(false);
  }

  // Shared click-wrap checkbox — rendered ABOVE the OAuth buttons when any
  // provider flag is on (must be ticked before the buttons are enabled), or
  // in its original spot inside the form when every flag is off.
  const agreeCheckbox = (
    <label className="su-agree">
      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
      <span>
        {t.agreeStart} <Link href="/terms" target="_blank" rel="noopener">{t.terms}</Link> {t.and} <Link href="/privacy" target="_blank" rel="noopener">{t.privacy}</Link>.
      </span>
    </label>
  );

  return (
    <main className="su">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="su-header">
        <Link className="su-brand" href="/" aria-label="NXT Link home"><b>NXT<i>{'//'}</i>LINK</b></Link>
        <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
      </header>

      <section className="su-layout">
        <div className="su-card">
          {!sent && (
            <div className="su-progress" aria-label={`${t.step} ${step === 'role' ? 1 : 2} ${t.of} 2`}>
              <span>{t.step} {step === 'role' ? 1 : 2} {t.of} 2</span>
              <div><i className="on" /><i className={step === 'details' ? 'on' : ''} /></div>
            </div>
          )}

          {sent ? (
            <div className="su-sent">
              <div className="su-success"><Check aria-hidden="true" /></div>
              <h1>{t.sentTitle}</h1>
              <p className="su-sub">{t.sentText} <b>{email}</b>.</p>
              <div className="su-next">{sellerMode ? t.sentVendor : t.sentBuyer}</div>
              <Link className="su-btn" href="/login">{t.confirmed}</Link>
            </div>
          ) : step === 'role' ? (
            <>
              <p className="su-eyebrow">{t.eyebrow}</p>
              <h1>{t.roleTitle}</h1>
              <p className="su-sub">{t.roleSub}</p>

              <div className="su-roles" role="group" aria-label={t.roleTitle}>
                {ROLE_OPTIONS.map(({ mode: option, icon: Icon, titleKey, descKey }) => (
                  <button
                    type="button"
                    key={option}
                    className={'su-role' + (mode === option ? ' on' : '')}
                    aria-pressed={mode === option}
                    onClick={() => { setMode(option); if (option === 'buyer') setVendorType(''); }}
                  >
                    <span className="su-roleicon"><Icon aria-hidden="true" /></span>
                    <span className="su-roletext">
                      <b>{t[titleKey]} {option === 'buyer' && <em className="su-recommended">{t.recommended}</em>}</b>
                      <small>{t[descKey]}</small>
                    </span>
                    <span className="su-radio">{mode === option && <Check aria-hidden="true" />}</span>
                  </button>
                ))}
              </div>

              <button className="su-btn" type="button" onClick={() => setStep('details')}>{t.continue}</button>

              <p className="su-hint">{t.team}</p>
              <p className="su-signin">{t.signInLead} <Link href="/login">{t.signIn}</Link></p>
            </>
          ) : (
            <>
              <button className="su-back" type="button" onClick={() => setStep('role')}>
                <ArrowLeft size={16} aria-hidden="true" /> {t.back}
              </button>
              <p className="su-eyebrow">{t.account}: {roleLabel}</p>
              <h1>{t.detailsTitle}</h1>
              <p className="su-sub">{t.detailsSub}</p>

              {sellerMode && (
                <fieldset className="su-vtype">
                  <legend>{t.vendorType}</legend>
                  <div className="su-chips">
                    {VENDOR_TYPES.map(({ value, en, es }) => (
                      <button type="button" key={value} aria-pressed={vendorType === value} className={'su-chip' + (vendorType === value ? ' on' : '')} onClick={() => setVendorType(vendorType === value ? '' : value)}>
                        {lang === 'es' ? es : en}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {ANY_OAUTH_ENABLED && (
                <div className="su-oauth">
                  {agreeCheckbox}
                  <GoogleAuthButton
                    lang={lang}
                    next={sellerMode ? '/vendor/portal?welcome=1' : '/buyer'}
                    from="/signup"
                    lane={sellerMode ? 'organic' : 'buyer'}
                    disabled={!agree}
                    onError={setErr}
                    className="su-google"
                    bilingualErrors
                  />
                  <OAuthButton
                    provider="linkedin_oidc"
                    lang={lang}
                    next={sellerMode ? '/vendor/portal?welcome=1' : '/buyer'}
                    from="/signup"
                    lane={sellerMode ? 'organic' : 'buyer'}
                    disabled={!agree}
                    onError={setErr}
                    className="su-google"
                    bilingualErrors
                  />
                  <OAuthButton
                    provider="azure"
                    lang={lang}
                    next={sellerMode ? '/vendor/portal?welcome=1' : '/buyer'}
                    from="/signup"
                    lane={sellerMode ? 'organic' : 'buyer'}
                    disabled={!agree}
                    onError={setErr}
                    className="su-google"
                    bilingualErrors
                  />
                  <div className="su-or"><span>{t.orEmail}</span></div>
                </div>
              )}

              <form onSubmit={submit}>
                <label className="su-field"><span>{t.email}</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
                </label>
                <label className="su-field"><span>{t.password}</span>
                  <div className="su-pwrow">
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                    <button type="button" className="su-pwtoggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? t.hide : t.show}>{showPw ? t.hide : t.show}</button>
                  </div>
                </label>
                {!ANY_OAUTH_ENABLED && agreeCheckbox}
                {err && <div className="su-err" role="alert" aria-live="polite">{err}</div>}
                <button className="su-btn" type="submit" disabled={busy}>{busy ? t.creating : t.create}</button>
              </form>

              <p className="su-signin">{t.signInLead} <Link href="/login">{t.signIn}</Link></p>
            </>
          )}
        </div>

        <aside className="su-trust">
          <div className="su-trusticon"><Check aria-hidden="true" /></div>
          <h2>{t.trustTitle}</h2>
          <p>{t.trustText}</p>
          <div className="su-trustline"><span><Check aria-hidden="true" /></span>{t.trustActions}</div>
          <div className="su-trustline"><span><Check aria-hidden="true" /></span>{t.trustTeam}</div>
        </aside>
      </section>
    </main>
  );
}

const CSS = `
.su{min-height:100vh;background:radial-gradient(circle at 85% 0%,rgba(108,92,224,.2),transparent 34%),var(--spec-ink);color:#F5F4FA;font-family:var(--font-ibm-plex-sans-header),'IBM Plex Sans',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;padding:26px 22px 48px;-webkit-font-smoothing:antialiased;}
.su *{box-sizing:border-box;}
.su h1,.su h2{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;}
.su-header{width:min(1060px,100%);margin:0 auto 32px;display:flex;align-items:center;justify-content:space-between;}
.su-brand{color:#fff;text-decoration:none;font-size:19px;font-weight:800;letter-spacing:-.03em;}
.su-brand i{color:var(--spec-lilac);font-style:normal;}

.su-layout{width:min(1060px,100%);margin:auto;display:grid;grid-template-columns:minmax(0,600px) minmax(240px,1fr);gap:26px;align-items:center;}
.su-card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.1);box-shadow:0 24px 70px rgba(0,0,0,.35);border-radius:20px;padding:32px;}
.su-progress{display:flex;align-items:center;justify-content:space-between;color:#8B889C;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:26px;}
.su-progress div{display:flex;gap:6px;}
.su-progress i{display:block;width:40px;height:4px;border-radius:99px;background:rgba(255,255,255,.14);}
.su-progress i.on{background:var(--spec-violet);}
.su-eyebrow{color:var(--spec-lilac);font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin:0 0 10px;}
.su-card h1{color:#fff;font-size:clamp(24px,3.6vw,32px);line-height:1.1;letter-spacing:-.03em;margin:0;}
.su-sub{color:#ABA7BE;font-size:14px;line-height:1.6;margin:11px 0 22px;max-width:520px;}
.su-sub b{color:#C9BFFF;}

.su-roles{display:flex;flex-direction:column;gap:10px;margin:0 0 18px;}
.su-role{width:100%;display:grid;grid-template-columns:42px 1fr 22px;gap:13px;align-items:center;text-align:left;padding:15px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:14px;color:#F5F4FA;cursor:pointer;font:inherit;transition:border-color .15s,background .15s,transform .15s;}
.su-role:hover{border-color:rgba(169,157,242,.6);transform:translateY(-1px);}
.su-role.on{border-color:var(--spec-violet);background:rgba(108,92,224,.12);}
.su-roleicon{width:40px;height:40px;border-radius:11px;background:rgba(108,92,224,.16);color:var(--spec-lilac);display:grid;place-items:center;}
.su-roleicon svg{width:19px;height:19px;}
.su-roletext{min-width:0;}
.su-roletext b{display:block;font-size:14.5px;margin-bottom:3px;}
.su-roletext small{display:block;color:#918DA2;font-size:12px;line-height:1.45;}
.su-radio{width:20px;height:20px;border-radius:50%;border:1.5px solid #565266;display:grid;place-items:center;}
.su-role.on .su-radio{background:var(--spec-violet);border-color:var(--spec-violet);}
.su-radio svg{width:12px;stroke-width:3;color:#fff;}
.su-recommended{display:inline-block;margin-left:7px;padding:2px 7px;border-radius:99px;background:rgba(108,92,224,.18);color:#C9BFFF;font-size:9px;font-style:normal;font-weight:800;letter-spacing:.03em;text-transform:uppercase;vertical-align:1px;}

.su-btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;border:0;border-radius:11px;background:var(--spec-violet);color:#fff;text-decoration:none;font:700 14.5px inherit;cursor:pointer;transition:background .15s;}
.su-btn:hover{background:var(--spec-violet-deep);}
.su-btn:disabled{opacity:.45;cursor:not-allowed;}
.su-signin{text-align:center;color:#7A768C;font-size:13px;margin:16px 0 0;}
.su-signin a,.su-agree a{color:#C9BFFF;}
.su-hint{color:#726E86;font-size:12px;line-height:1.6;margin:16px 0 0;text-align:center;}
.su-back{display:flex;align-items:center;gap:6px;background:none;border:0;color:#C9BFFF;font:650 13px inherit;cursor:pointer;padding:0;margin-bottom:16px;}

.su-card form{display:flex;flex-direction:column;gap:14px;}
.su-field span{display:block;color:#B4B0C6;font-size:12px;font-weight:700;margin:0 0 6px;}
.su-field input{width:100%;height:44px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(0,0,0,.25);color:#fff;font:14px inherit;padding:0 13px;outline:none;}
.su-field input:focus{border-color:var(--spec-violet);box-shadow:0 0 0 3px rgba(108,92,224,.15);}
.su-pwrow{position:relative;}
.su-pwrow input{padding-right:66px !important;}
.su-pwtoggle{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:none;color:#C9BFFF;font:650 12px inherit;cursor:pointer;padding:8px;}
.su-vtype{border:0;padding:0;margin:0 0 4px;}
.su-vtype legend{color:#B4B0C6;font-size:12px;font-weight:700;margin:0 0 10px;padding:0;}
.su-chips{display:flex;flex-wrap:wrap;gap:8px;}
.su-chip{font:600 12px inherit;padding:8px 12px;border-radius:99px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.03);color:#A6A2B8;cursor:pointer;}
.su-chip:hover{border-color:rgba(169,157,242,.6);color:#C9BFFF;}
.su-chip.on{background:rgba(108,92,224,.16);border-color:var(--spec-violet);color:#C9BFFF;}
.su-agree{display:flex;gap:10px;align-items:flex-start;cursor:pointer;margin:2px 0 0;}
.su-agree input{width:16px;height:16px;flex:0 0 auto;margin-top:2px;accent-color:var(--spec-violet);cursor:pointer;}
.su-agree input:focus-visible{outline:2px solid var(--spec-violet);outline-offset:2px;}
.su-agree span{font-size:11.5px;line-height:1.55;color:#8B879E;}
.su-oauth{margin:2px 0 4px;display:flex;flex-direction:column;gap:10px;}
.su-oauth .su-agree{margin-bottom:6px;}
.su-google{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:46px;border:0;border-radius:11px;background:#fff;color:#191821;font:700 14px inherit;cursor:pointer;}
.su-google:disabled{opacity:.5;cursor:not-allowed;}
.su-or{display:flex;align-items:center;gap:10px;color:#676374;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;}
.su-or::before,.su-or::after{content:'';height:1px;flex:1;background:rgba(255,255,255,.09);}
.su-err{background:rgba(206,75,67,.12);border:1px solid rgba(206,75,67,.3);color:#FFB4B0;border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.45;}

.su-trust{padding:30px 22px;color:#ABA7BE;}
.su-trusticon,.su-success{width:44px;height:44px;border-radius:14px;background:rgba(108,92,224,.18);color:#C9BFFF;display:grid;place-items:center;margin-bottom:16px;}
.su-trusticon svg,.su-success svg{width:20px;stroke-width:3;}
.su-trust h2{color:#F5F4FA;font-size:21px;line-height:1.2;letter-spacing:-.02em;margin:0 0 12px;}
.su-trust>p{font-size:13.5px;line-height:1.7;margin:0 0 18px;}
.su-trustline{display:flex;align-items:flex-start;gap:9px;font-size:12px;line-height:1.5;margin:10px 0;}
.su-trustline span{width:16px;height:16px;border-radius:50%;background:rgba(47,158,106,.16);color:#7BDDA8;display:grid;place-items:center;flex:0 0 auto;}
.su-trustline svg{width:10px;stroke-width:3;}

.su-sent{text-align:center;padding:10px 0;}
.su-sent h1{margin:0;}
.su-sent .su-success{margin:0 auto 16px;}
.su-sent .su-sub{color:#ABA7BE;}
.su-next{background:rgba(108,92,224,.09);border:1px solid rgba(169,157,242,.18);border-radius:13px;color:#C4C0D6;font-size:13px;line-height:1.6;padding:14px;margin:20px 0;}
.su-sent .su-btn{margin-top:6px;}

@media(max-width:820px){
  .su{padding:20px 16px 36px;}
  .su-header{margin-bottom:22px;}
  .su-layout{grid-template-columns:1fr;}
  .su-trust{padding:10px 6px 0;}
  .su-trust>p{margin-bottom:12px;}
  .su-card{padding:24px 20px;border-radius:18px;}
  .su-card h1{font-size:26px;}
}
@media(max-width:420px){
  .su{padding-left:10px;padding-right:10px;}
  .su-header{padding:0 4px;}
  .su-role{grid-template-columns:38px 1fr 20px;padding:13px;gap:10px;}
  .su-roleicon{width:36px;height:36px;}
  .su-card{padding:20px 15px;}
}
`;
