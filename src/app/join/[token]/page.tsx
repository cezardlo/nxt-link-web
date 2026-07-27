'use client';

// /join/[token] — the invite landing ("quick account") page. A vendor taps
// the personal link from their invite email, sees their company pre-filled,
// and one tap emails them a magic sign-in link (no password, no forms).
// Clicking the emailed link creates the account; /auth/callback then creates
// their vendor profile — born PENDING (F1 decision, 2026-07-22: the invite
// link is the credential, not the review) — and drops them in /vendor/portal,
// which shows the existing "under review" experience until an admin approves.
//
// First spec-native screen (Design System v1.0 light: warm-white bg, white
// card, violet CTA — experience-design plan §3.1). Mobile-first, EN/ES toggle
// defaulting to the invite's locale. Copy from growth-and-invites.md §3,
// pre-escrow variants only (no escrow promises, no credit mentions).
//
// Quick-signup fields (fast-signup brief §3 — same 3 fields as the organic
// lane): company name pre-filled from the invite (editable), email (already
// known for emailed invites), and the "what do you supply?" chips. Answers
// flow into the vendor profile via the invite API — never asked twice.
//
// Continue with Google / LinkedIn / Microsoft (flags NEXT_PUBLIC_AUTH_GOOGLE,
// _LINKEDIN, _AZURE): same Fiverr pattern as /vendor-signup — buttons
// stacked + "or" divider above the form, gated behind the same click-wrap
// checkbox (moved to the top when any flag is on). Threads this invite's
// token on redirectTo so /auth/callback can match it even if the OAuth
// account's email differs from the invite's email; the callback records
// the acceptance fail-closed before approving anything, identical for every
// provider — see src/lib/auth/oauth.ts and src/app/auth/callback/route.ts.

import { useCallback, useEffect, useState } from 'react';
import LanguageToggle, { readStoredLang } from '@/components/LanguageToggle';
import SupplyChips from '@/components/SupplyChips';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import OAuthButton from '@/components/OAuthButton';
import { GOOGLE_TERMS_ERROR_MSG, ANY_OAUTH_ENABLED } from '@/lib/auth/oauth';

interface InviteView {
  contact_name: string | null;
  company_name: string | null;
  locale: 'en' | 'es';
  email_masked: string | null;
  has_email: boolean;
  status: string;
}

type Lang = 'en' | 'es';

const T = {
  en: {
    tagline: 'El Paso–Juárez industrial marketplace',
    headline: (name: string, company: string) =>
      name ? `${name}, buyers in the Borderplex post what they need. ${company} can quote it — free.`
        : `Borderplex buyers post what they need. ${company} can quote it — free.`,
    headlineGeneric: 'Borderplex buyers post what they need. Quote it — free.',
    bullets: [
      ['Free to send · no commitment.', 'No monthly fee. No credit card. Quoting never costs a thing.'],
      ['You pay only when a deal closes.', '4% on the first $50k, 2% above, capped at $20,000 — published, no surprises.'],
      ['Real requests, real people.', 'Every buyer request is reviewed by our team. Bilingual support.'],
    ],
    emailLabel: 'Your email (this becomes your sign-in)',
    companyLabel: 'Company name',
    supplyLabel: 'What do you supply?',
    supplyHint: 'Tap what fits — you can refine it later.',
    errSupply: 'Tap at least one category — or type what you supply.',
    agreePre: 'I agree to the',
    agreeTos: 'Terms of Service',
    agreeAnd: 'and',
    agreePrivacy: 'Privacy Policy',
    errAgree: 'Please accept the terms to continue.',
    cta: 'Create my free account',
    ctaBusy: 'Sending your link…',
    under: 'Under a minute · No credit card',
    timeline: 'Today: your account · Next: complete your profile · Then: quote your first request',
    sentTitle: 'Check your email',
    sent: (masked: string) => `We sent a secure sign-in link to ${masked}. Tap it and you’re in — no password needed. It expires in a few minutes.`,
    deadTitle: 'This invite link is no longer active',
    dead: 'It may have expired. You can still join NXT//LINK as a vendor — it’s free and takes under a minute.',
    deadCta: 'Join as a vendor →',
    notYou: (company: string) => `Not ${company}? Start fresh →`,
    loading: 'Loading your invite…',
    errGeneric: 'Something went wrong. Try again.',
    orEmail: 'or continue with email',
  },
  es: {
    tagline: 'Marketplace industrial El Paso–Juárez',
    headline: (name: string, company: string) =>
      name ? `${name}, los compradores de la frontera publican lo que necesitan. ${company} puede cotizarlo — gratis.`
        : `Los compradores de la frontera publican lo que necesitan. ${company} puede cotizarlo — gratis.`,
    headlineGeneric: 'Los compradores de la frontera publican lo que necesitan. Cotícelo — gratis.',
    bullets: [
      ['Gratis · sin compromiso.', 'Sin mensualidad. Sin tarjeta. Cotizar nunca cuesta.'],
      ['Paga solo cuando un trato se cierra.', '4% sobre los primeros $50,000 USD, 2% sobre el resto, con tope de $20,000 — publicado, sin sorpresas.'],
      ['Solicitudes reales, gente real.', 'Cada solicitud de compra la revisa nuestro equipo. Soporte bilingüe.'],
    ],
    emailLabel: 'Su correo (será su inicio de sesión)',
    companyLabel: 'Nombre de la empresa',
    supplyLabel: '¿Qué ofrece?',
    supplyHint: 'Toque lo que aplique — puede afinarlo después.',
    errSupply: 'Toque al menos una categoría — o escriba lo que ofrece.',
    agreePre: 'Acepto los',
    agreeTos: 'Términos de Servicio',
    agreeAnd: 'y el',
    agreePrivacy: 'Aviso de Privacidad',
    errAgree: 'Para continuar, acepte los términos.',
    cta: 'Crear mi cuenta gratis',
    ctaBusy: 'Enviando su enlace…',
    under: 'Menos de un minuto · Sin tarjeta',
    timeline: 'Hoy: su cuenta · Luego: completar su perfil · Después: cotizar su primera solicitud',
    sentTitle: 'Revise su correo',
    sent: (masked: string) => `Le enviamos un enlace seguro de inicio de sesión a ${masked}. Tóquelo y ya está adentro — sin contraseña. Expira en unos minutos.`,
    deadTitle: 'Este enlace de invitación ya no está activo',
    dead: 'Puede haber expirado. Aún puede unirse a NXT//LINK como proveedor — es gratis y toma menos de un minuto.',
    deadCta: 'Únase como proveedor →',
    notYou: (company: string) => `¿No es ${company}? Empezar de cero →`,
    loading: 'Cargando su invitación…',
    errGeneric: 'Algo salió mal. Intente de nuevo.',
    orEmail: 'o continuar con correo',
  },
} as const;

export default function JoinPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [invite, setInvite] = useState<InviteView | null>(null);
  const [dead, setDead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>('en');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [otherCat, setOtherCat] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [err, setErr] = useState('');

  const switchLang = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem('nxt_lang', l); } catch { /* private mode */ }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/invites/${encodeURIComponent(token)}`);
        if (!alive) return;
        if (!r.ok) { setDead(true); setLoading(false); return; }
        const j = await r.json();
        if (j.ok && j.invite) {
          setInvite(j.invite);
          setCompany((j.invite.company_name || '').trim());
          // The vendor's own saved language wins; the invite's locale is the default.
          setLang(readStoredLang() || (j.invite.locale === 'es' ? 'es' : 'en'));
        } else setDead(true);
      } catch { if (alive) setDead(true); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [token]);

  // /auth/callback bounces back here with ?err=google_terms when the
  // fail-closed terms recording on the Google path couldn't be written —
  // surface the same bilingual error the email path shows on that failure.
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('err') === 'google_terms') {
        setErr(lang === 'es' ? GOOGLE_TERMS_ERROR_MSG.es : GOOGLE_TERMS_ERROR_MSG.en);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = T[lang];

  const send = useCallback(async () => {
    if (busy) return;
    const supply = [...cats, ...(otherCat.trim() ? [otherCat.trim()] : [])];
    if (supply.length === 0) { setErr(t.errSupply); return; }
    if (!agree) { setErr(t.errAgree); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/invites/${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terms_accepted: agree,
          terms_language: lang,
          company_name: company.trim(),
          supply_categories: supply,
          ...(invite?.has_email ? {} : { email: email.trim() }),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.ok) setSentTo(j.email_masked || invite?.email_masked || '');
      else setErr(j.message || t.errGeneric);
    } catch { setErr(t.errGeneric); }
    setBusy(false);
  }, [busy, agree, token, invite, email, lang, t, company, cats, otherCat]);

  const firstName = (invite?.contact_name || '').trim().split(/\s+/)[0] || '';
  // Headline personalization follows the invite's original company name;
  // the editable `company` state is what gets submitted.
  const inviteCompany = (invite?.company_name || '').trim();

  // Shared click-wrap checkbox — rendered ABOVE the Google button when the
  // flag is on (must be ticked before the button is enabled), or in its
  // original spot inside the form when the flag is off (unchanged today).
  const agreeCheckbox = (
    <label className="jn-agree">
      <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); if (e.target.checked) setErr(''); }} />
      <span>
        {t.agreePre} <a href="/terms" target="_blank" rel="noopener noreferrer">{t.agreeTos}</a> {t.agreeAnd}{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer">{t.agreePrivacy}</a>.
      </span>
    </label>
  );
  const supplyValues = [...cats, ...(otherCat.trim() ? [otherCat.trim()] : [])];

  return (
    <div className="jn">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="jn-top">
        <a className="jn-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>
        <LanguageToggle lang={lang} onChange={switchLang} variant="light" />
      </div>

      <div className="jn-card">
        {loading ? (
          <p className="jn-muted">{t.loading}</p>
        ) : dead ? (
          <>
            <h1>{t.deadTitle}</h1>
            <p className="jn-muted">{t.dead}</p>
            <a className="jn-cta" href="/vendor-signup">{t.deadCta}</a>
          </>
        ) : sentTo ? (
          <>
            <div className="jn-sentmark" aria-hidden="true">✓</div>
            <h1>{t.sentTitle}</h1>
            <p className="jn-muted">{t.sent(sentTo)}</p>
          </>
        ) : (
          <>
            <p className="jn-tag">{t.tagline}</p>
            <h1>{inviteCompany ? t.headline(firstName, inviteCompany) : t.headlineGeneric}</h1>

            <ul className="jn-bullets">
              {t.bullets.map(([head, rest]) => (
                <li key={head}><b>{head}</b> {rest}</li>
              ))}
            </ul>

            {ANY_OAUTH_ENABLED && (
              <div className="jn-oauth">
                {agreeCheckbox}
                <GoogleAuthButton
                  lang={lang}
                  next="/vendor/portal?welcome=1"
                  from={`/join/${token}`}
                  lane="invite"
                  inviteToken={token}
                  disabled={!agree}
                  companyName={company}
                  categories={supplyValues}
                  onError={setErr}
                  className="jn-google"
                />
                <OAuthButton
                  provider="linkedin_oidc"
                  lang={lang}
                  next="/vendor/portal?welcome=1"
                  from={`/join/${token}`}
                  lane="invite"
                  inviteToken={token}
                  disabled={!agree}
                  companyName={company}
                  categories={supplyValues}
                  onError={setErr}
                  className="jn-google"
                />
                <OAuthButton
                  provider="azure"
                  lang={lang}
                  next="/vendor/portal?welcome=1"
                  from={`/join/${token}`}
                  lane="invite"
                  inviteToken={token}
                  disabled={!agree}
                  companyName={company}
                  categories={supplyValues}
                  onError={setErr}
                  className="jn-google"
                />
                <div className="jn-or"><span>{t.orEmail}</span></div>
              </div>
            )}

            <label className="jn-field">
              <span>{t.companyLabel}</span>
              <input type="text" value={company} maxLength={120} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
            </label>

            {!invite?.has_email && (
              <label className="jn-field">
                <span>{t.emailLabel}</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
              </label>
            )}

            <div className="jn-supply">
              <span className="jn-supplylbl">{t.supplyLabel}</span>
              <span className="jn-supplyhint">{t.supplyHint}</span>
              <SupplyChips
                selected={cats}
                onToggle={(v) => { setCats((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])); setErr(''); }}
                freeText={otherCat}
                onFreeText={(v) => { setOtherCat(v); setErr(''); }}
                lang={lang}
              />
            </div>

            {!ANY_OAUTH_ENABLED && agreeCheckbox}

            {err && <div className="jn-err">{err}</div>}
            <button type="button" className="jn-cta" onClick={send} disabled={busy}>
              {busy ? t.ctaBusy : t.cta}
            </button>
            <p className="jn-under">{t.under}</p>
            <p className="jn-timeline">{t.timeline}</p>
          </>
        )}
      </div>

      {!loading && !dead && !sentTo && inviteCompany && (
        <a className="jn-notyou" href="/vendor-signup">{t.notYou(inviteCompany)}</a>
      )}
    </div>
  );
}

const CSS = `
.jn{min-height:100vh;background:#F8F7FB;color:#141320;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;padding:22px 16px 48px;-webkit-font-smoothing:antialiased;}
.jn *{box-sizing:border-box;}
.jn-top{width:100%;max-width:460px;display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
.jn-brand{color:#141320;text-decoration:none;}
.jn-brand b{font-size:17px;letter-spacing:1.5px;}
.jn-brand i{color:#6C5CE0;font-style:normal;}
.jn-supply{display:block;margin:16px 0 2px;}
.jn-supplylbl{display:block;font-size:12.5px;font-weight:600;color:#615F72;}
.jn-supplyhint{display:block;font-size:12px;color:#8A87A0;margin:2px 0 8px;}
.jn-card{width:100%;max-width:460px;background:#fff;border:1px solid #E2DFEC;border-radius:16px;padding:26px 22px;box-shadow:0 8px 30px rgba(74,61,176,.08);}
.jn-card h1{font-size:21px;font-weight:700;letter-spacing:-.01em;line-height:1.35;margin:6px 0 0;}
.jn-tag{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:#6C5CE0;margin:0;}
.jn-bullets{list-style:none;margin:18px 0 4px;padding:0;display:flex;flex-direction:column;gap:12px;}
.jn-bullets li{font-size:14px;line-height:1.55;color:#615F72;padding-left:24px;position:relative;}
.jn-bullets li::before{content:'✓';position:absolute;left:0;top:0;color:#6C5CE0;font-weight:800;}
.jn-bullets li b{color:#141320;}
.jn-field{display:block;margin:14px 0 2px;}
.jn-field span{display:block;font-size:12.5px;font-weight:600;color:#615F72;margin-bottom:6px;}
.jn-field input{width:100%;min-height:48px;font-family:inherit;font-size:15px;padding:12px 14px;border-radius:12px;border:1px solid #E2DFEC;background:#F8F7FB;color:#141320;outline:none;}
.jn-field input:focus{border-color:#6C5CE0;background:#fff;}
.jn-err{background:#FDF2F2;border:1px solid #F3C9C9;color:#B04A4A;font-size:13px;border-radius:10px;padding:10px 12px;margin-top:12px;}
.jn-agree{display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-top:14px;}
.jn-agree input{width:18px;height:18px;margin-top:1px;flex-shrink:0;accent-color:#6C5CE0;cursor:pointer;}
.jn-agree input:focus-visible{outline:2px solid #6C5CE0;outline-offset:2px;}
.jn-agree span{font-size:13px;color:#615F72;line-height:1.5;}
.jn-agree span a{color:#6C5CE0;}
.jn-oauth{margin-top:18px;}
.jn-oauth .jn-agree{margin-top:0;margin-bottom:14px;}
.jn-google{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;font-family:inherit;font-size:15px;font-weight:600;padding:13px;min-height:50px;border-radius:12px;border:1px solid #E2DFEC;background:#fff;color:#141320;cursor:pointer;}
.jn-google:hover{background:#F8F7FB;border-color:#C7C2DE;}
.jn-google:disabled{opacity:.5;cursor:not-allowed;}
.jn-google + .jn-google{margin-top:10px;}
.jn-or{display:flex;align-items:center;gap:10px;margin:18px 0 4px;color:#8A87A0;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;}
.jn-or::before,.jn-or::after{content:'';flex:1;height:1px;background:#E2DFEC;}
.jn-cta{display:block;width:100%;text-align:center;font-family:inherit;font-size:15.5px;font-weight:700;padding:14px;min-height:52px;border-radius:12px;border:none;background:#6C5CE0;color:#fff;cursor:pointer;margin-top:16px;text-decoration:none;}
.jn-cta:hover{background:#4A3DB0;}
.jn-cta:disabled{opacity:.65;cursor:wait;}
.jn-under{text-align:center;font-size:12.5px;color:#615F72;margin:10px 0 0;}
.jn-timeline{text-align:center;font-size:12px;color:#8A87A0;margin:6px 0 0;line-height:1.5;}
.jn-muted{font-size:14px;color:#615F72;line-height:1.6;margin:8px 0 14px;}
.jn-sentmark{width:44px;height:44px;border-radius:99px;background:#E9F7F0;color:#1E8A5E;font-size:20px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:10px;}
.jn-notyou{margin-top:16px;font-size:13px;color:#615F72;text-decoration:none;}
.jn-notyou:hover{color:#6C5CE0;}
`;
