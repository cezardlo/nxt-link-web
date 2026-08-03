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
//
// 2026-07-29 (Cesar): the role QUESTION is gone entirely — signup is one
// step, every account is created as a buyer ('client'), and selling starts
// later via a "Start selling" option once they're inside (routes to /apply,
// the reviewed vendor application). Vendor-direct recruiting still uses the
// separate /vendor-signup page. The right-side trust card explains the
// one-account-both-sides model. The API's optional `use_case`/`vendor_type`
// fields still exist server-side; this page always sends null for them.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IBM_Plex_Sans } from 'next/font/google';
import { Check, RefreshCw, Mail, Lock } from 'lucide-react';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import OAuthButton from '@/components/OAuthButton';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';
import { GOOGLE_TERMS_ERROR_MSG, bilingualCopy, ANY_OAUTH_ENABLED } from '@/lib/auth/oauth';
import { MOTION_CSS } from '@/components/motion/Motion';

// Design System v1.0 reskin (2026-07-23): light warm-white + violet, matching
// /vendor-signup and the rest of the funnel. Visual/CSS only — every handler,
// the role/step state machine, and the bilingual copy above are unchanged.
// (Also fixes a dangling `var(--font-ibm-plex-sans-header)` reference in the
// old CSS that was never defined by any font loader — this page now loads
// its own IBM Plex Sans instance, same pattern as /login and /cart.)
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-signup',
  display: 'swap',
});

const T: Record<Lang, Record<string, string>> = {
  en: {
    docTitle: 'Create account — NXT//LINK',
    eyebrow: 'Your industrial buying workspace',
    detailsTitle: 'Create your account',
    detailsSub: 'This takes about a minute. You can finish your profile after you enter.',
    email: 'Work email',
    password: 'Password (8+ characters)',
    show: 'Show', hide: 'Hide',
    agreeStart: 'I agree to the', terms: 'Terms of Service', and: 'and', privacy: 'Privacy Policy',
    orEmail: 'or continue with email',
    create: 'Create account', creating: 'Creating…',
    signInLead: 'Already have an account?', signIn: 'Sign in',
    trustTitle: 'Free to join and start a conversation',
    trustText: 'There is no fee to ask questions, request a quote, or propose a pilot. NXT//LINK earns a clearly disclosed commission only when business is completed through the platform.',
    trustActions: 'RFQs · quotes · messages',
    trustTeam: 'NXT//LINK team accounts are provided internally.',
    bothSidesTitle: 'One account, both sides',
    bothSidesText: 'Most companies end up buying and selling. The same account lets you search the marketplace, ask questions, and request quotes — and when you’re ready, you can start selling too.',
    sentTitle: 'Check your email',
    sentText: 'We sent a confirmation link to',
    sentBuyer: 'Until your email is verified, some actions stay limited.',
    confirmed: 'Already confirmed? Sign in',
    errTerms: 'Please accept the Terms of Service and Privacy Policy.',
    errCreate: 'Could not create the account. Try again.',
  },
  es: {
    docTitle: 'Crear cuenta — NXT//LINK',
    eyebrow: 'Tu espacio de compras industriales',
    detailsTitle: 'Crea tu cuenta',
    detailsSub: 'Toma cerca de un minuto. Puedes completar tu perfil después de entrar.',
    email: 'Correo de trabajo',
    password: 'Contraseña (8+ caracteres)',
    show: 'Mostrar', hide: 'Ocultar',
    agreeStart: 'Acepto los', terms: 'Términos de Servicio', and: 'y el', privacy: 'Aviso de Privacidad',
    orEmail: 'o continúa con correo',
    create: 'Crear cuenta', creating: 'Creando…',
    signInLead: '¿Ya tienes una cuenta?', signIn: 'Inicia sesión',
    trustTitle: 'Gratis para unirte y comenzar una conversación',
    trustText: 'No hay costo por hacer preguntas, pedir una cotización o proponer un piloto. NXT//LINK gana una comisión claramente informada solo cuando el negocio se completa dentro de la plataforma.',
    trustActions: 'Cotizaciones · solicitudes · mensajes',
    trustTeam: 'Las cuentas del equipo NXT//LINK se otorgan internamente.',
    bothSidesTitle: 'Una cuenta, ambos lados',
    bothSidesText: 'La mayoría de las empresas terminan comprando y vendiendo. La misma cuenta te permite buscar en el marketplace, hacer preguntas y solicitar cotizaciones — y cuando estés listo, también puedes empezar a vender.',
    sentTitle: 'Revisa tu correo',
    sentText: 'Enviamos un enlace de confirmación a',
    sentBuyer: 'Hasta que verifiques tu correo, algunas acciones permanecen limitadas.',
    confirmed: '¿Ya confirmaste? Inicia sesión',
    errTerms: 'Acepta los Términos de Servicio y el Aviso de Privacidad.',
    errCreate: 'No pudimos crear la cuenta. Intenta de nuevo.',
  },
};

export default function SignupPage() {
  const [lang, setLang] = useLang();
  const t = T[lang];
  useEffect(() => { document.title = t.docTitle; }, [t.docTitle]);
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
          role: 'client',
          vendor_type: null,
          use_case: null,
          locale: lang,
          terms_accepted: agree,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) { setErr(j.message || t.errCreate); setBusy(false); return; }
      if (j.session) {
        // Email confirmation disabled in project settings — go straight in.
        await fetch('/api/auth/me');
        window.location.href = '/buyer';
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
    <main className={`su ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="su-header">
        <Link className="su-brand" href="/" aria-label="NXT Link home"><b>NXT<i>{'//'}</i>LINK</b></Link>
        <LanguageToggle lang={lang} onChange={setLang} variant="light" />
      </header>

      <section className="su-layout">
        <div className="su-card nxm-in">
          {sent ? (
            <div className="su-sent">
              <div className="su-success"><Check aria-hidden="true" /></div>
              <h1>{t.sentTitle}</h1>
              <p className="su-sub">{t.sentText} <b>{email}</b>.</p>
              <div className="su-next">{t.sentBuyer}</div>
              <Link className="su-btn" href="/login">{t.confirmed}</Link>
            </div>
          ) : (
            <>
              <p className="su-eyebrow">{t.eyebrow}</p>
              <h1>{t.detailsTitle}</h1>
              <p className="su-sub">{t.detailsSub}</p>

              {ANY_OAUTH_ENABLED && (
                <div className="su-oauth">
                  {agreeCheckbox}
                  <GoogleAuthButton
                    lang={lang}
                    next="/buyer"
                    from="/signup"
                    lane="buyer"
                    disabled={!agree}
                    onError={setErr}
                    className="su-google"
                    bilingualErrors
                  />
                  <OAuthButton
                    provider="linkedin_oidc"
                    lang={lang}
                    next="/buyer"
                    from="/signup"
                    lane="buyer"
                    disabled={!agree}
                    onError={setErr}
                    className="su-google"
                    bilingualErrors
                  />
                  <OAuthButton
                    provider="azure"
                    lang={lang}
                    next="/buyer"
                    from="/signup"
                    lane="buyer"
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
                  <div className="su-inputicon-wrap">
                    <span className="su-fieldicon" aria-hidden="true"><Mail size={15} strokeWidth={1.75} /></span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
                  </div>
                </label>
                <label className="su-field"><span>{t.password}</span>
                  <div className="su-pwrow">
                    <span className="su-fieldicon" aria-hidden="true"><Lock size={15} strokeWidth={1.75} /></span>
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                    <button type="button" className="su-pwtoggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? t.hide : t.show}>{showPw ? t.hide : t.show}</button>
                  </div>
                </label>
                {!ANY_OAUTH_ENABLED && agreeCheckbox}
                {err && <div className="su-err" role="alert" aria-live="polite">{err}</div>}
                <button className="su-btn nxm-press" type="submit" disabled={busy}>{busy ? t.creating : t.create}</button>
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
          <div className="su-trusticon su-bothicon"><RefreshCw aria-hidden="true" /></div>
          <h2>{t.bothSidesTitle}</h2>
          <p>{t.bothSidesText}</p>
        </aside>
      </section>
    </main>
  );
}

const CSS = MOTION_CSS + `
.su{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-signup),'IBM Plex Sans',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;padding:26px 22px 48px;-webkit-font-smoothing:antialiased;}
.su *{box-sizing:border-box;}
.su h1,.su h2{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;}
.su a:focus-visible,.su button:focus-visible,.su input:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.su-header{width:min(1060px,100%);margin:0 auto 32px;display:flex;align-items:center;justify-content:space-between;}
.su-brand{color:var(--spec-ink,#141320);text-decoration:none;font-size:19px;font-weight:800;letter-spacing:-.03em;}
.su-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}

.su-layout{width:min(1060px,100%);margin:auto;display:grid;grid-template-columns:minmax(0,600px) minmax(240px,1fr);gap:26px;align-items:center;}
.su-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);box-shadow:0 24px 60px rgba(74,61,176,.1);border-radius:20px;padding:32px;}
.su-eyebrow{color:var(--spec-violet-deep,#4A3DB0);font-size:11.5px;font-weight:800;letter-spacing:var(--spec-tracking-eyebrow,.12em);text-transform:uppercase;margin:0 0 10px;}
.su-card h1{color:var(--spec-ink,#141320);font-size:clamp(24px,3.6vw,var(--spec-text-h2,30px));line-height:1.1;letter-spacing:var(--spec-tracking-heading,-.02em);margin:0;}
.su-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;line-height:1.6;margin:11px 0 22px;max-width:520px;}
.su-sub b{color:var(--spec-violet-deep,#4A3DB0);}

.su-btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;border:0;border-radius:11px;background:var(--spec-violet,#6C5CE0);color:#fff;text-decoration:none;font:700 14.5px inherit;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.su-btn:hover{background:var(--spec-violet-deep,#4A3DB0);}
.su-btn:disabled{opacity:.45;cursor:not-allowed;}
.su-signin{text-align:center;color:var(--spec-text-2nd,#615F72);font-size:13px;margin:16px 0 0;}
.su-signin a,.su-agree a{color:var(--spec-violet-deep,#4A3DB0);}

.su-card form{display:flex;flex-direction:column;gap:14px;}
.su-field span{display:block;color:var(--spec-text-2nd,#615F72);font-size:12px;font-weight:700;margin:0 0 6px;}
.su-field input{width:100%;height:44px;border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font:14px inherit;padding:0 13px;outline:none;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),box-shadow var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.su-field input:hover{border-color:#C7C2DE;}
.su-field input:focus{border-color:var(--spec-violet,#6C5CE0);background:#fff;box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.su-inputicon-wrap{position:relative;}
.su-fieldicon{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#8A87A0;display:flex;pointer-events:none;z-index:1;}
.su-inputicon-wrap input,.su-pwrow input{padding-left:38px !important;}
.su-pwrow{position:relative;}
.su-pwrow input{padding-right:66px !important;}
.su-pwtoggle{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:none;color:var(--spec-text-2nd,#615F72);font:650 12px inherit;cursor:pointer;padding:8px;}
.su-pwtoggle:hover{color:var(--spec-violet-deep,#4A3DB0);}
.su-agree{display:flex;gap:10px;align-items:flex-start;cursor:pointer;margin:2px 0 0;}
.su-agree input{width:16px;height:16px;flex:0 0 auto;margin-top:2px;accent-color:var(--spec-violet,#6C5CE0);cursor:pointer;}
.su-agree input:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.su-agree span{font-size:11.5px;line-height:1.55;color:var(--spec-text-2nd,#615F72);}
.su-oauth{margin:2px 0 4px;display:flex;flex-direction:column;gap:10px;}
.su-oauth .su-agree{margin-bottom:6px;}
.su-google{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:46px;border:1px solid var(--spec-border,#E2DFEC);border-radius:11px;background:#fff;color:var(--spec-ink,#141320);font:700 14px inherit;cursor:pointer;}
.su-google:hover{background:var(--spec-warm-white,#F8F7FB);border-color:#C7C2DE;}
.su-google:disabled{opacity:.5;cursor:not-allowed;}
.su-or{display:flex;align-items:center;gap:10px;color:#706D88;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;}
.su-or::before,.su-or::after{content:'';height:1px;flex:1;background:var(--spec-border,#E2DFEC);}
.su-err{background:#FDF2F2;border:1px solid #F3C9C9;color:#B04A4A;border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.45;}

.su-trust{background:rgba(108,92,224,.05);border:1px solid rgba(108,92,224,.15);border-radius:20px;padding:28px 24px;color:var(--spec-text-2nd,#615F72);}
.su-trusticon,.su-success{width:44px;height:44px;border-radius:14px;background:rgba(108,92,224,.14);color:var(--spec-violet-deep,#4A3DB0);display:grid;place-items:center;margin-bottom:16px;}
.su-trusticon svg,.su-success svg{width:20px;stroke-width:3;}
.su-trust h2{color:var(--spec-ink,#141320);font-size:var(--spec-text-h4,19px);line-height:1.2;letter-spacing:var(--spec-tracking-heading,-.02em);margin:0 0 12px;}
.su-trust>p{font-size:13.5px;line-height:1.7;margin:0 0 18px;}
.su-trustline{display:flex;align-items:flex-start;gap:9px;font-size:12px;line-height:1.5;margin:10px 0;}
.su-bothicon{margin-top:28px;}
.su-trustline span{width:16px;height:16px;border-radius:50%;background:#E9F7F0;color:#1F7A54;display:grid;place-items:center;flex:0 0 auto;}
.su-trustline svg{width:10px;stroke-width:3;}

.su-sent{text-align:center;padding:10px 0;}
.su-sent h1{margin:0;}
.su-sent .su-success{margin:0 auto 16px;}
.su-sent .su-sub{color:var(--spec-text-2nd,#615F72);}
.su-next{background:rgba(108,92,224,.06);border:1px solid rgba(108,92,224,.18);border-radius:13px;color:var(--spec-ink,#141320);font-size:13px;line-height:1.6;padding:14px;margin:20px 0;}
.su-sent .su-btn{margin-top:6px;}

@media(max-width:820px){
  .su{padding:20px 16px 36px;}
  .su-header{margin-bottom:22px;}
  .su-layout{grid-template-columns:1fr;}
  .su-trust{padding:20px 18px;margin-top:2px;}
  .su-trust>p{margin-bottom:12px;}
  .su-card{padding:24px 20px;border-radius:18px;}
  .su-card h1{font-size:var(--spec-text-h3,24px);}
}
@media(max-width:420px){
  .su{padding-left:10px;padding-right:10px;}
  .su-header{padding:0 4px;}
  .su-card{padding:20px 15px;}
}
`;
