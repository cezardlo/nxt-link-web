'use client';

import { useState } from 'react';
import ChatWidget from '@/components/ChatWidget';

// 16 warehouse categories — aligned with the client intake flow.
const CATEGORIES: { id: string; en: string; es: string }[] = [
  { id: 'forklift', en: 'Forklift maintenance', es: 'Mantenimiento de montacargas' },
  { id: 'copier', en: 'Copy machine service', es: 'Servicio de copiadoras' },
  { id: 'waste', en: 'Waste collection', es: 'Recolección de basura' },
  { id: 'transport', en: 'Transportation / FTL / LTL', es: 'Transporte / FTL / LTL' },
  { id: 'labels', en: 'Labels / Zebra', es: 'Etiquetas / Zebra' },
  { id: 'extinguisher', en: 'Fire extinguisher inspection', es: 'Inspección de extintores' },
  { id: 'electrical', en: 'Electrical service', es: 'Servicio eléctrico' },
  { id: 'pallets', en: 'Wooden pallets', es: 'Tarimas de madera' },
  { id: 'firedoor', en: 'Fire door maintenance', es: 'Puertas contra incendio' },
  { id: 'it', en: 'IT support', es: 'Soporte IT' },
  { id: 'maintenance', en: 'General maintenance', es: 'Mantenimiento general' },
  { id: 'propane', en: 'Propane gas', es: 'Gas propano' },
  { id: 'pest', en: 'Pest control', es: 'Control de plagas' },
  { id: 'staffing', en: 'Staffing agency', es: 'Agencia de personal' },
  { id: 'whtech', en: 'Warehouse technology', es: 'Tecnología para almacén' },
  { id: 'whparts', en: 'Warehouse products / parts', es: 'Productos / partes' },
];
const AREAS = ['El Paso', 'Juárez', 'New Mexico', 'West Texas', 'Cross-border', 'National'];

const T = {
  en: {
    eyebrow: 'For vendors · partners',
    titleA: 'List what you solve.', titleB: 'Receive quote-ready work.',
    sub: 'Register your company once. NXT//LINK sends you protected, pre-qualified opportunities that match exactly what you provide — and a human follows up.',
    company: 'Company name', contact: 'Contact name', email: 'Email', phone: 'Phone',
    website: 'Website', city: 'City', cats: 'What do you provide?', areas: 'Service areas',
    desc: 'Tell us about your company', descPh: 'Capabilities, certifications, response time, what makes you a strong fit…',
    broch: 'Brochures & documents', brochSub: 'Upload a capabilities deck, line card, or brochure (PDF, images, slides — up to 15 MB each).',
    add: 'Choose files', submit: 'Register company', submitting: 'Registering…',
    req: 'Please add a company name and a valid email.',
    doneT: "You're registered", doneS: 'Your company profile is under review. A member of the NXT//LINK team will follow up shortly.',
    ref: 'Reference', another: 'Register another', next: 'Continue', back: 'Back',
    step: ['Company', 'What you do', 'Brochures'],
    perks: ['Protected, pre-qualified opportunities', 'Only work that matches what you do', 'Your identity stays private until selected'],
  },
  es: {
    eyebrow: 'Para proveedores · socios',
    titleA: 'Publica lo que resuelves.', titleB: 'Recibe trabajo listo para cotizar.',
    sub: 'Registra tu empresa una vez. NXT//LINK te envía oportunidades protegidas y precalificadas que coinciden con lo que ofreces — y un humano da seguimiento.',
    company: 'Nombre de la empresa', contact: 'Nombre de contacto', email: 'Correo', phone: 'Teléfono',
    website: 'Sitio web', city: 'Ciudad', cats: '¿Qué ofreces?', areas: 'Zonas de servicio',
    desc: 'Cuéntanos sobre tu empresa', descPh: 'Capacidades, certificaciones, tiempo de respuesta, por qué encajan bien…',
    broch: 'Folletos y documentos', brochSub: 'Sube tu presentación, line card o folleto (PDF, imágenes, slides — hasta 15 MB c/u).',
    add: 'Elegir archivos', submit: 'Registrar empresa', submitting: 'Registrando…',
    req: 'Agrega el nombre de la empresa y un correo válido.',
    doneT: 'Empresa registrada', doneS: 'Tu perfil está en revisión. Un miembro del equipo de NXT//LINK te dará seguimiento pronto.',
    ref: 'Referencia', another: 'Registrar otra', next: 'Continuar', back: 'Atrás',
    step: ['Empresa', 'Qué ofreces', 'Folletos'],
    perks: ['Oportunidades protegidas y precalificadas', 'Solo trabajo que coincide con lo que haces', 'Tu identidad permanece privada hasta ser elegido'],
  },
};

export default function VendorSignupPage() {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', website: '', city: '', description: '' });
  const [cats, setCats] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ ref: string } | null>(null);
  const [error, setError] = useState('');
  const t = T[lang];

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (arr: string[], v: string, setter: (x: string[]) => void) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function submit() {
    if (!form.company_name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) { setError(t.req); setStep(0); return; }
    setError(''); setSubmitting(true);
    try {
      const res = await fetch('/api/vendors/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, categories: cats.map((id) => CATEGORIES.find((c) => c.id === id)?.en || id), service_areas: areas, locale: lang }),
      });
      const data = await res.json();
      const vendorId = data.id as string | undefined;
      if (vendorId && files.length) {
        for (const file of files) { const fd = new FormData(); fd.append('vendor_id', vendorId); fd.append('file', file); await fetch('/api/vendors/brochures', { method: 'POST', body: fd }).catch(() => {}); }
      }
      setDone({ ref: data.public_ref || '—' });
    } catch { setError('Something went wrong. Please try again.'); } finally { setSubmitting(false); }
  }

  return (
    <div className="vs">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="vs-mesh"><span className="o1" /><span className="o2" /></div>

      <nav className="vs-nav">
        <a className="vs-brand" href="/"><span className="vs-mk">N</span><b>NXT<i>//</i>LINK</b></a>
        <div className="vs-seg">
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
        </div>
      </nav>

      <main className="vs-wrap">
        {done ? (
          <div className="vs-card vs-done">
            <div className="vs-check"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
            <h1>{t.doneT}</h1>
            <p>{t.doneS}</p>
            <div className="vs-ref">{t.ref}: <b>{done.ref}</b></div>
            <button className="vs-btn" onClick={() => { setDone(null); setStep(0); setForm({ company_name: '', contact_name: '', email: '', phone: '', website: '', city: '', description: '' }); setCats([]); setAreas([]); setFiles([]); }}>{t.another}</button>
          </div>
        ) : (
          <div className="vs-grid2">
            <aside className="vs-intro">
              <span className="vs-eyebrow">{t.eyebrow}</span>
              <h1>{t.titleA}<br /><em>{t.titleB}</em></h1>
              <p className="vs-lead">{t.sub}</p>
              <ul className="vs-perks">
                {t.perks.map((p) => (
                  <li key={p}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>{p}</li>
                ))}
              </ul>
            </aside>

            <div id="vendor-signup" className="vs-card">
              <div className="vs-steps">
                {t.step.map((s, i) => (<div key={i} className={'vs-pstep' + (i <= step ? ' on' : '')}><span>{i + 1}</span>{s}</div>))}
              </div>
              {error && <div className="vs-err">{error}</div>}

              {step === 0 && (
                <div className="vs-fgrid">
                  <Field label={t.company} req value={form.company_name} onChange={(v) => set('company_name', v)} />
                  <Field label={t.contact} value={form.contact_name} onChange={(v) => set('contact_name', v)} />
                  <Field label={t.email} req type="email" value={form.email} onChange={(v) => set('email', v)} />
                  <Field label={t.phone} value={form.phone} onChange={(v) => set('phone', v)} />
                  <Field label={t.website} value={form.website} onChange={(v) => set('website', v)} />
                  <Field label={t.city} value={form.city} onChange={(v) => set('city', v)} />
                </div>
              )}

              {step === 1 && (
                <>
                  <div className="vs-lbl">{t.cats}</div>
                  <div className="vs-chips">{CATEGORIES.map((c) => (<button key={c.id} type="button" className={'vs-chip' + (cats.includes(c.id) ? ' on' : '')} onClick={() => toggle(cats, c.id, setCats)}>{c[lang]}</button>))}</div>
                  <div className="vs-lbl" style={{ marginTop: 22 }}>{t.areas}</div>
                  <div className="vs-chips">{AREAS.map((a) => (<button key={a} type="button" className={'vs-chip' + (areas.includes(a) ? ' on' : '')} onClick={() => toggle(areas, a, setAreas)}>{a}</button>))}</div>
                  <label className="vs-field" style={{ marginTop: 22 }}><span>{t.desc}</span><textarea rows={4} placeholder={t.descPh} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="vs-lbl">{t.broch}</div>
                  <p className="vs-hint">{t.brochSub}</p>
                  <label className="vs-drop">
                    <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.ppt,.pptx,.doc,.docx" onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])} />
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></svg>
                    <span>{t.add}</span>
                  </label>
                  {files.length > 0 && (
                    <ul className="vs-files">{files.map((f, i) => (<li key={i}><span>{f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button></li>))}</ul>
                  )}
                </>
              )}

              <div className="vs-actions">
                {step > 0 && <button className="vs-btn ghost" onClick={() => setStep(step - 1)}>{t.back}</button>}
                {step < 2 && <button className="vs-btn" onClick={() => setStep(step + 1)}>{t.next}</button>}
                {step === 2 && <button className="vs-btn" disabled={submitting} onClick={submit}>{submitting ? t.submitting : t.submit}</button>}
              </div>
            </div>
          </div>
        )}
      </main>

      <ChatWidget mode="vendor" locale={lang} />
    </div>
  );
}

function Field({ label, value, onChange, req, type }: { label: string; value: string; onChange: (v: string) => void; req?: boolean; type?: string }) {
  return (<label className={'vs-field' + (req ? ' req' : '')}><span>{label}</span><input type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} /></label>);
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
.vs{--bg:#0A0A0F;--bg2:#111118;--surf:rgba(255,255,255,.04);--surf2:rgba(255,255,255,.07);--ink:#F0F0F5;--ink2:#C0C0D0;--muted:#8080A0;--muted2:#505068;--line:rgba(255,255,255,.08);--p:#7C5CFC;--p2:#A78BFA;--p3:#C4B5FD;--pbg:rgba(124,92,252,.12);--pd:#6344DF;--green:#34D399;--sans:'Outfit',system-ui,sans-serif;--serif:'Instrument Serif',Georgia,serif;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;position:relative;overflow-x:hidden;line-height:1.6;}
.vs *{box-sizing:border-box;}
.vs-mesh{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;}
.vs-mesh span{position:absolute;border-radius:50%;filter:blur(120px);opacity:.5;}
.vs-mesh .o1{width:520px;height:520px;background:var(--p);top:-140px;right:-120px;opacity:.22;}
.vs-mesh .o2{width:440px;height:440px;background:#7C3AED;bottom:-160px;left:-100px;opacity:.16;}
.vs-nav{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:18px 32px;background:rgba(10,10,15,.7);backdrop-filter:blur(24px);border-bottom:1px solid var(--line);}
.vs-brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:var(--ink);}
.vs-mk{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,var(--p),var(--pd));display:grid;place-items:center;font-family:var(--serif);font-size:19px;color:#fff;}
.vs-brand b{font-size:19px;font-weight:700;letter-spacing:-.02em;}.vs-brand i{color:var(--p2);font-style:normal;}
.vs-seg{display:flex;gap:2px;padding:3px;border:1px solid var(--line);border-radius:99px;background:var(--surf);}
.vs-seg button{border:none;background:none;color:var(--muted);font-family:var(--sans);font-weight:600;font-size:12px;padding:7px 13px;border-radius:99px;cursor:pointer;}
.vs-seg button.on{background:var(--p);color:#fff;}
.vs-wrap{position:relative;z-index:1;max-width:1140px;margin:0 auto;padding:64px 32px 120px;}
.vs-grid2{display:grid;grid-template-columns:1fr 1.05fr;gap:56px;align-items:start;}
@media(max-width:900px){.vs-grid2{grid-template-columns:1fr;gap:36px;}.vs-wrap{padding:44px 22px 96px;}}
.vs-eyebrow{display:inline-block;padding:8px 18px;border-radius:99px;background:var(--surf);border:1px solid var(--line);color:var(--p3);font-size:13px;font-weight:500;letter-spacing:.02em;}
.vs-intro h1{font-weight:800;font-size:clamp(38px,5vw,60px);line-height:1.05;letter-spacing:-.035em;margin:24px 0 20px;}
.vs-intro h1 em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--p2);}
.vs-lead{font-size:19px;line-height:1.6;color:var(--ink2);font-weight:300;max-width:480px;margin-bottom:32px;}
.vs-perks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px;}
.vs-perks li{display:flex;align-items:flex-start;gap:12px;color:var(--ink2);font-size:15.5px;}
.vs-perks svg{color:var(--green);flex:none;margin-top:2px;}
.vs-card{background:var(--surf);border:1px solid var(--line);border-radius:22px;padding:32px;backdrop-filter:blur(12px);box-shadow:0 24px 80px rgba(0,0,0,.4);}
.vs-steps{display:flex;gap:12px;margin-bottom:26px;flex-wrap:wrap;}
.vs-pstep{display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:500;color:var(--muted);}
.vs-pstep span{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--surf2);border:1px solid var(--line);font-size:12px;font-weight:600;}
.vs-pstep.on{color:var(--ink);}.vs-pstep.on span{background:var(--p);color:#fff;border-color:var(--p);}
.vs-fgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media(max-width:520px){.vs-fgrid{grid-template-columns:1fr;}}
.vs-field{display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:500;color:var(--ink2);}
.vs-field.req span::after{content:' *';color:var(--p2);}
.vs-field input,.vs-field textarea{font-family:var(--sans);padding:13px 15px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:15px;outline:none;width:100%;resize:vertical;transition:.15s;}
.vs-field input:focus,.vs-field textarea:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vs-field input::placeholder,.vs-field textarea::placeholder{color:var(--muted2);}
.vs-lbl{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--p2);margin-bottom:14px;}
.vs-hint{color:var(--muted);font-size:13.5px;margin:0 0 16px;font-weight:300;}
.vs-chips{display:flex;flex-wrap:wrap;gap:9px;}
.vs-chip{font-family:var(--sans);padding:10px 16px;border-radius:99px;border:1px solid var(--line);background:var(--surf);color:var(--ink2);font-size:13.5px;font-weight:500;cursor:pointer;transition:.15s;}
.vs-chip:hover{border-color:var(--p2);color:var(--ink);}
.vs-chip.on{background:var(--pbg);border-color:var(--p);color:var(--p3);}
.vs-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:34px;border:1.5px dashed rgba(124,92,252,.35);border-radius:16px;color:var(--p2);cursor:pointer;background:var(--pbg);transition:.15s;}
.vs-drop:hover{border-color:var(--p);background:rgba(124,92,252,.16);}
.vs-drop span{font-weight:600;font-size:14.5px;}
.vs-drop input{display:none;}
.vs-files{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:9px;}
.vs-files li{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border:1px solid var(--line);border-radius:11px;font-size:13.5px;color:var(--ink2);background:var(--surf);}
.vs-files button{border:none;background:none;color:var(--muted);cursor:pointer;font-size:14px;}
.vs-actions{display:flex;gap:12px;justify-content:flex-end;margin-top:28px;}
.vs-btn{font-family:var(--sans);border:none;cursor:pointer;font-size:15px;font-weight:600;border-radius:12px;padding:14px 26px;background:var(--p);color:#fff;transition:.2s;box-shadow:0 4px 20px rgba(124,92,252,.35);}
.vs-btn:hover{background:var(--pd);transform:translateY(-1px);}.vs-btn:disabled{opacity:.6;cursor:default;transform:none;}
.vs-btn.ghost{background:var(--surf);border:1px solid var(--line);color:var(--ink);box-shadow:none;}
.vs-btn.ghost:hover{border-color:var(--p2);}
.vs-err{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:#FCA5A5;padding:12px 16px;border-radius:12px;font-size:13.5px;margin-bottom:18px;}
.vs-done{max-width:460px;margin:40px auto;text-align:center;}
.vs-check{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--pd));display:grid;place-items:center;margin:0 auto 18px;box-shadow:0 8px 30px rgba(124,92,252,.4);}
.vs-done h1{font-size:30px;font-weight:800;letter-spacing:-.02em;margin-bottom:10px;}
.vs-done p{color:var(--ink2);font-size:16px;font-weight:300;margin:0 auto 18px;max-width:400px;}
.vs-ref{display:inline-block;padding:9px 18px;border-radius:99px;background:var(--pbg);border:1px solid rgba(124,92,252,.25);color:var(--p3);font-weight:600;font-size:14px;margin-bottom:24px;}
`;
