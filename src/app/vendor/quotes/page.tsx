'use client';

import { useState, useEffect } from 'react';
import { ASSISTANT, type Locale } from '@/lib/assistant/branding';

// ---------- Tokens ----------
const C = {
  bg: '#0A0A0F',
  text: '#F3F4F6',
  sec: '#9CA3AF',
  sec2: '#D1D5DB',
  muted: '#6B7280',
  card: '#111118',
  border: '#2A2A35',
  input: '#0A0A0F',
  accent: '#7C5CFC',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
};

const FONT = 'system-ui, sans-serif';

const CATEGORIES = [
  'Forklift maintenance', 'Staffing', 'Transportation', 'Facility maintenance',
  'IT/security', 'Warehouse technology', 'Packaging/labels', 'Pallets/materials', 'Custom',
];

const STATUS_FILTERS = ['Draft', 'Submitted', 'Accepted', 'Declined', 'Expired', 'Templates'];

const STORE = {
  templates: 'nxtlink_vendor_templates',
  quotes: 'nxtlink_vendor_quotes',
};

// ---------- Types ----------
interface Template {
  id: string;
  created_at: string;
  name: string;
  category: string;
  description: string;
  pricing_model: string;
  labor_rate: string;
  service_fee: string;
  parts_note: string;
  included: string;
  excluded: string;
  lead_time: string;
  warranty: string;
  payment_terms: string;
  required_info: string;
  terms: string;
  expiration_period: string;
}

interface ResponseFields {
  can_serve_location: string;
  available_by_deadline: string;
  quote_type: string;
  price_text: string;
  labor_rate: string;
  service_fee: string;
  travel_fee: string;
  parts_cost: string;
  included: string;
  excluded: string;
  lead_time: string;
  warranty: string;
  payment_terms: string;
  expiration_date: string;
  required_next_info: string;
  questions_for_client: string;
}

interface Quote {
  id: string;
  created_at: string;
  submitted_at: string;
  status: string; // draft | submitted | accepted | declined | expired
  opportunity_ref: string;
  client_desc: string;
  category: string;
  notes: string;
  response: ResponseFields;
}

interface AiDraft {
  short_response: string;
  price_range: string;
  included: string;
  excluded: string;
  timeline: string;
  required_next_info: string;
  terms: string;
  attachments_needed: string;
}

interface TermsDraft {
  quote_validity: string;
  payment_terms: string;
  warranty: string;
  exclusions: string;
  lead_time: string;
  emergency_service: string;
  liability_insurance: string;
  confidentiality: string;
  introduction_agreement: string;
  terms_and_conditions: string;
  disclaimer: string;
}

// ---------- Defaults ----------
const emptyTemplate = (): Template => ({
  id: '', created_at: '', name: '', category: '', description: '', pricing_model: '',
  labor_rate: '', service_fee: '', parts_note: '', included: '', excluded: '',
  lead_time: '', warranty: '', payment_terms: '', required_info: '', terms: '',
  expiration_period: '',
});

const emptyResponse = (): ResponseFields => ({
  can_serve_location: 'yes', available_by_deadline: 'yes', quote_type: 'estimate',
  price_text: '', labor_rate: '', service_fee: '', travel_fee: '', parts_cost: '',
  included: '', excluded: '', lead_time: '', warranty: '', payment_terms: '',
  expiration_date: '', required_next_info: '', questions_for_client: '',
});

const SAMPLE_PACKET = {
  scope: 'Warehouse forklift preventive maintenance',
  general_location: 'El Paso',
  timeline: 'next week',
  quantity: '6 units',
  notes: 'Routine PM service for 6 warehouse forklifts. Client identity withheld.',
};

const genId = () => Date.now().toString() + Math.random().toString(36).slice(2, 8);

// ---------- Component ----------
export default function VendorQuotesPage() {
  const [locale, setLocale] = useState<Locale>('en');
  const [tab, setTab] = useState<1 | 2 | 3 | 4>(1);
  const [toast, setToast] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const [tplForm, setTplForm] = useState<Template>(emptyTemplate());
  const [editingTplId, setEditingTplId] = useState<string>('');

  const [packetText, setPacketText] = useState<string>(JSON.stringify(SAMPLE_PACKET, null, 2));
  const [response, setResponse] = useState<ResponseFields>(emptyResponse());
  const [selectedTplId, setSelectedTplId] = useState<string>('');
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [aiProvider, setAiProvider] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string>('');

  const [filter, setFilter] = useState<string>('Draft');
  const [expandedId, setExpandedId] = useState<string>('');

  // ---------- Terms & Agreement tab state ----------
  const [termsVendorName, setTermsVendorName] = useState<string>('Your Company');
  const [termsWarrantyMonths, setTermsWarrantyMonths] = useState<number>(12);
  const [termsEmergency, setTermsEmergency] = useState<boolean>(false);
  const [termsNda, setTermsNda] = useState<boolean>(false);
  const [termsDraft, setTermsDraft] = useState<TermsDraft | null>(null);
  const [termsProvider, setTermsProvider] = useState<string>('');
  const [termsLoading, setTermsLoading] = useState(false);

  const T = (en: string, es: string) => (locale === 'es' ? es : en);

  // ---------- Load ----------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawT = window.localStorage.getItem(STORE.templates);
      if (rawT) setTemplates(JSON.parse(rawT) as Template[]);
      const rawQ = window.localStorage.getItem(STORE.quotes);
      if (rawQ) setQuotes(JSON.parse(rawQ) as Quote[]);
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const persistTemplates = (next: Template[]) => {
    setTemplates(next);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(STORE.templates, JSON.stringify(next)); } catch { /* ignore */ }
    }
  };

  const persistQuotes = (next: Quote[]) => {
    setQuotes(next);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(STORE.quotes, JSON.stringify(next)); } catch { /* ignore */ }
    }
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // ---------- Template actions ----------
  const setTpl = (k: keyof Template, v: string) => setTplForm({ ...tplForm, [k]: v });

  const saveTemplate = () => {
    if (!tplForm.name.trim()) { setErrorMsg(T('Template name is required.', 'El nombre de la plantilla es obligatorio.')); return; }
    setErrorMsg('');
    if (editingTplId) {
      const next = templates.map((t) => (t.id === editingTplId ? { ...tplForm, id: editingTplId } : t));
      persistTemplates(next);
      flash(T('Template updated.', 'Plantilla actualizada.'));
    } else {
      const nt: Template = { ...tplForm, id: genId(), created_at: new Date().toISOString() };
      persistTemplates([nt, ...templates]);
      flash(T('Template saved.', 'Plantilla guardada.'));
    }
    setTplForm(emptyTemplate());
    setEditingTplId('');
  };

  const editTemplate = (t: Template) => {
    setTplForm(t);
    setEditingTplId(t.id);
    setTab(1);
  };

  const duplicateTemplate = (t: Template) => {
    const copy: Template = { ...t, id: genId(), created_at: new Date().toISOString(), name: `${t.name} (copy)` };
    persistTemplates([copy, ...templates]);
    flash(T('Template duplicated.', 'Plantilla duplicada.'));
  };

  const deleteTemplate = (id: string) => {
    persistTemplates(templates.filter((t) => t.id !== id));
    if (editingTplId === id) { setTplForm(emptyTemplate()); setEditingTplId(''); }
    flash(T('Template deleted.', 'Plantilla eliminada.'));
  };

  const applyTemplateInQuote = (t: Template) => {
    applyTemplateToResponse(t);
    setSelectedTplId(t.id);
    setTab(2);
    flash(T('Template loaded into quote.', 'Plantilla cargada en la cotización.'));
  };

  const applyTemplateToResponse = (t: Template) => {
    setResponse((prev) => ({
      ...prev,
      price_text: t.pricing_model || prev.price_text,
      labor_rate: t.labor_rate || prev.labor_rate,
      service_fee: t.service_fee || prev.service_fee,
      parts_cost: t.parts_note || prev.parts_cost,
      included: t.included || prev.included,
      excluded: t.excluded || prev.excluded,
      lead_time: t.lead_time || prev.lead_time,
      warranty: t.warranty || prev.warranty,
      payment_terms: t.payment_terms || prev.payment_terms,
      required_next_info: t.required_info || prev.required_next_info,
      expiration_date: t.expiration_period || prev.expiration_date,
    }));
  };

  // ---------- Response actions ----------
  const setResp = (k: keyof ResponseFields, v: string) => setResponse({ ...response, [k]: v });

  const insertFromTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    applyTemplateToResponse(t);
    setSelectedTplId(id);
    flash(T('Inserted from template.', 'Insertado desde la plantilla.'));
  };

  const parsePacket = (): Record<string, unknown> => {
    try {
      const parsed = JSON.parse(packetText) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // fall through
    }
    return { scope: 'forklift preventive maintenance', general_location: 'El Paso', timeline: 'next week', quantity: '6 units' };
  };

  const aiDraftWithAssistant = async () => {
    setErrorMsg('');
    setAiLoading(true);
    const packet = parsePacket();
    const template = templates.find((t) => t.id === selectedTplId) || {};
    try {
      const res = await fetch('/api/assistant/vendor-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packet,
          vendorProfile: { name: 'Your Company', service_areas: ['El Paso', 'Juárez'] },
          template,
          locale,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; provider?: string; draft?: AiDraft };
      if (!res.ok || !data || !data.draft) {
        throw new Error('No draft returned');
      }
      const d = data.draft;
      setAiDraft(d);
      setAiProvider(data.provider || 'unknown');
      setResponse((prev) => ({
        ...prev,
        price_text: d.price_range || prev.price_text,
        included: d.included || prev.included,
        excluded: d.excluded || prev.excluded,
        lead_time: d.timeline || prev.lead_time,
        required_next_info: d.required_next_info || prev.required_next_info,
        payment_terms: d.terms || prev.payment_terms,
      }));
      flash(T('AI draft created — review before sending.', 'Borrador de AI creado — revise antes de enviar.'));
    } catch {
      setErrorMsg(T(
        'Could not reach the assistant. Please try again or fill the quote manually.',
        'No se pudo contactar al asistente. Intente de nuevo o complete la cotización manualmente.',
      ));
    }
    setAiLoading(false);
  };

  const aiDraftTerms = async () => {
    setErrorMsg('');
    setTermsLoading(true);
    try {
      const res = await fetch('/api/assistant/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: termsVendorName,
          category: 'Forklift maintenance',
          warrantyMonths: termsWarrantyMonths,
          emergency: termsEmergency,
          nda: termsNda,
          locale,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; is_draft?: boolean; provider?: string; terms?: TermsDraft };
      if (!res.ok || !data || !data.terms) {
        throw new Error('No terms returned');
      }
      setTermsDraft(data.terms);
      setTermsProvider(data.provider || 'unknown');
      flash(T('Terms drafted — review before sending.', 'Términos redactados — revise antes de enviar.'));
    } catch {
      setErrorMsg(T(
        'Could not reach the assistant. Please try again or fill the terms manually.',
        'No se pudo contactar al asistente. Intente de nuevo o complete los términos manualmente.',
      ));
    }
    setTermsLoading(false);
  };

  const setTermsField = (k: keyof TermsDraft, v: string) =>
    setTermsDraft((prev) => (prev ? { ...prev, [k]: v } : prev));

  const saveResponseAsTemplate = () => {
    const nt: Template = {
      id: genId(),
      created_at: new Date().toISOString(),
      name: T('Quote response template', 'Plantilla de respuesta') + ' ' + new Date().toLocaleDateString(),
      category: 'Custom',
      description: '',
      pricing_model: response.price_text,
      labor_rate: response.labor_rate,
      service_fee: response.service_fee,
      parts_note: response.parts_cost,
      included: response.included,
      excluded: response.excluded,
      lead_time: response.lead_time,
      warranty: response.warranty,
      payment_terms: response.payment_terms,
      required_info: response.required_next_info,
      terms: response.questions_for_client,
      expiration_period: response.expiration_date,
    };
    persistTemplates([nt, ...templates]);
    flash(T('Saved current response as template.', 'Respuesta guardada como plantilla.'));
  };

  const deriveClientDesc = (): string => {
    const p = parsePacket();
    const scope = (p.scope as string) || 'Warehouse forklift PM';
    const loc = (p.general_location as string) || 'El Paso';
    return `${scope} — ${loc}`;
  };

  const saveQuote = (status: 'draft' | 'submitted') => {
    const now = new Date().toISOString();
    if (editingQuoteId) {
      const next = quotes.map((q) =>
        q.id === editingQuoteId
          ? {
              ...q,
              status,
              submitted_at: status === 'submitted' ? now : q.submitted_at,
              response: { ...response },
              price_text: response.price_text,
            }
          : q,
      );
      persistQuotes(next);
    } else {
      const nq: Quote = {
        id: genId(),
        created_at: now,
        submitted_at: status === 'submitted' ? now : '',
        status,
        opportunity_ref: 'OPP-' + genId().slice(-6).toUpperCase(),
        client_desc: deriveClientDesc(),
        category: templates.find((t) => t.id === selectedTplId)?.category || 'Custom',
        notes: aiDraft ? aiDraft.short_response : '',
        response: { ...response },
      };
      persistQuotes([nq, ...quotes]);
    }
    setEditingQuoteId('');
    flash(status === 'submitted'
      ? T('Response submitted.', 'Respuesta enviada.')
      : T('Draft saved.', 'Borrador guardado.'));
    setTab(3);
    setFilter(status === 'submitted' ? 'Submitted' : 'Draft');
  };

  // ---------- Saved quotes actions ----------
  const editQuoteDraft = (q: Quote) => {
    setResponse(q.response);
    setEditingQuoteId(q.id);
    setAiDraft(null);
    setTab(2);
    flash(T('Loaded draft for editing.', 'Borrador cargado para editar.'));
  };

  const duplicateQuote = (q: Quote) => {
    const copy: Quote = {
      ...q,
      id: genId(),
      created_at: new Date().toISOString(),
      submitted_at: '',
      status: 'draft',
      opportunity_ref: 'OPP-' + genId().slice(-6).toUpperCase(),
    };
    persistQuotes([copy, ...quotes]);
    flash(T('Quote duplicated.', 'Cotización duplicada.'));
  };

  const quoteAsTemplate = (q: Quote) => {
    const r = q.response;
    const nt: Template = {
      id: genId(),
      created_at: new Date().toISOString(),
      name: `${q.client_desc} ${T('template', 'plantilla')}`,
      category: q.category || 'Custom',
      description: '',
      pricing_model: r.price_text,
      labor_rate: r.labor_rate,
      service_fee: r.service_fee,
      parts_note: r.parts_cost,
      included: r.included,
      excluded: r.excluded,
      lead_time: r.lead_time,
      warranty: r.warranty,
      payment_terms: r.payment_terms,
      required_info: r.required_next_info,
      terms: r.questions_for_client,
      expiration_period: r.expiration_date,
    };
    persistTemplates([nt, ...templates]);
    flash(T('Saved quote as template.', 'Cotización guardada como plantilla.'));
  };

  const deleteQuote = (id: string) => {
    persistQuotes(quotes.filter((q) => q.id !== id));
    flash(T('Quote deleted.', 'Cotización eliminada.'));
  };

  const stub = () => { if (typeof window !== 'undefined') window.alert(T('Coming soon', 'Próximamente')); };

  // ---------- Style helpers ----------
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.sec2 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const taStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' };
  const cardStyle: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 28 };
  const btn = (bg: string, fg = '#fff'): React.CSSProperties => ({ padding: '10px 16px', background: bg, color: fg, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' });
  const ghostBtn: React.CSSProperties = { padding: '8px 12px', background: 'transparent', color: C.sec2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };

  const statusColor = (s: string): string => {
    switch (s) {
      case 'submitted': return C.accent;
      case 'accepted': return C.green;
      case 'declined': return C.red;
      case 'expired': return C.muted;
      default: return C.amber; // draft
    }
  };

  const Field = ({ label, k, area = false, placeholder = '' }: { label: string; k: keyof ResponseFields; area?: boolean; placeholder?: string }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      {area ? (
        <textarea value={response[k]} onChange={(e) => setResp(k, e.target.value)} rows={2} placeholder={placeholder} style={taStyle} />
      ) : (
        <input value={response[k]} onChange={(e) => setResp(k, e.target.value)} placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  );

  const footerNote = (
    <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, marginTop: 32, textAlign: 'center' }}>
      {T(
        'AI drafts are suggestions. You review and approve before anything is submitted. Client identity stays hidden.',
        'Los borradores de AI son sugerencias. Usted revisa y aprueba antes de enviar. La identidad del cliente permanece oculta.',
      )}
    </p>
  );

  // ---------- Render ----------
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: FONT }}>
      {/* Nav */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1A1A24', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -1, textDecoration: 'none', color: C.text }}>
          NXT<span style={{ color: C.accent }}>{'//'}</span>LINK
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{locale === 'es' ? ASSISTANT.name_es : ASSISTANT.name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{locale === 'es' ? ASSISTANT.subtitle_es : ASSISTANT.subtitle}</div>
          </div>
          <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {(['en', 'es'] as Locale[]).map((l) => (
              <button key={l} onClick={() => setLocale(l)} style={{ padding: '6px 12px', background: locale === l ? C.accent : 'transparent', color: locale === l ? '#fff' : C.sec, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px 60px' }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 8 }}>
            {T('FOR VENDORS', 'PARA PROVEEDORES')}
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>
            {T('Vendor AI Quote Builder', 'Generador de Cotizaciones con AI')}
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, margin: '24px 0', flexWrap: 'wrap' }}>
          {([
            [1, T('Quote Template Library', 'Biblioteca de Plantillas de Cotización')],
            [2, T('Quote Response', 'Respuesta de Cotización')],
            [3, T('Saved Quotes', 'Cotizaciones Guardadas')],
            [4, T('Terms & Agreement', 'Términos y Acuerdo')],
          ] as [number, string][]).map(([n, label]) => (
            <button key={n} onClick={() => setTab(n as 1 | 2 | 3 | 4)} style={{ padding: '10px 16px', background: tab === n ? C.accent : C.card, color: tab === n ? '#fff' : C.sec2, border: `1px solid ${tab === n ? C.accent : C.border}`, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Toast / errors */}
        {toast && <div style={{ background: '#10B98118', border: `1px solid ${C.green}55`, color: C.green, padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{toast}</div>}
        {errorMsg && <div style={{ background: '#EF444418', border: `1px solid ${C.red}55`, color: C.red, padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{errorMsg}</div>}

        {/* ---------------- TAB 1 ---------------- */}
        {tab === 1 && (
          <>
            <div style={cardStyle}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 0 }}>
                {editingTplId ? T('Edit template', 'Editar plantilla') : T('Create a template', 'Crear una plantilla')}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>{T('Name', 'Nombre')} <span style={{ color: C.accent }}>*</span></label>
                  <input value={tplForm.name} onChange={(e) => setTpl('name', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{T('Category', 'Categoría')}</label>
                  <select value={tplForm.category} onChange={(e) => setTpl('category', e.target.value)} style={inputStyle}>
                    <option value="">{T('Select...', 'Seleccione...')}</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>{T('Description', 'Descripción')}</label>
                <textarea value={tplForm.description} onChange={(e) => setTpl('description', e.target.value)} rows={2} style={taStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <label style={labelStyle}>{T('Pricing model', 'Modelo de precios')}</label>
                  <input value={tplForm.pricing_model} onChange={(e) => setTpl('pricing_model', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{T('Labor rate', 'Tarifa de mano de obra')}</label>
                  <input value={tplForm.labor_rate} onChange={(e) => setTpl('labor_rate', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{T('Service fee', 'Cargo por servicio')}</label>
                  <input value={tplForm.service_fee} onChange={(e) => setTpl('service_fee', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{T('Lead time', 'Tiempo de entrega')}</label>
                  <input value={tplForm.lead_time} onChange={(e) => setTpl('lead_time', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{T('Warranty', 'Garantía')}</label>
                  <input value={tplForm.warranty} onChange={(e) => setTpl('warranty', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{T('Payment terms', 'Términos de pago')}</label>
                  <input value={tplForm.payment_terms} onChange={(e) => setTpl('payment_terms', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{T('Expiration period', 'Período de expiración')}</label>
                  <input value={tplForm.expiration_period} onChange={(e) => setTpl('expiration_period', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{T('Parts note', 'Nota de partes')}</label>
                  <input value={tplForm.parts_note} onChange={(e) => setTpl('parts_note', e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>{T('Included', 'Incluido')}</label>
                <textarea value={tplForm.included} onChange={(e) => setTpl('included', e.target.value)} rows={2} style={taStyle} />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>{T('Excluded', 'Excluido')}</label>
                <textarea value={tplForm.excluded} onChange={(e) => setTpl('excluded', e.target.value)} rows={2} style={taStyle} />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>{T('Required info', 'Información requerida')}</label>
                <textarea value={tplForm.required_info} onChange={(e) => setTpl('required_info', e.target.value)} rows={2} style={taStyle} />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>{T('Terms', 'Términos')}</label>
                <textarea value={tplForm.terms} onChange={(e) => setTpl('terms', e.target.value)} rows={2} style={taStyle} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button onClick={saveTemplate} style={btn(C.accent)}>
                  {editingTplId ? T('Update template', 'Actualizar plantilla') : T('Save template', 'Guardar plantilla')}
                </button>
                {editingTplId && (
                  <button onClick={() => { setTplForm(emptyTemplate()); setEditingTplId(''); }} style={ghostBtn}>
                    {T('Cancel edit', 'Cancelar edición')}
                  </button>
                )}
              </div>
            </div>

            {/* Template list */}
            <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 32 }}>
              {T('Saved templates', 'Plantillas guardadas')} ({templates.length})
            </h3>
            {templates.length === 0 && <p style={{ color: C.sec, fontSize: 14 }}>{T('No templates yet.', 'Aún no hay plantillas.')}</p>}
            <div style={{ display: 'grid', gap: 12 }}>
              {templates.map((t) => (
                <div key={t.id} style={{ ...cardStyle, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name || T('(untitled)', '(sin título)')}</div>
                      <div style={{ color: C.sec, fontSize: 13, marginTop: 2 }}>{t.category || '—'} · {t.pricing_model || '—'}</div>
                    </div>
                  </div>
                  {t.description && <p style={{ color: C.sec2, fontSize: 13, marginTop: 8, marginBottom: 0 }}>{t.description}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button onClick={() => editTemplate(t)} style={ghostBtn}>{T('Edit', 'Editar')}</button>
                    <button onClick={() => duplicateTemplate(t)} style={ghostBtn}>{T('Duplicate', 'Duplicar')}</button>
                    <button onClick={() => deleteTemplate(t.id)} style={{ ...ghostBtn, color: C.red, borderColor: `${C.red}55` }}>{T('Delete', 'Eliminar')}</button>
                    <button onClick={() => applyTemplateInQuote(t)} style={btn(C.accent)}>{T('Use in quote', 'Usar en cotización')}</button>
                  </div>
                </div>
              ))}
            </div>
            {footerNote}
          </>
        )}

        {/* ---------------- TAB 2 ---------------- */}
        {tab === 2 && (
          <>
            <div style={cardStyle}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 0 }}>{T('Opportunity packet', 'Paquete de oportunidad')}</h2>
              <p style={{ color: C.sec, fontSize: 13, marginTop: 0 }}>
                {T('Edit the packet below (JSON). Client identity stays hidden.', 'Edite el paquete (JSON). La identidad del cliente permanece oculta.')}
              </p>
              <textarea value={packetText} onChange={(e) => setPacketText(e.target.value)} rows={7} style={{ ...taStyle, fontFamily: 'monospace', fontSize: 13 }} />

              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={selectedTplId} onChange={(e) => { setSelectedTplId(e.target.value); }} style={{ ...inputStyle, width: 'auto', minWidth: 180 }}>
                  <option value="">{T('Insert from template…', 'Insertar desde plantilla…')}</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name || '(untitled)'}</option>)}
                </select>
                <button onClick={() => insertFromTemplate(selectedTplId)} disabled={!selectedTplId} style={{ ...ghostBtn, opacity: selectedTplId ? 1 : 0.5 }}>
                  {T('Insert from template', 'Insertar desde plantilla')}
                </button>
                <button onClick={aiDraftWithAssistant} disabled={aiLoading} style={btn(aiLoading ? '#4A3D8F' : C.accent)}>
                  {aiLoading ? T('Drafting…', 'Redactando…') : T('AI Draft with NXT//LINK Assistant', 'Borrador AI con Asistente NXT//LINK')}
                </button>
                <button onClick={saveResponseAsTemplate} style={ghostBtn}>{T('Save as template', 'Guardar como plantilla')}</button>
              </div>
            </div>

            {/* AI draft banner + box */}
            {aiDraft && (
              <div style={{ marginTop: 16 }}>
                <div style={{ background: '#F59E0B18', border: `1px solid ${C.amber}`, color: C.amber, padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                  {T('DRAFT — review and approve before sending', 'BORRADOR — revise y apruebe antes de enviar')}
                </div>
                <div style={{ ...cardStyle, marginTop: 12, borderColor: `${C.amber}55` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.amber, marginBottom: 8 }}>
                    {T('AI draft (review before sending)', 'Borrador AI (revise antes de enviar)')}
                  </div>
                  <p style={{ color: C.sec2, fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{aiDraft.short_response}</p>
                  {aiDraft.attachments_needed && (
                    <p style={{ color: C.sec, fontSize: 12, marginTop: 10, marginBottom: 0 }}>
                      {T('Attachments needed:', 'Adjuntos necesarios:')} {aiDraft.attachments_needed}
                    </p>
                  )}
                  {aiProvider && <p style={{ color: C.muted, fontSize: 11, marginTop: 8, marginBottom: 0 }}>{T('Provider', 'Proveedor')}: {aiProvider}</p>}
                </div>
              </div>
            )}

            {/* Response fields */}
            <div style={{ ...cardStyle, marginTop: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 0 }}>{T('Your response', 'Su respuesta')}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>{T('Can serve location?', '¿Puede atender la ubicación?')}</label>
                  <select value={response.can_serve_location} onChange={(e) => setResp('can_serve_location', e.target.value)} style={inputStyle}>
                    <option value="yes">{T('Yes', 'Sí')}</option>
                    <option value="no">{T('No', 'No')}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{T('Available by deadline?', '¿Disponible para la fecha límite?')}</label>
                  <select value={response.available_by_deadline} onChange={(e) => setResp('available_by_deadline', e.target.value)} style={inputStyle}>
                    <option value="yes">{T('Yes', 'Sí')}</option>
                    <option value="no">{T('No', 'No')}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{T('Quote type', 'Tipo de cotización')}</label>
                  <select value={response.quote_type} onChange={(e) => setResp('quote_type', e.target.value)} style={inputStyle}>
                    <option value="estimate">{T('Estimate', 'Estimado')}</option>
                    <option value="range">{T('Range', 'Rango')}</option>
                    <option value="formal">{T('Formal', 'Formal')}</option>
                    <option value="site visit">{T('Site visit', 'Visita al sitio')}</option>
                  </select>
                </div>
                <Field label={T('Price', 'Precio')} k="price_text" />
                <Field label={T('Labor rate', 'Tarifa de mano de obra')} k="labor_rate" />
                <Field label={T('Service fee', 'Cargo por servicio')} k="service_fee" />
                <Field label={T('Travel fee', 'Cargo por viaje')} k="travel_fee" />
                <Field label={T('Parts cost', 'Costo de partes')} k="parts_cost" />
                <Field label={T('Lead time', 'Tiempo de entrega')} k="lead_time" />
                <Field label={T('Warranty', 'Garantía')} k="warranty" />
                <Field label={T('Payment terms', 'Términos de pago')} k="payment_terms" />
                <Field label={T('Expiration date', 'Fecha de expiración')} k="expiration_date" />
              </div>
              <div style={{ marginTop: 16 }}><Field label={T('Included', 'Incluido')} k="included" area /></div>
              <div style={{ marginTop: 16 }}><Field label={T('Excluded', 'Excluido')} k="excluded" area /></div>
              <div style={{ marginTop: 16 }}><Field label={T('Required next info', 'Información requerida')} k="required_next_info" area /></div>
              <div style={{ marginTop: 16 }}><Field label={T('Questions for client', 'Preguntas para el cliente')} k="questions_for_client" area /></div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                <button onClick={() => saveQuote('submitted')} style={btn(C.green)}>{T('Submit response', 'Enviar respuesta')}</button>
                <button onClick={() => saveQuote('draft')} style={ghostBtn}>{T('Save draft', 'Guardar borrador')}</button>
                {editingQuoteId && <span style={{ color: C.amber, fontSize: 12, alignSelf: 'center' }}>{T('Editing existing quote', 'Editando cotización existente')}</span>}
              </div>
            </div>
            {footerNote}
          </>
        )}

        {/* ---------------- TAB 3 ---------------- */}
        {tab === 3 && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {STATUS_FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', background: filter === f ? C.accent : C.card, color: filter === f ? '#fff' : C.sec2, border: `1px solid ${filter === f ? C.accent : C.border}`, borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {T(f, { Draft: 'Borrador', Submitted: 'Enviadas', Accepted: 'Aceptadas', Declined: 'Rechazadas', Expired: 'Expiradas', Templates: 'Plantillas' }[f] || f)}
                </button>
              ))}
            </div>

            {filter === 'Templates' ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {templates.length === 0 && <p style={{ color: C.sec, fontSize: 14 }}>{T('No templates yet.', 'Aún no hay plantillas.')}</p>}
                {templates.map((t) => (
                  <div key={t.id} style={{ ...cardStyle, padding: 18 }}>
                    <div style={{ fontWeight: 700 }}>{t.name || '(untitled)'}</div>
                    <div style={{ color: C.sec, fontSize: 13 }}>{t.category || '—'}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => applyTemplateInQuote(t)} style={btn(C.accent)}>{T('Use in quote', 'Usar en cotización')}</button>
                      <button onClick={() => deleteTemplate(t.id)} style={{ ...ghostBtn, color: C.red, borderColor: `${C.red}55` }}>{T('Delete', 'Eliminar')}</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {quotes.filter((q) => q.status === filter.toLowerCase()).length === 0 && (
                  <p style={{ color: C.sec, fontSize: 14 }}>{T('No quotes in this status.', 'No hay cotizaciones en este estado.')}</p>
                )}
                {quotes.filter((q) => q.status === filter.toLowerCase()).map((q) => (
                  <div key={q.id} style={{ ...cardStyle, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{q.client_desc}</div>
                        <div style={{ color: C.sec, fontSize: 12, marginTop: 2 }}>
                          {q.opportunity_ref} · {q.category || '—'}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: statusColor(q.status), background: `${statusColor(q.status)}1A`, border: `1px solid ${statusColor(q.status)}55`, padding: '4px 10px', borderRadius: 999 }}>
                        {q.status}
                      </span>
                    </div>
                    <div style={{ color: C.sec2, fontSize: 13, marginTop: 10 }}>
                      <div>{T('Amount', 'Monto')}: {q.response.price_text || '—'}</div>
                      <div>{T('Created', 'Creada')}: {new Date(q.created_at).toLocaleString()}</div>
                      <div>{T('Submitted', 'Enviada')}: {q.submitted_at ? new Date(q.submitted_at).toLocaleString() : '—'}</div>
                      <div>{T('Expiration', 'Expiración')}: {q.response.expiration_date || '—'}</div>
                    </div>

                    {expandedId === q.id && (
                      <div style={{ marginTop: 12, padding: 14, background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.sec2 }}>
                        <div>{T('Quote type', 'Tipo')}: {q.response.quote_type}</div>
                        <div>{T('Included', 'Incluido')}: {q.response.included || '—'}</div>
                        <div>{T('Excluded', 'Excluido')}: {q.response.excluded || '—'}</div>
                        <div>{T('Lead time', 'Tiempo de entrega')}: {q.response.lead_time || '—'}</div>
                        <div>{T('Payment terms', 'Términos de pago')}: {q.response.payment_terms || '—'}</div>
                        <div>{T('Required next info', 'Información requerida')}: {q.response.required_next_info || '—'}</div>
                        {q.notes && <div style={{ marginTop: 8 }}>{T('Notes', 'Notas')}: {q.notes}</div>}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                      <button onClick={() => setExpandedId(expandedId === q.id ? '' : q.id)} style={ghostBtn}>
                        {expandedId === q.id ? T('Hide', 'Ocultar') : T('View', 'Ver')}
                      </button>
                      <button onClick={() => editQuoteDraft(q)} style={ghostBtn}>{T('Edit draft', 'Editar borrador')}</button>
                      <button onClick={() => duplicateQuote(q)} style={ghostBtn}>{T('Duplicate', 'Duplicar')}</button>
                      <button onClick={() => quoteAsTemplate(q)} style={ghostBtn}>{T('Use as template', 'Usar como plantilla')}</button>
                      <button onClick={stub} style={ghostBtn}>{T('Download PDF', 'Descargar PDF')}</button>
                      <button onClick={stub} style={ghostBtn}>{T('Submit revised', 'Enviar revisada')}</button>
                      <button onClick={() => deleteQuote(q.id)} style={{ ...ghostBtn, color: C.red, borderColor: `${C.red}55` }}>{T('Delete', 'Eliminar')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {footerNote}
          </>
        )}

        {/* ---------------- TAB 4 ---------------- */}
        {tab === 4 && (
          <>
            <div style={cardStyle}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 0 }}>
                {T('Terms & Agreement', 'Términos y Acuerdo')}
              </h2>
              <p style={{ color: C.sec, fontSize: 13, marginTop: 0 }}>
                {T(
                  'Draft quote terms and the NXT//LINK introduction / commission agreement with AI. Review before sending.',
                  'Redacte los términos de la cotización y el acuerdo de introducción / comisión de NXT//LINK con AI. Revise antes de enviar.',
                )}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>{T('Your company name', 'Nombre de su empresa')}</label>
                  <input value={termsVendorName} onChange={(e) => setTermsVendorName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{T('Warranty (months)', 'Garantía (meses)')}</label>
                  <input
                    type="number"
                    value={termsWarrantyMonths}
                    onChange={(e) => setTermsWarrantyMonths(Number(e.target.value))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: C.sec2, cursor: 'pointer' }}>
                  <input type="checkbox" checked={termsEmergency} onChange={(e) => setTermsEmergency(e.target.checked)} style={{ accentColor: C.accent }} />
                  {T('Offer 24/7 emergency service', 'Ofrecer servicio de emergencia 24/7')}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: C.sec2, cursor: 'pointer' }}>
                  <input type="checkbox" checked={termsNda} onChange={(e) => setTermsNda(e.target.checked)} style={{ accentColor: C.accent }} />
                  {T('NDA / MNDA in place', 'NDA / MNDA establecido')}
                </label>
              </div>

              <div style={{ marginTop: 20 }}>
                <button onClick={aiDraftTerms} disabled={termsLoading} style={btn(termsLoading ? '#4A3D8F' : C.accent)}>
                  {termsLoading
                    ? T('✦ Drafting…', '✦ Redactando…')
                    : T('✦ AI: Draft Terms & Agreement', '✦ AI: Redactar Términos y Acuerdo')}
                </button>
              </div>
            </div>

            {/* Terms draft output */}
            {termsDraft && (
              <div style={{ marginTop: 16 }}>
                <div style={{ background: '#F59E0B18', border: `1px solid ${C.amber}`, color: C.amber, padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                  {T('DRAFT — review before sending', 'BORRADOR — revise antes de enviar')}
                </div>
                {termsProvider && (
                  <p style={{ color: C.muted, fontSize: 11, margin: '8px 0 0' }}>
                    {T('Provider', 'Proveedor')}: {termsProvider}
                  </p>
                )}

                <div style={{ ...cardStyle, marginTop: 12, borderColor: `${C.amber}55` }}>
                  {([
                    ['quote_validity', T('Quote validity', 'Validez de la cotización')],
                    ['payment_terms', T('Payment terms', 'Términos de pago')],
                    ['warranty', T('Warranty', 'Garantía')],
                    ['exclusions', T('Exclusions', 'Exclusiones')],
                    ['lead_time', T('Lead time', 'Tiempo de entrega')],
                    ['emergency_service', T('Emergency service', 'Servicio de emergencia')],
                    ['liability_insurance', T('Insurance & liability', 'Seguro y responsabilidad')],
                    ['confidentiality', T('Confidentiality', 'Confidencialidad')],
                    ['introduction_agreement', T('NXT//LINK introduction agreement', 'Acuerdo de introducción NXT//LINK')],
                    ['terms_and_conditions', T('Terms & conditions', 'Términos y condiciones')],
                  ] as [keyof TermsDraft, string][]).map(([k, label]) => (
                    <div key={k} style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>{label}</label>
                      <textarea
                        value={termsDraft[k]}
                        onChange={(e) => setTermsField(k, e.target.value)}
                        rows={3}
                        style={taStyle}
                      />
                    </div>
                  ))}
                </div>

                {termsDraft.disclaimer && (
                  <div style={{ background: '#F59E0B18', border: `1px solid ${C.amber}`, color: C.amber, padding: '14px 18px', borderRadius: 12, fontSize: 13, lineHeight: 1.6, marginTop: 16, whiteSpace: 'pre-wrap' }}>
                    {termsDraft.disclaimer}
                  </div>
                )}
              </div>
            )}
            {footerNote}
          </>
        )}
      </div>
    </div>
  );
}
