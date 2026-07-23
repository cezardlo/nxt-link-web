'use client';

// Vendor Seller Central: create/edit product & service listings with
// structured fields, AI fill from a document or pasted text, image upload,
// and draft→publish control. Everything is scoped to the signed-in vendor.

import { useCallback, useEffect, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { scoreListing } from '@/lib/marketplace/completeness';
import VendorNav from '@/components/VendorNav';

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): visual/CSS
// only — every handler and state above is unchanged.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-vlistings',
  display: 'swap',
});

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

  // Review-before-publish
  const [reviewFor, setReviewFor] = useState<{ kind: Kind; listing: Listing } | null>(null);
  const [accOk, setAccOk] = useState(false);
  const [pubBusy, setPubBusy] = useState(false);
  const [pubErr, setPubErr] = useState('');
  const [emailVerified, setEmailVerified] = useState(true);
  const [extras, setExtras] = useState<{ documents: Array<{ id: string; title: string | null; file_name: string }>; case_studies: Array<{ id: string; title: string }> } | null>(null);

  function openReview(kind: Kind, listing: Listing) {
    setReviewFor({ kind, listing }); setAccOk(false); setPubErr(''); setExtras(null);
    fetch(`/api/vendor/listings/extras?kind=${kind}&id=${listing.id}`)
      .then((r) => r.json()).then((d) => { if (d.ok) setExtras({ documents: d.documents, case_studies: d.case_studies }); })
      .catch(() => {});
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/vendor/listings');
    if (res.status === 401) { setSignedIn(false); setChecking(false); return; }
    const data = await res.json();
    setProducts(data.products || []); setServices(data.services || []);
    setSignedIn(true); setChecking(false);
    fetch('/api/auth/me').then((r) => r.json()).then((me) => {
      if (me?.signed_in) setEmailVerified(Boolean(me.email_verified));
    }).catch(() => {});
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

  async function save(): Promise<Listing | null> {
    if (!editing) return null;
    if (!f.name.trim()) { setMsg('Give the listing a name first.'); return null; }
    setSaving(true); setMsg('');
    const body: Record<string, unknown> = { ...toBody(editing.kind, f), kind: editing.kind };
    if (editing.id) body.id = editing.id;
    else { body.ai_extracted = Boolean(docId); if (docId) body.attach_document_id = docId; }
    const res = await fetch('/api/vendor/listings', {
      method: editing.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.ok) { setMsg(data.message || 'Could not save'); return null; }
    if (!editing.id) setEditing({ kind: editing.kind, id: data.listing.id });
    setMsg('Saved. Nothing is public until you review and publish.');
    load();
    return data.listing as Listing;
  }

  async function reviewAndPublish() {
    const saved = await save();
    if (saved && editing) openReview(editing.kind, saved);
  }

  async function publishNow() {
    if (!reviewFor || !accOk) return;
    setPubBusy(true); setPubErr('');
    const res = await fetch('/api/vendor/listings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: reviewFor.kind, id: reviewFor.listing.id, status: 'published', accuracy_confirmed: true }),
    });
    const data = await res.json();
    setPubBusy(false);
    if (!data.ok) { setPubErr(data.message || 'Could not publish'); return; }
    setReviewFor(null); setAccOk(false); setEditing(null);
    setMsg('Published — it is now live in the marketplace.');
    load();
  }

  async function setStatus(kind: Kind, id: string, status: 'unpublished' | 'draft' | 'ready') {
    await fetch('/api/vendor/listings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id, status }) });
    load();
  }
  async function archive(kind: Kind, id: string) {
    if (!confirm('Archive this listing? It will come down from the marketplace immediately.')) return;
    await fetch(`/api/vendor/listings?kind=${kind}&id=${id}`, { method: 'DELETE' });
    load();
  }
  // Reorder within a kind (up/down — reliable on mobile, unlike drag). Persists
  // a sequential sort_order so both this page and the public storefront match.
  async function move(kind: Kind, idx: number, dir: 'up' | 'down') {
    const cur = kind === 'product' ? products : services;
    const j = dir === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= cur.length) return;
    const rows = [...cur];
    [rows[idx], rows[j]] = [rows[j], rows[idx]];
    if (kind === 'product') setProducts(rows); else setServices(rows);
    await Promise.all(rows.map((l, i) => fetch('/api/vendor/listings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id: l.id, sort_order: i }),
    })));
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
      {!emailVerified && (
        <div className="sc-warn">
          Your email is not verified yet — you can build and save listings, but publishing is
          locked until you click the confirmation link we emailed you.
        </div>
      )}
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
                  {rows.map((l, i) => {
                    const score = scoreListing(kind, l as unknown as Record<string, unknown>);
                    return (
                    <li key={l.id}>
                      <div className="sc-rowtop">
                        {rows.length > 1 && (
                          <span className="sc-reorder">
                            <button aria-label="Move up" disabled={i === 0} onClick={() => move(kind, i, 'up')}>▲</button>
                            <button aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(kind, i, 'down')}>▼</button>
                          </span>
                        )}
                        <span className={'sc-status ' + l.status}>{l.status}</span>
                        <b>{l.name}</b>
                        <small>{l.category || 'No category'}</small>
                        <span className="sc-spacer" />
                        {l.status === 'published' && <a href={`/marketplace/${kind}/${l.id}`} target="_blank" rel="noreferrer">View live</a>}
                        <button onClick={() => openEdit(kind, l)}>Edit</button>
                        {l.status === 'published'
                          ? <button onClick={() => setStatus(kind, l.id, 'unpublished')}>Unpublish</button>
                          : <button className="sc-pub" onClick={() => openReview(kind, l)}>Review &amp; publish</button>}
                        <button className="sc-del" onClick={() => archive(kind, l.id)}>Archive</button>
                      </div>
                      {/* Completeness meter — complete listings rank higher & win more quotes */}
                      <div className="sc-meter" title={score.missing.join(' · ')}>
                        <div className="sc-meterbar"><div className={'sc-meterfill' + (score.percent >= 80 ? ' good' : score.percent >= 50 ? ' mid' : ' low')} style={{ width: `${score.percent}%` }} /></div>
                        <span className="sc-meterpct">{score.percent}% complete</span>
                        {score.missing.length > 0 && score.percent < 100 && (
                          <span className="sc-meterhint">Next: {score.missing.slice(0, 2).join(' · ')}</span>
                        )}
                      </div>
                    </li>
                    );
                  })}
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
            <button className="sc-btn ghost" disabled={saving} onClick={() => save()}>{saving ? 'Saving…' : 'Save draft'}</button>
            <button className="sc-btn" disabled={saving} onClick={reviewAndPublish}>{saving ? 'Saving…' : 'Review & publish'}</button>
          </div>
        </section>
      )}

      {reviewFor && (
        <div className="sc-modal" onClick={() => setReviewFor(null)}>
          <div className="sc-modal-in" onClick={(e) => e.stopPropagation()}>
            <div className="sc-lbl">Review before publishing</div>
            <p className="sc-hint">This is exactly what buyers will see. Check every line — you are responsible for its accuracy.</p>

            <div className="sc-prev-card">
              {(() => {
                const l = reviewFor.listing;
                const img = (l.image_paths || [])[0];
                return (
                  <>
                    <div className="sc-prev-img">{img && /^https?:/.test(img) ? <img src={img} alt="" /> : <span>{img ? 'Photo attached' : 'No photo'}</span>}</div>
                    <div className="sc-prev-body">
                      <b>{l.name}</b>
                      <small>{l.category || 'No category'} · {reviewFor.kind}</small>
                      {(l.best_for || []).length > 0 && <em>Best for: {(l.best_for || []).join(', ')}</em>}
                    </div>
                  </>
                );
              })()}
            </div>

            <ul className="sc-prev-list">
              <Prev label="Description" v={reviewFor.listing.overview || ''} />
              <Prev label="Industries" v={(reviewFor.listing.industries || []).join(', ')} />
              {reviewFor.kind === 'product' ? (
                <>
                  <Prev label="Specs" v={reviewFor.listing.specs ? `${Object.keys(reviewFor.listing.specs).length} listed` : ''} />
                  <Prev label="Availability" v={(reviewFor.listing.availability || []).join(', ')} />
                  <Prev label="Lead time" v={reviewFor.listing.lead_time || ''} />
                </>
              ) : (
                <>
                  <Prev label="Service areas" v={(reviewFor.listing.service_areas || []).join(', ')} />
                  <Prev label="Response time" v={reviewFor.listing.response_time || ''} />
                  <Prev label="Certifications" v={(reviewFor.listing.certifications || []).join(', ')} />
                </>
              )}
              <Prev label="Pilot / demo" v={reviewFor.listing.pilot?.available ? 'Available' : ''} />
              <Prev label="Warranty" v={String(reviewFor.listing.warranty_support?.warranty || '')} />
              <Prev label="Pricing" v={String(reviewFor.listing.pricing?.range || reviewFor.listing.pricing?.model || reviewFor.listing.pricing_model || 'Request quote')} />
              <Prev label="Photos" v={`${(reviewFor.listing.image_paths || []).length}`} />
              <Prev label="Documents" v={extras ? (extras.documents.length ? extras.documents.map((doc) => doc.title || doc.file_name).join(' · ') : '') : 'checking…'} />
              <Prev label="Case studies" v={extras ? (extras.case_studies.length ? extras.case_studies.map((c) => c.title).join(' · ') : '') : 'checking…'} />
            </ul>
            <p className="sc-hint">Empty fields simply will not show. AI-drafted content only used what was in your document — anything missing was left blank on purpose.</p>

            <label className="sc-cb sc-acc">
              <input type="checkbox" checked={accOk} onChange={(e) => setAccOk(e.target.checked)} />
              I confirm this information is accurate, current, and approved to be displayed on NXT LINK.
            </label>
            {pubErr && <div className="sc-warn">{pubErr}</div>}
            <div className="sc-actions">
              <button className="sc-btn ghost" onClick={() => setReviewFor(null)}>Keep editing</button>
              <button className="sc-btn" disabled={!accOk || pubBusy} onClick={publishNow}>{pubBusy ? 'Publishing…' : 'Publish to marketplace'}</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Prev({ label, v }: { label: string; v: string }) {
  return <li><span>{label}</span><div>{v || <i>empty — will not display</i>}</div></li>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`sc ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <VendorNav active="listings" />
      <main className="sc-wrap">{children}</main>
    </div>
  );
}

const CSS = `
.sc{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-vlistings),'IBM Plex Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.sc *{box-sizing:border-box;}
.sc a:focus-visible,.sc button:focus-visible,.sc input:focus-visible,.sc textarea:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.sc-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:20;}
.sc-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.sc-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;}.sc-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.sc-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.sc-wrap{max-width:860px;margin:0 auto;padding:36px 20px 100px;}
.sc-empty{text-align:center;color:var(--spec-text-2nd,#615F72);padding:80px 0;}
.sc-gate{max-width:420px;margin:14vh auto;text-align:center;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:20px;padding:36px;}
.sc-gate h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:20px;margin-bottom:18px;}
.sc-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:18px;}
.sc-head h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:28px;font-weight:700;letter-spacing:-.01em;}
.sc-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;margin-top:6px;}
.sc-headr{display:flex;gap:14px;}
.sc-link{font-family:inherit;background:none;border:none;color:var(--spec-violet-deep,#4A3DB0);font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:none;padding:0;}
.sc-link:hover{color:var(--spec-violet,#6C5CE0);}
.sc-msg{background:rgba(108,92,224,.08);border:1px solid rgba(108,92,224,.25);color:var(--spec-violet-deep,#4A3DB0);padding:11px 15px;border-radius:12px;font-size:13.5px;margin-bottom:16px;}
.sc-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:18px;padding:24px;margin-bottom:20px;}
.sc-cardhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.sc-lbl{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--spec-violet-deep,#4A3DB0);}
.sc-lblsm{font-size:12.5px;color:var(--spec-text-2nd,#615F72);}
.sc-hint{color:var(--spec-text-2nd,#615F72);font-size:13.5px;line-height:1.5;margin:0 0 10px;}
.sc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.sc-list li{display:flex;flex-direction:column;gap:9px;padding:12px 14px;border:1px solid var(--spec-border,#E2DFEC);border-radius:11px;background:var(--spec-surface,#EFEDF5);font-size:14px;}
.sc-rowtop{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.sc-reorder{display:inline-flex;flex-direction:column;gap:2px;margin-right:2px;}
.sc-reorder button{font-family:inherit;font-size:9px;line-height:1;padding:3px 6px;border-radius:6px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;}
.sc-reorder button:hover:not(:disabled){border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.sc-reorder button:disabled{opacity:.3;cursor:default;}
.sc-meter{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.sc-meterbar{width:130px;height:7px;border-radius:99px;background:var(--spec-border,#E2DFEC);overflow:hidden;flex-shrink:0;}
.sc-meterfill{height:100%;border-radius:99px;transition:width .3s;}
.sc-meterfill.good{background:var(--spec-success,#2F9E6A);}
.sc-meterfill.mid{background:var(--spec-warning,#C68A28);}
.sc-meterfill.low{background:var(--spec-error,#CE4B43);}
.sc-meterpct{font-size:11.5px;font-weight:700;color:var(--spec-ink,#141320);}
.sc-meterhint{font-size:11.5px;color:var(--spec-text-2nd,#615F72);}
.sc-list b{font-size:14.5px;}
.sc-list small{color:var(--spec-text-2nd,#615F72);}
.sc-spacer{flex:1;}
.sc-list a{color:var(--spec-violet-deep,#4A3DB0);font-size:12.5px;text-decoration:none;}
.sc-list button{font-family:inherit;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);font-size:12.5px;border-radius:8px;padding:6px 11px;cursor:pointer;}
.sc-list button:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.sc-list button.sc-pub{border-color:rgba(47,158,106,.4);color:#1F7A54;}
.sc-list button.sc-del{color:var(--spec-text-2nd,#615F72);}
.sc-list button.sc-del:hover{color:var(--spec-error,#CE4B43);border-color:rgba(206,75,67,.4);}
.sc-status{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;border-radius:99px;}
.sc-status.published{background:#E9F7F0;color:#1F7A54;}
.sc-status.draft{background:#FBF3E7;color:var(--spec-warning,#C68A28);}
.sc-status.needs_review{background:#FDEEE3;color:#B5651D;}
.sc-status.ready{background:#E7F0FD;color:#3E6FD0;}
.sc-status.unpublished{background:var(--spec-surface,#EFEDF5);color:var(--spec-text-2nd,#615F72);}
.sc-btn{font-family:inherit;font-size:14px;font-weight:700;padding:12px 20px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;}
.sc-btn:hover{background:var(--spec-violet-deep,#4A3DB0);}.sc-btn:disabled{opacity:.55;}
.sc-btn.sm{padding:9px 14px;font-size:13px;}
.sc-btn.ghost{background:#fff;border:1px solid rgba(108,92,224,.4);color:var(--spec-violet-deep,#4A3DB0);}
.sc-ai{border:1.5px dashed rgba(108,92,224,.35);background:rgba(108,92,224,.05);border-radius:14px;padding:16px;margin-bottom:20px;}
.sc-airow{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:start;}
@media(max-width:640px){.sc-airow{grid-template-columns:1fr;}}
.sc-airow textarea{font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;resize:vertical;}
.sc-aisum{margin-top:12px;font-size:13px;color:var(--spec-violet-deep,#4A3DB0);line-height:1.5;}
.sc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
.sc-grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:12px;}
@media(max-width:560px){.sc-grid{grid-template-columns:1fr;}}
.sc-field{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:500;color:var(--spec-ink,#141320);margin-bottom:2px;}
.sc-field input,.sc-field textarea{font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;resize:vertical;width:100%;}
.sc-field input:focus,.sc-field textarea:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.sc-cbrow{display:flex;gap:18px;align-items:center;margin:10px 0 14px;flex-wrap:wrap;}
.sc-cb{display:flex;align-items:center;gap:7px;font-size:13.5px;color:var(--spec-ink,#141320);cursor:pointer;}
.sc-block{border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:14px 16px;margin-bottom:12px;background:var(--spec-surface,#EFEDF5);}
.sc-block summary{cursor:pointer;font-size:13.5px;font-weight:600;color:var(--spec-ink,#141320);}
.sc-photos{display:flex;align-items:center;gap:12px;margin:16px 0;}
.sc-actions{display:flex;gap:12px;margin-top:20px;}
.sc-warn{background:#FBF3E7;border:1px solid #EFD9AE;color:#8A5D14;padding:11px 15px;border-radius:12px;font-size:13.5px;margin-bottom:16px;line-height:1.5;}
.sc-modal{position:fixed;inset:0;background:rgba(20,19,32,.55);display:grid;place-items:center;z-index:40;padding:20px;}
.sc-modal-in{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:18px;max-width:560px;width:100%;max-height:85vh;overflow:auto;padding:24px;box-shadow:0 20px 60px rgba(20,19,32,.25);}
.sc-prev-card{display:flex;gap:14px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:13px;padding:12px;margin:14px 0;}
.sc-prev-img{width:110px;height:74px;border-radius:9px;overflow:hidden;background:#E2DFEC;display:grid;place-items:center;color:#8A87A0;font-size:11px;flex-shrink:0;}
.sc-prev-img img{width:100%;height:100%;object-fit:cover;}
.sc-prev-body{display:flex;flex-direction:column;gap:4px;}
.sc-prev-body b{font-size:15px;}
.sc-prev-body small{color:var(--spec-text-2nd,#615F72);font-size:12.5px;}
.sc-prev-body em{font-style:normal;font-size:12px;color:var(--spec-violet-deep,#4A3DB0);}
.sc-prev-list{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;}
.sc-prev-list li{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--spec-border,#E2DFEC);font-size:13.5px;}
.sc-prev-list li span{color:var(--spec-text-2nd,#615F72);min-width:120px;flex-shrink:0;}
.sc-prev-list li i{color:#8A87A0;font-style:italic;}
.sc-acc{margin:14px 0 4px;font-size:13.5px;line-height:1.5;align-items:flex-start;}
.sc-acc input{margin-top:3px;}
`;
