'use client';

// /join/[token] — the invite landing ("quick account") page. A vendor taps
// the personal link from their invite email, sees their company pre-filled,
// and one tap emails them a magic sign-in link (no password, no forms).
// Clicking the emailed link creates the account; /auth/callback then creates
// their PRE-APPROVED vendor profile and drops them in /vendor/portal.
//
// First spec-native screen (Design System v1.0 light: warm-white bg, white
// card, violet CTA — experience-design plan §3.1). Mobile-first, EN/ES toggle
// defaulting to the invite's locale. Copy from growth-and-invites.md §3,
// pre-escrow variants only (no escrow promises, no credit mentions).

import { useCallback, useEffect, useState } from 'react';

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
      ['You pay only when a deal closes.', '5% on the first $50k, 3% above, capped at $20,000 — published, no surprises.'],
      ['Real requests, real people.', 'Every buyer request is reviewed by our team. Bilingual support.'],
    ],
    emailLabel: 'Your email (this becomes your sign-in)',
    cta: 'Create my free account',
    ctaBusy: 'Sending your link…',
    under: 'Under a minute · No credit card',
    timeline: 'Today: your account · Next: complete your profile · Then: quote your first request',
    sentTitle: 'Check your email',
    sent: (masked: string) => `We sent a secure sign-in link to ${masked}. Tap it and you’re in — no password needed. It expires in a few minutes.`,
    deadTitle: 'This invite link is no longer active',
    dead: 'It may have expired. You can still join NXT//LINK as a vendor — it’s free.',
    deadCta: 'Apply as a vendor →',
    notYou: (company: string) => `Not ${company}? Start fresh →`,
    loading: 'Loading your invite…',
    errGeneric: 'Something went wrong. Try again.',
  },
  es: {
    tagline: 'Marketplace industrial El Paso–Juárez',
    headline: (name: string, company: string) =>
      name ? `${name}, los compradores de la frontera publican lo que necesitan. ${company} puede cotizarlo — gratis.`
        : `Los compradores de la frontera publican lo que necesitan. ${company} puede cotizarlo — gratis.`,
    headlineGeneric: 'Los compradores de la frontera publican lo que necesitan. Cotícelo — gratis.',
    bullets: [
      ['Gratis · sin compromiso.', 'Sin mensualidad. Sin tarjeta. Cotizar nunca cuesta.'],
      ['Paga solo cuando un trato se cierra.', '5% sobre los primeros $50,000 USD, 3% sobre el resto, con tope de $20,000 — publicado, sin sorpresas.'],
      ['Solicitudes reales, gente real.', 'Cada solicitud de compra la revisa nuestro equipo. Soporte bilingüe.'],
    ],
    emailLabel: 'Su correo (será su inicio de sesión)',
    cta: 'Crear mi cuenta gratis',
    ctaBusy: 'Enviando su enlace…',
    under: 'Menos de un minuto · Sin tarjeta',
    timeline: 'Hoy: su cuenta · Luego: completar su perfil · Después: cotizar su primera solicitud',
    sentTitle: 'Revise su correo',
    sent: (masked: string) => `Le enviamos un enlace seguro de inicio de sesión a ${masked}. Tóquelo y ya está adentro — sin contraseña. Expira en unos minutos.`,
    deadTitle: 'Este enlace de invitación ya no está activo',
    dead: 'Puede haber expirado. Aún puede unirse a NXT//LINK como proveedor — es gratis.',
    deadCta: 'Aplicar como proveedor →',
    notYou: (company: string) => `¿No es ${company}? Empezar de cero →`,
    loading: 'Cargando su invitación…',
    errGeneric: 'Algo salió mal. Intente de nuevo.',
  },
} as const;

export default function JoinPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [invite, setInvite] = useState<InviteView | null>(null);
  const [dead, setDead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>('en');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/invites/${encodeURIComponent(token)}`);
        if (!alive) return;
        if (!r.ok) { setDead(true); setLoading(false); return; }
        const j = await r.json();
        if (j.ok && j.invite) { setInvite(j.invite); setLang(j.invite.locale === 'es' ? 'es' : 'en'); }
        else setDead(true);
      } catch { if (alive) setDead(true); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [token]);

  const t = T[lang];

  const send = useCallback(async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/invites/${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invite?.has_email ? {} : { email: email.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.ok) setSentTo(j.email_masked || invite?.email_masked || '');
      else setErr(j.message || t.errGeneric);
    } catch { setErr(t.errGeneric); }
    setBusy(false);
  }, [busy, token, invite, email, t]);

  const firstName = (invite?.contact_name || '').trim().split(/\s+/)[0] || '';
  const company = (invite?.company_name || '').trim();

  return (
    <div className="jn">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="jn-top">
        <a className="jn-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>
        <div className="jn-lang" role="group" aria-label="Language">
          <button type="button" className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          <button type="button" className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
        </div>
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
            <h1>{company ? t.headline(firstName, company) : t.headlineGeneric}</h1>

            <ul className="jn-bullets">
              {t.bullets.map(([head, rest]) => (
                <li key={head}><b>{head}</b> {rest}</li>
              ))}
            </ul>

            {!invite?.has_email && (
              <label className="jn-field">
                <span>{t.emailLabel}</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
              </label>
            )}

            {err && <div className="jn-err">{err}</div>}
            <button type="button" className="jn-cta" onClick={send} disabled={busy}>
              {busy ? t.ctaBusy : t.cta}
            </button>
            <p className="jn-under">{t.under}</p>
            <p className="jn-timeline">{t.timeline}</p>
          </>
        )}
      </div>

      {!loading && !dead && !sentTo && company && (
        <a className="jn-notyou" href="/vendor-signup">{t.notYou(company)}</a>
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
.jn-lang{display:flex;border:1px solid #E2DFEC;border-radius:10px;overflow:hidden;background:#fff;}
.jn-lang button{font-family:inherit;font-size:12.5px;font-weight:700;padding:8px 14px;border:none;background:none;color:#615F72;cursor:pointer;min-height:36px;}
.jn-lang button.on{background:#6C5CE0;color:#fff;}
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
