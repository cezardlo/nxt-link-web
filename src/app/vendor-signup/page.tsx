'use client';

// /vendor-signup — the ORGANIC quick signup (fast-signup brief §3): the same
// 60-second, phone-first screen as the invited /join lane, minus the invite.
// 3 fields — company name, work email, "what do you supply?" chips — plus
// the required click-wrap checkbox. Magic link, NO password: POST to
// /api/auth/signup (mode 'magic' — the ONE account-creation door), tap the
// emailed link, land in a live vendor dashboard. The profile is born PENDING;
// admin review still gates anything going public. This page is also where
// the conference "scan to join" QR points (?src=qr).
//
// Spec-native light screen (Design System v1.0: warm-white bg, white card,
// violet CTA) — visual twin of /join/[token]. Bilingual EN/ES via the shared
// LanguageToggle. No escrow promises, no credit copy.

import { useState } from 'react';
import LanguageToggle, { useLang } from '@/components/LanguageToggle';
import SupplyChips from '@/components/SupplyChips';
import ChatWidget from '@/components/ChatWidget';

const T = {
  en: {
    tagline: 'El Paso–Juárez industrial marketplace',
    headline: 'Borderplex buyers post what they need. Quote it — free.',
    bullets: [
      ['Free to send · no commitment.', 'No monthly fee. No credit card. Quoting never costs a thing.'],
      ['You pay only when a deal closes.', '5% on the first $50k, 3% above, capped at $20,000 — published, no surprises.'],
      ['Real requests, real people.', 'Every buyer request is reviewed by our team. Bilingual support.'],
    ],
    companyLabel: 'Company name',
    companyPh: 'e.g. Borderland Forklift Services',
    emailLabel: 'Work email (this becomes your sign-in)',
    supplyLabel: 'What do you supply?',
    supplyHint: 'Tap what fits — you can refine it later.',
    agreePre: 'I agree to the',
    agreeTos: 'Terms of Service',
    agreeAnd: 'and',
    agreePrivacy: 'Privacy Policy',
    errCompany: 'Add your company name first.',
    errEmail: 'Enter a valid work email.',
    errSupply: 'Tap at least one category — or type what you supply.',
    errAgree: 'Please accept the terms to continue.',
    errGeneric: 'Something went wrong. Try again.',
    cta: 'Create my free account',
    ctaBusy: 'Sending your link…',
    under: 'Under a minute · No password, no credit card',
    timeline: 'Today: your account & storefront draft · Next: our team reviews you · Then: you go live and quote requests',
    sentTitle: 'Check your email',
    sent: (email: string) => `We sent a secure sign-in link to ${email}. Tap it and you’re in — no password needed. It expires in a few minutes.`,
    haveAccount: 'Already have an account? Sign in →',
  },
  es: {
    tagline: 'Marketplace industrial El Paso–Juárez',
    headline: 'Los compradores de la frontera publican lo que necesitan. Cotícelo — gratis.',
    bullets: [
      ['Gratis · sin compromiso.', 'Sin mensualidad. Sin tarjeta. Cotizar nunca cuesta.'],
      ['Paga solo cuando un trato se cierra.', '5% sobre los primeros $50,000 USD, 3% sobre el resto, con tope de $20,000 — publicado, sin sorpresas.'],
      ['Solicitudes reales, gente real.', 'Cada solicitud de compra la revisa nuestro equipo. Soporte bilingüe.'],
    ],
    companyLabel: 'Nombre de la empresa',
    companyPh: 'p. ej. Montacargas de la Frontera',
    emailLabel: 'Correo de trabajo (será su inicio de sesión)',
    supplyLabel: '¿Qué ofrece?',
    supplyHint: 'Toque lo que aplique — puede afinarlo después.',
    agreePre: 'Acepto los',
    agreeTos: 'Términos de Servicio',
    agreeAnd: 'y el',
    agreePrivacy: 'Aviso de Privacidad',
    errCompany: 'Primero agregue el nombre de su empresa.',
    errEmail: 'Ingrese un correo de trabajo válido.',
    errSupply: 'Toque al menos una categoría — o escriba lo que ofrece.',
    errAgree: 'Para continuar, acepte los términos.',
    errGeneric: 'Algo salió mal. Intente de nuevo.',
    cta: 'Crear mi cuenta gratis',
    ctaBusy: 'Enviando su enlace…',
    under: 'Menos de un minuto · Sin contraseña, sin tarjeta',
    timeline: 'Hoy: su cuenta y borrador de tienda · Luego: nuestro equipo lo revisa · Después: sale en vivo y cotiza solicitudes',
    sentTitle: 'Revise su correo',
    sent: (email: string) => `Le enviamos un enlace seguro de inicio de sesión a ${email}. Tóquelo y ya está adentro — sin contraseña. Expira en unos minutos.`,
    haveAccount: '¿Ya tiene cuenta? Inicie sesión →',
  },
} as const;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function VendorQuickSignupPage() {
  const [lang, switchLang] = useLang('en');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [otherCat, setOtherCat] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [err, setErr] = useState('');
  const t = T[lang];

  const toggleCat = (v: string) =>
    setCats((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!company.trim()) { setErr(t.errCompany); return; }
    if (!EMAIL_RE.test(email.trim())) { setErr(t.errEmail); return; }
    const supply = [...cats, ...(otherCat.trim() ? [otherCat.trim()] : [])];
    if (supply.length === 0) { setErr(t.errSupply); return; }
    if (!agree) { setErr(t.errAgree); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'magic',
          role: 'vendor',
          email: email.trim(),
          company_name: company.trim(),
          supply_categories: supply,
          terms_accepted: agree,
          locale: lang,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.ok) setSentTo(email.trim());
      else setErr(j.message || t.errGeneric);
    } catch { setErr(t.errGeneric); }
    setBusy(false);
  }

  return (
    <div className="qs">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="qs-top">
        <a className="qs-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>
        <LanguageToggle lang={lang} onChange={switchLang} variant="light" />
      </div>

      <div className="qs-card">
        {sentTo ? (
          <>
            <div className="qs-sentmark" aria-hidden="true">✓</div>
            <h1>{t.sentTitle}</h1>
            <p className="qs-muted">{t.sent(sentTo)}</p>
          </>
        ) : (
          <>
            <p className="qs-tag">{t.tagline}</p>
            <h1>{t.headline}</h1>

            <ul className="qs-bullets">
              {t.bullets.map(([head, rest]) => (
                <li key={head}><b>{head}</b> {rest}</li>
              ))}
            </ul>

            <form onSubmit={submit} noValidate>
              <label className="qs-field">
                <span>{t.companyLabel}</span>
                <input
                  type="text" value={company} maxLength={120} placeholder={t.companyPh}
                  onChange={(e) => { setCompany(e.target.value); setErr(''); }}
                  autoComplete="organization" required
                />
              </label>

              <label className="qs-field">
                <span>{t.emailLabel}</span>
                <input
                  type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setErr(''); }}
                  autoComplete="email" inputMode="email" required
                />
              </label>

              <div className="qs-supply">
                <span className="qs-supplylbl" id="qs-supply-label">{t.supplyLabel}</span>
                <span className="qs-supplyhint">{t.supplyHint}</span>
                <SupplyChips
                  selected={cats} onToggle={toggleCat}
                  freeText={otherCat} onFreeText={(v) => { setOtherCat(v); setErr(''); }}
                  lang={lang}
                />
              </div>

              <label className="qs-agree">
                <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); if (e.target.checked) setErr(''); }} />
                <span>
                  {t.agreePre} <a href="/terms" target="_blank" rel="noopener">{t.agreeTos}</a> {t.agreeAnd}{' '}
                  <a href="/privacy" target="_blank" rel="noopener">{t.agreePrivacy}</a>.
                </span>
              </label>

              {err && <div className="qs-err" role="alert">{err}</div>}
              <button type="submit" className="qs-cta" disabled={busy}>
                {busy ? t.ctaBusy : t.cta}
              </button>
              <p className="qs-under">{t.under}</p>
              <p className="qs-timeline">{t.timeline}</p>
            </form>
          </>
        )}
      </div>

      {!sentTo && <a className="qs-signin" href="/login">{t.haveAccount}</a>}
      <ChatWidget mode="vendor" locale={lang} />
    </div>
  );
}

const CSS = `
.qs{min-height:100vh;background:#F8F7FB;color:#141320;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;padding:22px 16px 48px;-webkit-font-smoothing:antialiased;}
.qs *{box-sizing:border-box;}
.qs-top{width:100%;max-width:460px;display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
.qs-brand{color:#141320;text-decoration:none;}
.qs-brand b{font-size:17px;letter-spacing:1.5px;}
.qs-brand i{color:#6C5CE0;font-style:normal;}
.qs-card{width:100%;max-width:460px;background:#fff;border:1px solid #E2DFEC;border-radius:16px;padding:26px 22px;box-shadow:0 8px 30px rgba(74,61,176,.08);}
.qs-card h1{font-size:21px;font-weight:700;letter-spacing:-.01em;line-height:1.35;margin:6px 0 0;}
.qs-tag{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:#6C5CE0;margin:0;}
.qs-bullets{list-style:none;margin:18px 0 4px;padding:0;display:flex;flex-direction:column;gap:12px;}
.qs-bullets li{font-size:14px;line-height:1.55;color:#615F72;padding-left:24px;position:relative;}
.qs-bullets li::before{content:'✓';position:absolute;left:0;top:0;color:#6C5CE0;font-weight:800;}
.qs-bullets li b{color:#141320;}
.qs-field{display:block;margin:14px 0 2px;}
.qs-field span{display:block;font-size:12.5px;font-weight:600;color:#615F72;margin-bottom:6px;}
.qs-field input{width:100%;min-height:48px;font-family:inherit;font-size:15px;padding:12px 14px;border-radius:12px;border:1px solid #E2DFEC;background:#F8F7FB;color:#141320;outline:none;}
.qs-field input:focus{border-color:#6C5CE0;background:#fff;}
.qs-field input::placeholder{color:#A5A3B5;}
.qs-supply{margin:16px 0 2px;}
.qs-supplylbl{display:block;font-size:12.5px;font-weight:600;color:#615F72;}
.qs-supplyhint{display:block;font-size:12px;color:#8A87A0;margin:2px 0 8px;}
.qs-err{background:#FDF2F2;border:1px solid #F3C9C9;color:#B04A4A;font-size:13px;border-radius:10px;padding:10px 12px;margin-top:12px;}
.qs-agree{display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-top:14px;}
.qs-agree input{width:18px;height:18px;margin-top:1px;flex-shrink:0;accent-color:#6C5CE0;cursor:pointer;}
.qs-agree input:focus-visible{outline:2px solid #6C5CE0;outline-offset:2px;}
.qs-agree span{font-size:13px;color:#615F72;line-height:1.5;}
.qs-agree span a{color:#6C5CE0;}
.qs-cta{display:block;width:100%;text-align:center;font-family:inherit;font-size:15.5px;font-weight:700;padding:14px;min-height:52px;border-radius:12px;border:none;background:#6C5CE0;color:#fff;cursor:pointer;margin-top:16px;}
.qs-cta:hover{background:#4A3DB0;}
.qs-cta:focus-visible{outline:2px solid #4A3DB0;outline-offset:2px;}
.qs-cta:disabled{opacity:.65;cursor:wait;}
.qs-under{text-align:center;font-size:12.5px;color:#615F72;margin:10px 0 0;}
.qs-timeline{text-align:center;font-size:12px;color:#8A87A0;margin:6px 0 0;line-height:1.5;}
.qs-muted{font-size:14px;color:#615F72;line-height:1.6;margin:8px 0 14px;}
.qs-sentmark{width:44px;height:44px;border-radius:99px;background:#E9F7F0;color:#1E8A5E;font-size:20px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:10px;}
.qs-signin{margin-top:16px;font-size:13px;color:#615F72;text-decoration:none;}
.qs-signin:hover{color:#6C5CE0;}
`;
