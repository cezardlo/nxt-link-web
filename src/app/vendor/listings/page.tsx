'use client';

// Vendor Seller Central: create/edit product & service listings with
// structured fields, AI fill from a document or pasted text, image upload,
// and draft→publish control. Everything is scoped to the signed-in vendor.

import { useCallback, useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

type Kind = 'product' | 'service';
interface Listing {
  id: string; public_ref: string; name: string; category: string; overview: string | null;
  best_for: string[]; industries: string[]; image_paths: string[]; status: string;
  use_cases?: string[]; specs?: Record<string, string>; availability?: string[]; lead_time?: string | null;
  service_areas?: string[]; response_time?: string | null; process?: string[]; certifications?: string[];
  pricing_model?: string | null; emergency_available?: boolean;
  pilot?: Record<string, unknown> | null; implementation?: Record<string, unknown> | null;
  warranty_support?: Record<string, unknown> | null; pricing?: Record<string, unknown> | null;
}

// Editor form state: everything as strings/booleans, converted on save.
interface Form {
  name: string; category: string; overview: string; best_for: string; industries: string;
  use_cases: string; specs: string; buy: boolean; rent: boolean; lease: boolean; lead_time: string;
  service_areas: string; response_time: string; process: string; certifications: string;
  pricing_model: string; emergency_available: boolean;
  pilot_available: boolean; pilot_duration: string; pilot_cost: string; pilot_scope: string;
  impl_requirements: string; impl_timeline: string; impl_training: string;
  ws_warranty: string; ws_channels: string; ws_sla: string;
  pr_model: string; pr_range: string; pr_notes: string;
}
const EMPTY: Form = {
  name: '', category: '', overview: '', best_for: '', industries: '',
  use_cases: '', specs: '', buy: false, rent: false, lease: false, lead_time: '',
  service_areas: '', response_time: '', process: '', certifications: '',
  pricing_model: '', emergency_available: false,
  pilot_available: false, pilot_duration: '', pilot_cost: '', pilot_scope: '',
  impl_requirements: '', impl_timeline: '', impl_training: '',
  ws_warranty: '', ws_channels: '', ws_sla: '',
  pr_model: '', pr_range: '', pr_notes: '',
};

const csv = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const join = (v: unknown) => (Array.isArray(v) ? v.join(', ') : '');
const joinL = (v: unknown) => (Array.isArray(v) ? v.join('\n') : '');
const gs = (o: Record<string, unknown> | null | undefined, k: string) => (o && typeof o[k] === 'string' ? (o[k] as string) : '');

function toBody(kind: Kind, f: Form): Record<string, unknown> {
  const specsObj: Record<string, string> = {};
  for (const ln of lines(f.specs)) {
    const i = ln.indexOf(':');
    if (i > 0) specsObj[ln.slice(0, i).trim()] = ln.slice(i + 1).trim();
  }
  const base: Record<string, unknown> = {
    name: f.name, category: f.category, overview: f.overview,
    best_for: csv(f.best_for), industries: csv(f.industries),
    pilot: { available: f.pilot_available, duration: f.pilot_duration, cost: f.pilot_cost, scope: f.pilot_scope },
    implementation: { requirements: csv(f.impl_requirements), typical_timeline: f.impl_timeline, training: f.impl_training },
    warranty_support: { warranty: f.ws_warranty, support_channels: csv(f.ws_channels), sla: f.ws_sla },
    pricing: { model: f.pr_model, range: f.pr_range, buy: f.buy, rent: f.rent, lease: f.lease, notes: f.pr_notes },
  };
  if (kind === 'product') {
    return { ...base, use_cases: csv(f.use_cases), specs: specsObj, availability: ['buy', 'rent', 'lease'].filter((o) => f[o as 'buy']), lead_time: f.lead_time };
  }
  return { ...base, service_areas: csv(f.service_areas), response_time: f.response_time, process: lines(f.process), certifications: csv(f.certifications), pricing_model: f.pricing_model, emergency_available: f.emergency_available };
}

function fromListing(l: Listing): Form {
  return {
    ...EMPTY,
    name: l.name || '', category: l.category || '', overview: l.overview || '',
    best_for: join(l.best_for), industries: join(l.industries),
    use_cases: join(l.use_cases),
    specs: l.specs ? Object.entries(l.specs).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
    buy: !!l.availability?.includes('buy'), rent: !!l.availability?.includes('rent'), lease: !!l.availability?.includes('lease'),
    lead_time: l.lead_time || '',
    service_areas: join(l.service_areas), response_time: l.response_time || '',
    process: joinL(l.process), certifications: join(l.certifications),
    pricing_model: l.pricing_model || '', emergency_available: !!l.emergency_available,
    pilot_available: Boolean(l.pilot?.available), pilot_duration: gs(l.pilot, 'duration'), pilot_cost: gs(l.pilot, 'cost'), pilot_scope: gs(l.pilot, 'scope'),
    impl_requirements: join(l.implementation?.requirements), impl_timeline: gs(l.implementation, 'typical_timeline'), impl_training: gs(l.implementation, 'training'),
    ws_warranty: gs(l.warranty_support, 'warranty'), ws_channels: join(l.warranty_support?.support_channels), ws_sla: gs(l.warranty_support, 'sla'),
    pr_model: gs(l.pricing, 'model'), pr_range: gs(l.pricing, 'range'), pr_notes: gs(l.pricing, 'notes'),
  };
}

export default function VendorListingsPage() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [products, setProducts] = useState<Listing[]>([]);
  const [services, setServices] = useState<Listing[]>([]);
  const [msg, setMsg] = useState('');

  // Editor
  const [editing, setEditing] = useState<{ kind: Kind; id: string | null } | null>(null);
  const [f, setF] = useState<Form>(EMPTY);
  const [docId, setDocId] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/vendor/listings');
    if (res.status === 401) { setSignedIn(false); setChecking(false); return; }
    const data = await res.json();
    setProducts(data.products || []); setServices(data.services || []);
    setSignedIn(true); setChecking(false);
  }, []);

  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    sb.auth.getSession().then(({ data }) => { if (data.session) load(); else setChecking(false); });
  }, [load]);

  function openNew(kind: Kind) { setEditing({ kind, id: null }); setF(EMPTY); setDocId(null); setAiSummary(''); setPasteText(''); setMsg(''); }
  function openEdit(kind: Kind, l: Listing) { setEditing({ kind, id: l.id }); setF(fromListing(l)); setDocId(null); setAiSummary(''); setPasteText(''); setMsg(''); }

  function mergeDraft(draft: Record<string, unknown>) {
    const d = draft as Partial<Listing> & Record<string, unknown>;
    const m = fromListing({ ...(d as unknown as Listing), id: '', public_ref: '', image_paths: [], status: 'draft' });
    setF((prev) => {
      const next = { ...prev };
      (Object.keys(m) as Array<keyof Form>).forEach((k) => {
        const v = m[k];
        if (typeof v === 'boolean') { if (v) (next[k] as boolean) = true; }
        else if (v && !prev[k]) (next[k] as string) = v;
      });
      return next;
    });
  }

  async function aiFill(file?: File) {
    if (!editing) return;
    setAiBusy(true); setMsg(''); setAiSummary('');
    try {
      let res: Response;
      if (file) {
        const fd = new FormData(); fd.append('kind', editing.kind); fd.append('file', file);
        res = await fetch('/api/vendor/listings/extract', { method: 'POST', body: fd });
      } else {
        res = await fetch('/api/vendor/listings/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: editing.kind, text: pasteText }) });
      }
      const data = await res.json();
      if (data.ok) { mergeDraft(data.draft || {}); setAiSummary(data.summary || ''); if (data.document_id) setDocId(data.document_id); }
      else setMsg(data.message || 'Could not extract');
    } catch { setMsg('Could not extract'); }
    setAiBusy(false);
  }

  async function save(publish?: boolean) {
    if (!editing) return;
    if (!f.name.trim()) { setMsg('Give the listing a name first.'); return; }
    setSaving(true); setMsg('');
    const body: Record<string, unknown> = { ...toBody(editing.kind, f), kind: editing.kind };
    if (editing.id) body.id = editing.id;
    else { body.ai_extracted = Boolean(docId); if (docId) body.attach_document_id = docId; }
    if (publish) body.status = 'published';
    const res = await fetch('/api/vendor/listings', {
      method: editing.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.ok) { setMsg(data.message || 'Could not save'); return; }
    if (!editing.id && !publish) setEditing({ kind: editing.kind, id: data.listing.id });
    else if (publish) setEditing(null);
    setMsg(publish ? 'Published — it is now live in the marketplace.' : 'Saved as draft.');
    load();
  }

  async function setStatus(kind: Kind, id: string, status: 'published' | 'draft') {
    await fetch('/api/vendor/listings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id, status }) });
    load();
  }
  async function archive(kind: Kind, id: string) {
    await fetch(`/api/vendor/listings?kind=${kind}&id=${id}`, { method: 'DELETE' });
    load();
  }
  async function uploadImage(file: File) {
    if (!editing?.id) { setMsg('Save the listing first, then add photos.'); return; }
    const fd = new FormData(); fd.append('kind', editing.kind); fd.append('id', editing.id); fd.append('file', file);
    const res = await fetch('/api/vendor/listings/media', { method: 'POST', body: fd });
    const data = await res.json();
    setMsg(data.ok ? 'Photo added.' : (data.message || 'Upload failed'));
    load();
  }

  if (checking) return <Shell><div className="sc-empty">Loading…</div></Shell>;
  if (!signedIn) {
    return <Shell><div className="sc-gate"><h1>Sign in to manage your listings</h1><a className="sc-btn" href="/vendor-login">Go to sign in →</a></div></Shell>;
  }

  const T = (k: keyof Form, label: string, ph = '', rows = 0) => (
    <label className="sc-field"><span>{label}</span>
      {rows
        ? <textarea rows={rows} placeholder={ph} value={f[k] as string} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        : <input placeholder={ph} value={f[k] as string} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
    </label>
  );
  const C = (k: keyof Form, label: string) => (
    <label className="sc-cb"><input type="checkbox" checked={f[k] as boolean} onChange={(e) => setF({ ...f, [k]: e.target.checked })} /> {label}</label>
  );

  return (
    <Shell>
      <div className="sc-head">
        <div>
          <h1>Your listings</h1>
          <p className="sc-sub">What buyers see in the marketplace. Drafts are private until you publish.</p>
        </div>
        <div className="sc-headr">
          <a className="sc-link" href="/vendor/leads">Leads inbox</a>
          <a className="sc-link" href="/vendor/portal">Company profile</a>
        </div>
      </div>
      {msg && <div className="sc-msg">{msg}</div>}

      {!editing && (
        <>
          {([['product', 'Products', products], ['service', 'Services', services]] as Array<[Kind, string, Listing[]]>).map(([kind, label, rows]) => (
            <section className="sc-card" key={kind}>
              <div className="sc-cardhead">
                <div className="sc-lbl">{label} ({rows.length})</div>
                <button className="sc-btn sm" onClick={() => openNew(kind)}>+ New {kind}</button>
              </div>
              {rows.length === 0 ? <p className="sc-hint">No {label.toLowerCase()} yet. Create one — AI can draft it from a spec sheet.</p> : (
                <ul className="sc-list">
                  {rows.map((l) => (
                    <li key={l.id}>
                      <span className={'sc-status ' + l.status}>{l.status}</span>
                      <b>{l.name}</b>
                      <small>{l.category || 'No category'}</small>
                      <span className="sc-spacer" />
                      {l.status === 'published' && <a href={`/marketplace/${kind}/${l.id}`} target="_blank" rel="noreferrer">View live</a>}
                      <button onClick={() => openEdit(kind, l)}>Edit</button>
                      {l.status === 'published'
                        ? <button onClick={() => setStatus(kind, l.id, 'draft')}>Unpublish</button>
                        : <button className="sc-pub" onClick={() => setStatus(kind, l.id, 'published')}>Publish</button>}
                      <button className="sc-del" onClick={() => archive(kind, l.id)}>Archive</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </>
      )}

      {editing && (
        <section className="sc-card">
          <div className="sc-cardhead">
            <div className="sc-lbl">{editing.id ? 'Edit' : 'New'} {editing.kind}</div>
            <button className="sc-link" onClick={() => { setEditing(null); setMsg(''); }}>← Back to listings</button>
          </div>

          <div className="sc-ai">
            <div className="sc-lbl">AI fill (optional)</div>
            <p className="sc-hint">Upload a spec sheet / brochure or paste text — AI drafts the fields below. It never invents: anything missing stays empty. You review before publishing.</p>
            <div className="sc-airow">
              <label className="sc-btn sm ghost">
                {aiBusy ? 'Reading…' : 'Upload document'}
                <input type="file" accept=".pdf,.txt" style={{ display: 'none' }} disabled={aiBusy} onChange={(e) => { const file = e.target.files?.[0]; if (file) aiFill(file); e.target.value = ''; }} />
              </label>
              <textarea rows={2} placeholder="…or paste product/service text here" value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
              <button className="sc-btn sm" disabled={aiBusy || pasteText.trim().length < 40} onClick={() => aiFill()}>{aiBusy ? 'Reading…' : 'Draft from text'}</button>
            </div>
            {aiSummary && <div className="sc-aisum">{aiSummary}</div>}
          </div>

          <div className="sc-grid">
            {T('name', `${editing.kind === 'product' ? 'Product' : 'Service'} name *`)}
            {T('category', 'Category', editing.kind === 'product' ? 'e.g. Forklifts, WMS, Robotics' : 'e.g. Electrical service, Pest control')}
          </div>
          {T('overview', 'Description', 'What it is, what problem it solves, why it is different.', 4)}
          <div className="sc-grid">
            {T('best_for', 'Best for (comma-separated)', 'e.g. High-volume DCs, Cold storage')}
            {T('industries', 'Industries served (comma-separated)', 'e.g. Warehousing & 3PL, Manufacturing')}
          </div>

          {editing.kind === 'product' ? (
            <>
              <div className="sc-grid">
                {T('use_cases', 'Use cases (comma-separated)')}
                {T('lead_time', 'Lead time', 'e.g. 2-4 weeks')}
              </div>
              {T('specs', 'Specifications (one per line, "Name: value")', 'Capacity: 5,000 lb\nPower: Electric 48V', 4)}
              <div className="sc-cbrow"><span className="sc-lblsm">Availability:</span>{C('buy', 'Buy')}{C('rent', 'Rent')}{C('lease', 'Lease')}</div>
            </>
          ) : (
            <>
              <div className="sc-grid">
                {T('service_areas', 'Service areas (comma-separated)', 'El Paso, Juárez, Cross-border')}
                {T('response_time', 'Response time', 'e.g. Same day, 24-48 hours')}
              </div>
              {T('process', 'How it works (one step per line)', 'Site visit and assessment\nWritten quote\nScheduled service', 4)}
              <div className="sc-grid">
                {T('certifications', 'Certifications / licenses (comma-separated)')}
                {T('pricing_model', 'Pricing model', 'e.g. Monthly contract, Per visit')}
              </div>
              <div className="sc-cbrow">{C('emergency_available', '24/7 emergency service available')}</div>
            </>
          )}

          <details className="sc-block"><summary>Pilot / demo</summary>
            <div className="sc-cbrow">{C('pilot_available', 'Pilot or demo available')}</div>
            <div className="sc-grid3">{T('pilot_duration', 'Duration', 'e.g. 30 days')}{T('pilot_cost', 'Cost', 'e.g. Free, $2,500')}{T('pilot_scope', 'Scope', 'What the pilot covers')}</div>
          </details>
          <details className="sc-block"><summary>Implementation</summary>
            <div className="sc-grid3">{T('impl_requirements', 'Requirements (comma-separated)', 'WiFi coverage, Dock access')}{T('impl_timeline', 'Typical timeline', 'e.g. 2 weeks')}{T('impl_training', 'Training included', 'e.g. 2-day on-site training')}</div>
          </details>
          <details className="sc-block"><summary>Warranty &amp; support</summary>
            <div className="sc-grid3">{T('ws_warranty', 'Warranty', 'e.g. 2 years parts & labor')}{T('ws_channels', 'Support channels (comma-separated)', 'Phone, On-site, Email')}{T('ws_sla', 'SLA', 'e.g. 4-hour response')}</div>
          </details>
          <details className="sc-block"><summary>Pricing</summary>
            <div className="sc-grid3">{T('pr_model', 'Model', 'e.g. Per unit, Subscription')}{T('pr_range', 'Range shown to buyers', 'e.g. $15k-$40k — or leave empty for "Request quote"')}{T('pr_notes', 'Notes', 'Financing, volume discounts…')}</div>
          </details>

          {editing.id && (
            <div className="sc-photos">
              <span className="sc-lblsm">Photos:</span>
              <label className="sc-btn sm ghost">Add photo (PNG/JPG/WebP)
                <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); e.target.value = ''; }} />
              </label>
            </div>
          )}

          <div className="sc-actions">
            <button className="sc-btn ghost" disabled={saving} onClick={() => save(false)}>{saving ? 'Saving…' : 'Save draft'}</button>
            <button className="sc-btn" disabled={saving} onClick={() => save(true)}>{saving ? 'Saving…' : 'Save & publish'}</button>
          </div>
        </section>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sc">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="sc-nav">
        <a className="sc-brand" href="/"><b>NXT<i>//</i>LINK</b><span>Seller Central</span></a>
        <a className="sc-link" href="/marketplace">View marketplace</a>
      </nav>
      <main className="sc-wrap">{children}</main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.sc{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.sc *{box-sizing:border-box;}
.sc-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.85);backdrop-filter:blur(20px);z-index:20;}
.sc-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.sc-brand b{font-size:17px;}.sc-brand i{color:#A78BFA;font-style:normal;}
.sc-brand span{color:#8080A0;font-size:13px;}
.sc-wrap{max-width:860px;margin:0 auto;padding:36px 20px 100px;}
.sc-empty{text-align:center;color:#8080A0;padding:80px 0;}
.sc-gate{max-width:420px;margin:14vh auto;text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:36px;}
.sc-gate h1{font-size:20px;margin-bottom:18px;}
.sc-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:18px;}
.sc-head h1{font-size:28px;font-weight:800;letter-spacing:-.02em;}
.sc-sub{color:#8080A0;font-size:14px;margin-top:6px;}
.sc-headr{display:flex;gap:14px;}
.sc-link{font-family:inherit;background:none;border:none;color:#A78BFA;font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:none;padding:0;}
.sc-msg{background:rgba(124,92,252,.12);border:1px solid rgba(124,92,252,.25);color:#C4B5FD;padding:11px 15px;border-radius:12px;font-size:13.5px;margin-bottom:16px;}
.sc-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:24px;margin-bottom:20px;}
.sc-cardhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.sc-lbl{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#A78BFA;}
.sc-lblsm{font-size:12.5px;color:#8080A0;}
.sc-hint{color:#8080A0;font-size:13.5px;line-height:1.5;margin:0 0 10px;}
.sc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.sc-list li{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:#111118;font-size:14px;flex-wrap:wrap;}
.sc-list b{font-size:14.5px;}
.sc-list small{color:#8080A0;}
.sc-spacer{flex:1;}
.sc-list a{color:#A78BFA;font-size:12.5px;text-decoration:none;}
.sc-list button{font-family:inherit;background:none;border:1px solid rgba(255,255,255,.12);color:#C0C0D0;font-size:12.5px;border-radius:8px;padding:6px 11px;cursor:pointer;}
.sc-list button:hover{border-color:#A78BFA;}
.sc-list button.sc-pub{border-color:rgba(52,211,153,.4);color:#34D399;}
.sc-list button.sc-del{color:#8080A0;}
.sc-list button.sc-del:hover{color:#FCA5A5;border-color:rgba(252,165,165,.4);}
.sc-status{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;border-radius:99px;}
.sc-status.published{background:rgba(52,211,153,.12);color:#34D399;}
.sc-status.draft{background:rgba(251,191,36,.1);color:#FBBF24;}
.sc-btn{font-family:inherit;font-size:14px;font-weight:700;padding:12px 20px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;}
.sc-btn:hover{background:#6344DF;}.sc-btn:disabled{opacity:.55;}
.sc-btn.sm{padding:9px 14px;font-size:13px;}
.sc-btn.ghost{background:none;border:1px solid rgba(124,92,252,.5);color:#C4B5FD;}
.sc-ai{border:1.5px dashed rgba(124,92,252,.35);background:rgba(124,92,252,.06);border-radius:14px;padding:16px;margin-bottom:20px;}
.sc-airow{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:start;}
@media(max-width:640px){.sc-airow{grid-template-columns:1fr;}}
.sc-airow textarea{font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;resize:vertical;}
.sc-aisum{margin-top:12px;font-size:13px;color:#C4B5FD;line-height:1.5;}
.sc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
.sc-grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:12px;}
@media(max-width:560px){.sc-grid{grid-template-columns:1fr;}}
.sc-field{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:500;color:#C0C0D0;margin-bottom:2px;}
.sc-field input,.sc-field textarea{font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;resize:vertical;width:100%;}
.sc-field input:focus,.sc-field textarea:focus{border-color:#7C5CFC;}
.sc-cbrow{display:flex;gap:18px;align-items:center;margin:10px 0 14px;flex-wrap:wrap;}
.sc-cb{display:flex;align-items:center;gap:7px;font-size:13.5px;color:#C0C0D0;cursor:pointer;}
.sc-block{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 16px;margin-bottom:12px;background:#111118;}
.sc-block summary{cursor:pointer;font-size:13.5px;font-weight:600;color:#C0C0D0;}
.sc-photos{display:flex;align-items:center;gap:12px;margin:16px 0;}
.sc-actions{display:flex;gap:12px;margin-top:20px;}
`;
