'use client';

// Buyer profile — customers introduce themselves: company logo, company name,
// their own name, position, industry, city, phone. Used to prefill requests
// and give vendors context once a deal is accepted.

import { useEffect, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): visual/CSS
// only — every handler and state above is unchanged.
// EN/ES (2026-07-23): this page was 100% hardcoded English while every other
// buyer page is bilingual — added the shared LanguageToggle/useLang pattern
// (see /buyer, /cart) with a page-local T dictionary. Copy/labels only, no
// handler or state changes.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-bprofile',
  display: 'swap',
});

const INDUSTRIES: Array<{ en: string; es: string }> = [
  { en: 'Warehousing & 3PL', es: 'Almacenaje y 3PL' },
  { en: 'Manufacturing', es: 'Manufactura' },
  { en: 'Retail & E-commerce', es: 'Retail y comercio electrónico' },
  { en: 'Food & Beverage', es: 'Alimentos y bebidas' },
  { en: 'Automotive', es: 'Automotriz' },
  { en: 'Cold Chain', es: 'Cadena de frío' },
  { en: 'Import / Export & Customs', es: 'Importación / exportación y aduanas' },
  { en: 'Construction', es: 'Construcción' },
  { en: 'Distribution Centers', es: 'Centros de distribución' },
  { en: 'Pharma & Healthcare', es: 'Farmacéutica y salud' },
  { en: 'Aerospace & Defense', es: 'Aeroespacial y defensa' },
  { en: 'General Industrial', es: 'Industrial general' },
];
const COUNTRY_CODES = [
  { c: '+1', n: 'US / Canada (+1)' }, { c: '+52', n: 'Mexico (+52)' }, { c: '+44', n: 'UK (+44)' },
  { c: '+34', n: 'Spain (+34)' }, { c: '+49', n: 'Germany (+49)' }, { c: '+86', n: 'China (+86)' },
  { c: '+91', n: 'India (+91)' }, { c: '+81', n: 'Japan (+81)' },
];

const T: Record<Lang, Record<string, string>> = {
  en: {
    myProfile: 'My profile', myDashboard: 'My dashboard',
    loading: 'Loading…',
    signInFirst: 'Sign in to set up your profile —', goToSignIn: 'go to sign in',
    verifyFirst: 'Verify your email first — check your inbox for the confirmation link.',
    title: 'Your profile',
    sub: "Tell vendors who they're dealing with. This prefills your requests and is shared with a vendor only after you accept their quote.",
    saved: 'Saved.',
    logoLabel: 'Company logo / photo',
    uploading: 'Uploading…', replace: 'Replace', upload: 'Upload', remove: 'Remove',
    companyName: 'Company name', companyNamePh: 'e.g. Borderplex Logistics LLC',
    yourName: 'Your name', yourNamePh: 'e.g. Cesar de la O',
    yourPosition: 'Your position', yourPositionPh: 'e.g. Operations Manager',
    city: 'City', cityPh: 'e.g. El Paso, TX',
    industryLabel: "Industry you're in",
    customIndustryPh: 'Or type your own industry…', set: 'Set',
    phone: 'Phone', phoneNumberPh: 'Phone number',
    saving: 'Saving…', saveProfile: 'Save profile',
    uploadFailed: 'Upload failed', couldNotSave: 'Could not save',
    docTitle: 'My profile — NXT//LINK',
  },
  es: {
    myProfile: 'Mi perfil', myDashboard: 'Mi panel',
    loading: 'Cargando…',
    signInFirst: 'Inicia sesión para configurar tu perfil —', goToSignIn: 'ir a iniciar sesión',
    verifyFirst: 'Verifica tu correo primero — revisa tu bandeja de entrada por el enlace de confirmación.',
    title: 'Tu perfil',
    sub: 'Dile a los proveedores con quién están tratando. Esto prellena tus solicitudes y se comparte con un proveedor solo después de que aceptes su cotización.',
    saved: 'Guardado.',
    logoLabel: 'Logo / foto de la empresa',
    uploading: 'Subiendo…', replace: 'Reemplazar', upload: 'Subir', remove: 'Eliminar',
    companyName: 'Nombre de la empresa', companyNamePh: 'ej. Borderplex Logistics LLC',
    yourName: 'Tu nombre', yourNamePh: 'ej. Cesar de la O',
    yourPosition: 'Tu puesto', yourPositionPh: 'ej. Gerente de Operaciones',
    city: 'Ciudad', cityPh: 'ej. El Paso, TX',
    industryLabel: 'Industria en la que trabajas',
    customIndustryPh: 'O escribe tu propia industria…', set: 'Guardar',
    phone: 'Teléfono', phoneNumberPh: 'Número de teléfono',
    saving: 'Guardando…', saveProfile: 'Guardar perfil',
    uploadFailed: 'Falló la subida', couldNotSave: 'No se pudo guardar',
    docTitle: 'Mi perfil — NXT//LINK',
  },
};
function parsePhone(raw: string): { code: string; number: string } {
  const v = (raw || '').trim();
  const m = v.match(/^(\+\d{1,3})\s*(.*)$/);
  return m ? { code: m[1], number: m[2].trim() } : { code: '+1', number: v };
}

interface Profile {
  company_name: string | null; contact_name: string | null; position: string | null;
  industry: string | null; city: string | null; phone: string | null;
}

export default function BuyerProfilePage() {
  const [lang, setLang] = useLang();
  const t = T[lang];
  const [checking, setChecking] = useState(true);
  const [state, setState] = useState<'signed-out' | 'unverified' | 'ok'>('signed-out');
  const [p, setP] = useState<Profile>({ company_name: '', contact_name: '', position: '', industry: '', city: '', phone: '' });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [customInd, setCustomInd] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { document.title = t.docTitle; }, [t.docTitle]);

  useEffect(() => {
    fetch('/api/buyer/profile').then((r) => (r.status === 401 ? null : r.json())).then((d) => {
      if (!d) { setState('signed-out'); setChecking(false); return; }
      if (!d.verified) { setState('unverified'); setChecking(false); return; }
      setState('ok');
      if (d.profile) setP({
        company_name: d.profile.company_name || '', contact_name: d.profile.contact_name || '',
        position: d.profile.position || '', industry: d.profile.industry || '',
        city: d.profile.city || '', phone: d.profile.phone || '',
      });
      setLogoUrl(d.logo_url || null);
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  function set<K extends keyof Profile>(k: K, v: string) { setP((prev) => ({ ...prev, [k]: v })); }

  async function save() {
    setSaving(true); setMsg('');
    const res = await fetch('/api/buyer/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    const data = await res.json();
    setMsg(data.ok ? t.saved : (data.message || t.couldNotSave));
    setSaving(false);
  }
  async function uploadLogo(file: File) {
    setLogoBusy(true); setMsg('');
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/buyer/profile/logo', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.ok) setLogoUrl(data.logo_url || null); else setMsg(data.message || t.uploadFailed);
    setLogoBusy(false);
  }
  async function removeLogo() {
    setLogoUrl(null);
    await fetch('/api/buyer/profile/logo', { method: 'DELETE' });
  }

  const phone = parsePhone(p.phone || '');
  const emitPhone = (code: string, num: string) => set('phone', num.trim() ? `${code} ${num.trim()}` : '');

  return (
    <div className={`bp ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="bp-nav">
        <a className="bp-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>{t.myProfile}</span></a>
        <div className="bp-navr">
          <a className="bp-link" href="/buyer">{t.myDashboard}</a>
          <LanguageToggle lang={lang} onChange={setLang} variant="light" />
        </div>
      </nav>
      <main className="bp-wrap">
        {checking ? <div className="bp-empty">{t.loading}</div>
          : state === 'signed-out' ? <div className="bp-empty">{t.signInFirst} <a href="/login">{t.goToSignIn}</a></div>
          : state === 'unverified' ? <div className="bp-empty">{t.verifyFirst}</div>
          : (
            <>
              <h1>{t.title}</h1>
              <p className="bp-sub">{t.sub}</p>
              {msg && <div className={msg === t.saved ? 'bp-ok' : 'bp-err'}>{msg}</div>}

              <section className="bp-card">
                <div className="bp-lbl">{t.logoLabel}</div>
                <div className="bp-logo">
                  <div className="bp-logobox">{logoUrl ? <img src={logoUrl} alt={t.companyName} /> : <span>Logo</span>}</div>
                  <div className="bp-logoactions">
                    <label className="bp-btn sm bp-logobtn">
                      {logoBusy ? t.uploading : logoUrl ? t.replace : t.upload}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={logoBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ''; }} />
                    </label>
                    {logoUrl && <button className="bp-ghost" type="button" onClick={removeLogo}>{t.remove}</button>}
                  </div>
                </div>

                <div className="bp-grid">
                  <label>{t.companyName}<input value={p.company_name || ''} onChange={(e) => set('company_name', e.target.value)} placeholder={t.companyNamePh} /></label>
                  <label>{t.yourName}<input value={p.contact_name || ''} onChange={(e) => set('contact_name', e.target.value)} placeholder={t.yourNamePh} /></label>
                  <label>{t.yourPosition}<input value={p.position || ''} onChange={(e) => set('position', e.target.value)} placeholder={t.yourPositionPh} /></label>
                  <label>{t.city}<input value={p.city || ''} onChange={(e) => set('city', e.target.value)} placeholder={t.cityPh} /></label>
                </div>

                <div className="bp-lbl" style={{ marginTop: 20 }}>{t.industryLabel}</div>
                <div className="bp-chips">
                  {Array.from(
                    new Map([
                      ...INDUSTRIES.map((i) => [i.en, i] as const),
                      ...(p.industry && !INDUSTRIES.some((i) => i.en === p.industry) ? [[p.industry, { en: p.industry, es: p.industry }] as const] : []),
                    ]).values()
                  ).map((i) => (
                    <button key={i.en} type="button" className={'bp-chip' + (p.industry === i.en ? ' on' : '')} onClick={() => set('industry', p.industry === i.en ? '' : i.en)}>{lang === 'es' ? i.es : i.en}</button>
                  ))}
                </div>
                <div className="bp-addown">
                  <input value={customInd} placeholder={t.customIndustryPh} onChange={(e) => setCustomInd(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && customInd.trim()) { set('industry', customInd.trim()); setCustomInd(''); } }} />
                  <button className="bp-btn sm" type="button" onClick={() => { if (customInd.trim()) { set('industry', customInd.trim()); setCustomInd(''); } }}>{t.set}</button>
                </div>

                <div className="bp-lbl" style={{ marginTop: 20 }}>{t.phone}</div>
                <div className="bp-phone">
                  <select value={phone.code} onChange={(e) => emitPhone(e.target.value, phone.number)}>
                    {COUNTRY_CODES.some((o) => o.c === phone.code) ? null : <option value={phone.code}>{phone.code}</option>}
                    {COUNTRY_CODES.map((o) => <option key={o.n} value={o.c}>{o.n}</option>)}
                  </select>
                  <input inputMode="tel" placeholder={t.phoneNumberPh} value={phone.number} onChange={(e) => emitPhone(phone.code, e.target.value)} />
                </div>

                <button className="bp-btn" style={{ marginTop: 22 }} disabled={saving} onClick={save}>{saving ? t.saving : t.saveProfile}</button>
              </section>
            </>
          )}
      </main>
    </div>
  );
}

const CSS = `
.bp{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-bprofile),'IBM Plex Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.bp *{box-sizing:border-box;}
.bp a:focus-visible,.bp button:focus-visible,.bp input:focus-visible,.bp select:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.bp-nav{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;row-gap:8px;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:20;}
.bp-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.bp-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;letter-spacing:-.01em;}.bp-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.bp-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.bp-navr{display:flex;align-items:center;gap:14px;}
.bp-link{color:var(--spec-violet-deep,#4A3DB0);font-size:13.5px;font-weight:600;text-decoration:none;}
.bp-link:hover{color:var(--spec-violet,#6C5CE0);}
.bp-wrap{max-width:640px;margin:0 auto;padding:36px 20px 100px;}
.bp-wrap h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:26px;font-weight:700;letter-spacing:-.01em;}
.bp-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;margin:6px 0 18px;line-height:1.6;}
.bp-empty{text-align:center;color:var(--spec-text-2nd,#615F72);padding:70px 0;}
.bp-empty a{color:var(--spec-violet-deep,#4A3DB0);}
.bp-ok{background:#E9F7F0;border:1px solid rgba(47,158,106,.3);color:#1F7A54;border-radius:10px;padding:10px 14px;font-size:13.5px;margin-bottom:14px;}
.bp-err{background:#FBECEA;border:1px solid rgba(206,75,67,.3);color:var(--spec-error,#CE4B43);border-radius:10px;padding:10px 14px;font-size:13.5px;margin-bottom:14px;}
.bp-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:18px;padding:24px;}
.bp-lbl{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--spec-violet-deep,#4A3DB0);margin-bottom:12px;}
.bp-logo{display:flex;align-items:center;gap:16px;margin-bottom:20px;}
.bp-logobox{width:76px;height:76px;flex-shrink:0;border-radius:14px;border:1px solid var(--spec-border,#E2DFEC);background:var(--spec-surface,#EFEDF5);display:grid;place-items:center;overflow:hidden;color:#8A87A0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;}
.bp-logobox img{width:100%;height:100%;object-fit:contain;}
.bp-logoactions{display:flex;gap:10px;align-items:center;}
.bp-logobtn{position:relative;overflow:hidden;}
.bp-logobtn input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0;}
.bp-ghost{font-family:inherit;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);font-size:13px;border-radius:9px;padding:9px 14px;cursor:pointer;}
.bp-ghost:hover{border-color:#C7C2DE;}
.bp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:520px){.bp-grid{grid-template-columns:1fr;}}
.bp-grid label,.bp-phone{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:500;color:var(--spec-ink,#141320);}
.bp-grid input,.bp-addown input,.bp-phone input,.bp-phone select{font-family:inherit;font-size:14.5px;padding:11px 13px;border-radius:11px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;width:100%;}
.bp-grid input:focus,.bp-addown input:focus,.bp-phone input:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.bp-chips{display:flex;flex-wrap:wrap;gap:8px;}
.bp-chip{font-family:inherit;font-size:12.5px;font-weight:500;padding:8px 13px;border-radius:99px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;}
.bp-chip:hover{border-color:var(--spec-violet,#6C5CE0);}
.bp-chip.on{background:rgba(108,92,224,.1);border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.bp-addown{display:flex;gap:9px;margin-top:11px;}
.bp-phone{flex-direction:row;gap:9px;}
.bp-phone select{max-width:170px;}
.bp-btn{font-family:inherit;font-size:14.5px;font-weight:700;padding:12px 20px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;}
.bp-btn:hover{background:var(--spec-violet-deep,#4A3DB0);}.bp-btn:disabled{opacity:.6;}
.bp-btn.sm{padding:10px 16px;font-size:13.5px;}
`;
