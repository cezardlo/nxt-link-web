'use client';

import { useState } from 'react';
import ChatWidget from '@/components/ChatWidget';

// 17 warehouse categories — aligned with the client intake flow.
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
    eyebrow: 'For vendors', title: 'Register your company',
    sub: 'List what you provide and the areas you serve. NXT//LINK sends you protected, pre-qualified opportunities — and a human follows up.',
    company: 'Company name', contact: 'Contact name', email: 'Email', phone: 'Phone',
    website: 'Website', city: 'City', cats: 'What do you provide?', areas: 'Service areas',
    desc: 'Tell us about your company', descPh: 'Capabilities, certifications, response time, what makes you a strong fit…',
    broch: 'Brochures & documents', brochSub: 'Upload a capabilities deck, line card, or brochure (PDF, images, slides — up to 15 MB each).',
    add: 'Add file', submit: 'Register company', submitting: 'Registering…',
    req: 'Please add a company name and a valid email.',
    doneT: "You're registered", doneS: 'Your company profile is under review. A member of the NXT//LINK team will follow up shortly.',
    ref: 'Reference', another: 'Register another', next: 'Continue', back: 'Back',
    step: ['Company', 'What you do', 'Brochures'],
  },
  es: {
    eyebrow: 'Para proveedores', title: 'Registra tu empresa',
    sub: 'Indica lo que ofreces y las zonas que cubres. NXT//LINK te envía oportunidades protegidas y precalificadas — y un humano da seguimiento.',
    company: 'Nombre de la empresa', contact: 'Nombre de contacto', email: 'Correo', phone: 'Teléfono',
    website: 'Sitio web', city: 'Ciudad', cats: '¿Qué ofreces?', areas: 'Zonas de servicio',
    desc: 'Cuéntanos sobre tu empresa', descPh: 'Capacidades, certificaciones, tiempo de respuesta, por qué encajan bien…',
    broch: 'Folletos y documentos', brochSub: 'Sube tu presentación de capacidades, line card o folleto (PDF, imágenes, slides — hasta 15 MB c/u).',
    add: 'Agregar archivo', submit: 'Registrar empresa', submitting: 'Registrando…',
    req: 'Agrega el nombre de la empresa y un correo válido.',
    doneT: 'Empresa registrada', doneS: 'Tu perfil está en revisión. Un miembro del equipo de NXT//LINK te dará seguimiento pronto.',
    ref: 'Referencia', another: 'Registrar otra', next: 'Continuar', back: 'Atrás',
    step: ['Empresa', 'Qué ofreces', 'Folletos'],
  },
};

export default function VendorSignupPage() {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '', website: '', city: '', description: '',
  });
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
    if (!form.company_name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError(t.req); setStep(0); return;
    }
    setError(''); setSubmitting(true);
    try {
      const res = await fetch('/api/vendors/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          categories: cats.map((id) => CATEGORIES.find((c) => c.id === id)?.en || id),
          service_areas: areas, locale: lang,
        }),
      });
      const data = await res.json();
      const vendorId = data.id as string | undefined;
      if (vendorId && files.length) {
        for (const file of files) {
          const fd = new FormData();
          fd.append('vendor_id', vendorId);
          fd.append('file', file);
          await fetch('/api/vendors/brochures', { method: 'POST', body: fd }).catch(() => {});
        }
      }
      setDone({ ref: data.public_ref || '—' });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="vs-root">
      <style>{CSS}</style>
      <header className="vs-nav">
        <a className="vs-brand" href="/">
          <span className="vs-mk">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h12" /><path d="m13 8 4 4-4 4" /></svg>
          </span>
          <b>NXT<i>//</i>LINK</b>
        </a>
        <div className="vs-seg">
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
        </div>
      </header>

      <main className="vs-wrap">
        {done ? (
          <div className="vs-card vs-done">
            <div className="vs-check">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h1>{t.doneT}</h1>
            <p>{t.doneS}</p>
            <div className="vs-ref">{t.ref}: <b>{done.ref}</b></div>
            <button className="vs-btn" onClick={() => { setDone(null); setStep(0); setForm({ company_name: '', contact_name: '', email: '', phone: '', website: '', city: '', description: '' }); setCats([]); setAreas([]); setFiles([]); }}>{t.another}</button>
          </div>
        ) : (
          <>
            <span className="vs-eyebrow">{t.eyebrow}</span>
            <h1 className="vs-title">{t.title}</h1>
            <p className="vs-sub">{t.sub}</p>

            <div className="vs-steps">
              {t.step.map((s, i) => (
                <div key={i} className={'vs-pstep' + (i <= step ? ' on' : '')}><span>{i + 1}</span>{s}</div>
              ))}
            </div>

            <div className="vs-card">
              {error && <div className="vs-err">{error}</div>}

              {step === 0 && (
                <div className="vs-grid">
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
                  <div className="vs-chips">
                    {CATEGORIES.map((c) => (
                      <button key={c.id} type="button" className={'vs-chip' + (cats.includes(c.id) ? ' on' : '')} onClick={() => toggle(cats, c.id, setCats)}>{c[lang]}</button>
                    ))}
                  </div>
                  <div className="vs-lbl" style={{ marginTop: 20 }}>{t.areas}</div>
                  <div className="vs-chips">
                    {AREAS.map((a) => (
                      <button key={a} type="button" className={'vs-chip' + (areas.includes(a) ? ' on' : '')} onClick={() => toggle(areas, a, setAreas)}>{a}</button>
                    ))}
                  </div>
                  <label className="vs-field" style={{ marginTop: 20 }}>
                    <span>{t.desc}</span>
                    <textarea rows={4} placeholder={t.descPh} value={form.description} onChange={(e) => set('description', e.target.value)} />
                  </label>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="vs-lbl">{t.broch}</div>
                  <p className="vs-hint">{t.brochSub}</p>
                  <label className="vs-drop">
                    <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.ppt,.pptx,.doc,.docx" onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])} />
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></svg>
                    <span>{t.add}</span>
                  </label>
                  {files.length > 0 && (
                    <ul className="vs-files">
                      {files.map((f, i) => (
                        <li key={i}>
                          <span>{f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB</span>
                          <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              <div className="vs-actions">
                {step > 0 && <button className="vs-btn ghost" onClick={() => setStep(step - 1)}>{t.back}</button>}
                {step < 2 && <button className="vs-btn" onClick={() => setStep(step + 1)}>{t.next}</button>}
                {step === 2 && <button className="vs-btn" disabled={submitting} onClick={submit}>{submitting ? t.submitting : t.submit}</button>}
              </div>
            </div>
          </>
        )}
      </main>
      <ChatWidget mode="vendor" locale={lang} />
    </div>
  );
}

function Field({ label, value, onChange, req, type }: { label: string; value: string; onChange: (v: string) => void; req?: boolean; type?: string }) {
  return (
    <label className={'vs-field' + (req ? ' req' : '')}>
      <span>{label}</span>
      <input type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

const CSS = `
.vs-root{--bg:#F8FAFC;--surface:#fff;--line:#E2E8F0;--line-2:#CBD5E1;--ink:#0F172A;--ink-2:#475569;--ink-3:#94A3B8;--brand:#2563EB;--brand-2:#1D4ED8;--brand-soft:#EFF4FF;--brand-line:#BFD4FF;--green:#16A34A;--green-soft:#DCFCE7;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.vs-root *{box-sizing:border-box;}
.vs-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 28px;background:#fff;border-bottom:1px solid var(--line);}
.vs-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);}
.vs-mk{width:30px;height:30px;border-radius:8px;background:var(--brand);display:grid;place-items:center;}
.vs-brand b{font-size:19px;font-weight:800;letter-spacing:-.03em;}.vs-brand i{color:var(--brand);font-style:normal;}
.vs-seg{display:flex;gap:2px;padding:3px;border:1px solid var(--line);border-radius:9px;}
.vs-seg button{border:none;background:none;color:var(--ink-2);font:600 12px/1 Inter;padding:6px 10px;border-radius:6px;cursor:pointer;}
.vs-seg button.on{background:var(--brand);color:#fff;}
.vs-wrap{max-width:760px;margin:0 auto;padding:44px 24px 80px;}
.vs-eyebrow{display:inline-block;padding:6px 12px;border-radius:100px;background:var(--brand-soft);border:1px solid var(--brand-line);color:var(--brand-2);font:600 11px/1 Inter;letter-spacing:.08em;text-transform:uppercase;}
.vs-title{font:800 clamp(28px,4vw,40px)/1.1 Inter;letter-spacing:-.03em;margin:16px 0 8px;}
.vs-sub{color:var(--ink-2);font-size:16px;line-height:1.6;margin:0 0 24px;max-width:600px;}
.vs-steps{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;}
.vs-pstep{display:flex;align-items:center;gap:8px;font:600 13px/1 Inter;color:var(--ink-3);}
.vs-pstep span{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--surface);border:1px solid var(--line-2);font-size:12px;}
.vs-pstep.on{color:var(--ink);}.vs-pstep.on span{background:var(--brand);color:#fff;border-color:var(--brand);}
.vs-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:26px;box-shadow:0 4px 6px -2px rgba(15,23,42,.05),0 12px 24px -8px rgba(15,23,42,.1);}
.vs-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:560px){.vs-grid{grid-template-columns:1fr;}}
.vs-field{display:flex;flex-direction:column;gap:6px;font:600 12px/1.2 Inter;color:var(--ink-2);}
.vs-field.req span::after{content:' *';color:var(--brand);}
.vs-field input,.vs-field textarea{padding:11px 13px;border-radius:10px;border:1px solid var(--line-2);background:#fff;color:var(--ink);font:400 15px/1.3 Inter;outline:none;width:100%;resize:vertical;}
.vs-field input:focus,.vs-field textarea:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(37,99,235,.15);}
.vs-lbl{font:700 11px/1 Inter;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-bottom:12px;}
.vs-hint{color:var(--ink-2);font-size:13px;margin:0 0 14px;}
.vs-chips{display:flex;flex-wrap:wrap;gap:8px;}
.vs-chip{padding:9px 14px;border-radius:100px;border:1px solid var(--line-2);background:#fff;color:var(--ink-2);font:600 13px/1 Inter;cursor:pointer;transition:.12s;}
.vs-chip:hover{border-color:var(--brand-line);}
.vs-chip.on{background:var(--brand-soft);border-color:var(--brand);color:var(--brand-2);}
.vs-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:28px;border:1.5px dashed var(--line-2);border-radius:12px;color:var(--ink-2);cursor:pointer;background:var(--brand-soft);}
.vs-drop:hover{border-color:var(--brand);color:var(--brand);}
.vs-drop input{display:none;}
.vs-files{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;}
.vs-files li{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font:500 13px/1.3 Inter;color:var(--ink);}
.vs-files button{border:none;background:none;color:var(--ink-3);cursor:pointer;font-size:14px;}
.vs-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:24px;}
.vs-btn{border:none;cursor:pointer;font:600 14px/1 Inter;border-radius:10px;padding:12px 20px;background:var(--brand);color:#fff;}
.vs-btn:hover{background:var(--brand-2);}.vs-btn:disabled{opacity:.6;cursor:default;}
.vs-btn.ghost{background:#fff;border:1px solid var(--line-2);color:var(--ink);}
.vs-btn.ghost:hover{border-color:var(--brand);color:var(--brand);}
.vs-err{background:#FEE2E2;border:1px solid #FECACA;color:#B91C1C;padding:10px 14px;border-radius:10px;font:500 13px/1.4 Inter;margin-bottom:16px;}
.vs-done{text-align:center;}
.vs-check{width:56px;height:56px;border-radius:50%;background:var(--green);display:grid;place-items:center;margin:0 auto 14px;}
.vs-done h1{font:800 26px/1.1 Inter;margin:0 0 8px;}
.vs-done p{color:var(--ink-2);font-size:15px;line-height:1.6;margin:0 auto 16px;max-width:420px;}
.vs-ref{display:inline-block;padding:8px 16px;border-radius:10px;background:var(--brand-soft);border:1px solid var(--brand-line);color:var(--brand-2);font:600 14px/1 Inter;margin-bottom:20px;}
`;
