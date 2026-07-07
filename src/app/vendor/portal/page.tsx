'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import ChatWidget from '@/components/ChatWidget';

const CATEGORIES = [
  'Forklift maintenance', 'Copy machine service', 'Waste collection', 'Transportation / FTL / LTL',
  'Labels / Zebra', 'Fire extinguisher inspection', 'Electrical service', 'Wooden pallets',
  'Fire door maintenance', 'IT support', 'General maintenance', 'Propane gas', 'Pest control',
  'Staffing agency', 'Warehouse technology', 'Warehouse products / parts',
];
const AREAS = ['El Paso', 'Juárez', 'New Mexico', 'West Texas', 'Cross-border', 'National'];
const INDUSTRIES = [
  'Warehousing & 3PL', 'Manufacturing', 'Retail & E-commerce', 'Food & Beverage', 'Automotive',
  'Cold Chain', 'Import / Export & Customs', 'Construction', 'Distribution Centers',
  'Pharma & Healthcare', 'Aerospace & Defense', 'General Industrial',
];
const CLIENT_TYPES = [
  'Small warehouses (<50k sqft)', 'Mid-size warehouses', 'Large distribution centers',
  'Manufacturers', '3PL providers', 'Retailers', 'Cross-border operations', 'Startups', 'Enterprise',
];

interface Vendor {
  id: string; public_ref: string; company_name: string; contact_name: string | null;
  email: string | null; phone: string | null; website: string | null; city: string | null;
  categories: string[]; service_areas: string[]; industries: string[]; client_types: string[];
  description: string | null; status: string;
}
interface Brochure { id: string; file_name: string; title: string; size_bytes: number; public_url: string | null }
interface Video { id: string; title: string | null; url: string; embed_url: string; provider: string }
interface Draft {
  company_name: string | null; description: string | null; categories: string[];
  service_areas: string[]; industries: string[]; client_types: string[];
  website: string | null; phone: string | null; city: string | null; summary: string;
}

export default function VendorPortalPage() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [extractingId, setExtractingId] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftSource, setDraftSource] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/vendor/profile');
    if (res.status === 401) { setSignedIn(false); setChecking(false); return; }
    const data = await res.json();
    setVendor(data.vendor); setBrochures(data.brochures || []); setVideos(data.videos || []);
    setSignedIn(true); setChecking(false);
  }, []);

  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    sb.auth.getSession().then(({ data }) => { if (data.session) load(); else setChecking(false); });
  }, [load]);

  function set<K extends keyof Vendor>(k: K, v: Vendor[K]) { setVendor((prev) => (prev ? { ...prev, [k]: v } : prev)); }
  function toggle(list: string[], v: string, key: 'categories' | 'service_areas' | 'industries' | 'client_types') {
    if (!vendor) return;
    const next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
    set(key, next);
  }

  async function save() {
    if (!vendor) return;
    setSaving(true); setMsg('');
    const res = await fetch('/api/vendor/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: vendor.company_name, contact_name: vendor.contact_name, phone: vendor.phone,
        website: vendor.website, city: vendor.city, description: vendor.description,
        categories: vendor.categories, service_areas: vendor.service_areas,
        industries: vendor.industries, client_types: vendor.client_types,
      }),
    });
    const data = await res.json();
    setMsg(data.ok ? 'Saved.' : (data.message || 'Could not save'));
    setSaving(false);
  }

  async function addVideo() {
    if (!videoUrl.trim()) return;
    const res = await fetch('/api/vendor/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: videoTitle, url: videoUrl }) });
    const data = await res.json();
    if (data.ok) { setVideos((v) => [data.video, ...v]); setVideoUrl(''); setVideoTitle(''); }
    else setMsg(data.message || 'Could not add video');
  }
  async function removeVideo(id: string) {
    await fetch(`/api/vendor/videos?id=${id}`, { method: 'DELETE' });
    setVideos((v) => v.filter((x) => x.id !== id));
  }

  async function uploadFile(file: File) {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/vendor/brochures', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.ok && data.brochure) setBrochures((b) => [data.brochure, ...b]);
    else setMsg(data.message || 'Upload failed');
  }
  async function removeBrochure(id: string) {
    await fetch(`/api/vendor/brochures?id=${id}`, { method: 'DELETE' });
    setBrochures((b) => b.filter((x) => x.id !== id));
  }
  async function extractFromBrochure(id: string) {
    setExtractingId(id); setMsg('');
    try {
      const res = await fetch('/api/vendor/profile/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brochure_id: id }) });
      const data = await res.json();
      if (data.ok) { setDraft(data.draft); setDraftSource(data.source_file || ''); }
      else setMsg(data.message || 'Could not read that file');
    } catch { setMsg('Could not read that file'); }
    setExtractingId('');
  }
  function applyDraft() {
    if (!vendor || !draft) return;
    const merge = (a: string[], b: string[]) => Array.from(new Set([...(a || []), ...b]));
    setVendor({
      ...vendor,
      company_name: draft.company_name || vendor.company_name,
      description: draft.description || vendor.description,
      website: draft.website || vendor.website,
      phone: draft.phone || vendor.phone,
      city: draft.city || vendor.city,
      categories: merge(vendor.categories, draft.categories),
      service_areas: merge(vendor.service_areas, draft.service_areas),
      industries: merge(vendor.industries, draft.industries),
      client_types: merge(vendor.client_types, draft.client_types),
    });
    setDraft(null);
    setMsg('Draft applied — review the fields above, then press "Save profile" to confirm.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function signOut() {
    const sb = createBrowserSupabaseClient();
    await sb.auth.signOut();
    window.location.href = '/vendor-login';
  }

  if (checking) return <div className="vp"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="vp-loading">Loading…</div></div>;

  if (!signedIn) {
    return (
      <div className="vp"><style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="vp-gate">
          <h1>Sign in to manage your profile</h1>
          <p>Create or access your vendor account to edit your company profile, brochures, and videos.</p>
          <a className="vp-btn" href="/vendor-login">Go to sign in →</a>
        </div>
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="vp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="vp-nav">
        <a className="vp-brand" href="/"><span className="vp-mk">N</span><b>NXT<i>//</i>LINK</b></a>
        <div className="vp-navr">
          <a className="vp-navlink" href="/vendor/listings">Listings</a>
          <a className="vp-navlink" href="/vendor/leads">Leads</a>
          <span className={'vp-badge ' + vendor.status}>{vendor.status}</span>
          <button className="vp-signout" onClick={signOut}>Sign out</button>
        </div>
      </nav>

      <main className="vp-wrap">
        <h1>Your company profile</h1>
        <p className="vp-sub">This is what NXT//LINK — and once approved, the opportunities you receive — will be based on. Keep it current.</p>
        {msg && <div className="vp-msg">{msg}</div>}

        <section className="vp-card">
          <div className="vp-lbl">Company</div>
          <div className="vp-fgrid">
            <Field label="Company name" value={vendor.company_name} onChange={(v) => set('company_name', v)} />
            <Field label="Contact name" value={vendor.contact_name || ''} onChange={(v) => set('contact_name', v)} />
            <Field label="Phone" value={vendor.phone || ''} onChange={(v) => set('phone', v)} />
            <Field label="Website" value={vendor.website || ''} onChange={(v) => set('website', v)} />
            <Field label="City" value={vendor.city || ''} onChange={(v) => set('city', v)} />
          </div>
          <label className="vp-field" style={{ marginTop: 18 }}>
            <span>About your company</span>
            <textarea rows={4} value={vendor.description || ''} onChange={(e) => set('description', e.target.value)} />
          </label>
        </section>

        <section className="vp-card">
          <div className="vp-lbl">Industry you work in</div>
          <ChipGroup options={INDUSTRIES} selected={vendor.industries || []} onToggle={(v) => toggle(vendor.industries || [], v, 'industries')} />
          <div className="vp-lbl" style={{ marginTop: 22 }}>Clients you're looking for</div>
          <ChipGroup options={CLIENT_TYPES} selected={vendor.client_types || []} onToggle={(v) => toggle(vendor.client_types || [], v, 'client_types')} />
          <div className="vp-lbl" style={{ marginTop: 22 }}>Products / services you sell</div>
          <ChipGroup options={CATEGORIES} selected={vendor.categories || []} onToggle={(v) => toggle(vendor.categories || [], v, 'categories')} />
          <div className="vp-lbl" style={{ marginTop: 22 }}>Service areas</div>
          <ChipGroup options={AREAS} selected={vendor.service_areas || []} onToggle={(v) => toggle(vendor.service_areas || [], v, 'service_areas')} />
          <button className="vp-btn" style={{ marginTop: 24 }} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save profile'}</button>
        </section>

        <section className="vp-card">
          <div className="vp-lbl">Showcase videos</div>
          <p className="vp-hint">Paste a YouTube or Vimeo link to show what you do (up to 8 videos).</p>
          <div className="vp-vform">
            <input placeholder="Title (optional)" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} />
            <input placeholder="https://youtube.com/watch?v=…" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addVideo()} />
            <button className="vp-btn sm" onClick={addVideo}>Add video</button>
          </div>
          {videos.length > 0 && (
            <div className="vp-vgrid">
              {videos.map((v) => (
                <div className="vp-vcard" key={v.id}>
                  {v.provider === 'other' ? <a className="vp-vlink" href={v.url} target="_blank" rel="noreferrer">{v.title || v.url}</a>
                    : <div className="vp-viframe"><iframe src={v.embed_url} title={v.title || 'video'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>}
                  <div className="vp-vfoot"><span>{v.title || 'Untitled'}</span><button onClick={() => removeVideo(v.id)}>Remove</button></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="vp-card">
          <div className="vp-lbl">Brochures &amp; documents</div>
          <p className="vp-hint">Upload a brochure, then press &ldquo;AI fill&rdquo; and we&apos;ll draft your profile from it — you review and approve before anything is saved.</p>
          <label className="vp-drop">
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.ppt,.pptx,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></svg>
            <span>Upload a file</span>
          </label>
          {brochures.length > 0 && (
            <ul className="vp-files">
              {brochures.map((b) => (
                <li key={b.id}>
                  {b.public_url ? <a href={b.public_url} target="_blank" rel="noreferrer">{b.title || b.file_name}</a> : <span>{b.title || b.file_name}</span>}
                  <span className="vp-fmeta">{(b.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                  <button className="vp-ai" disabled={!!extractingId} onClick={() => extractFromBrochure(b.id)}>{extractingId === b.id ? 'Reading…' : 'AI fill'}</button>
                  <button onClick={() => removeBrochure(b.id)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
          {draft && (
            <div className="vp-draft">
              <div className="vp-lbl">AI draft from {draftSource}</div>
              <p className="vp-hint">{draft.summary}</p>
              <ul className="vp-draft-list">
                {draft.company_name && <li><b>Company:</b> {draft.company_name}</li>}
                {draft.description && <li><b>About:</b> {draft.description}</li>}
                {draft.categories.length > 0 && <li><b>Products / services:</b> {draft.categories.join(', ')}</li>}
                {draft.industries.length > 0 && <li><b>Industries:</b> {draft.industries.join(', ')}</li>}
                {draft.service_areas.length > 0 && <li><b>Service areas:</b> {draft.service_areas.join(', ')}</li>}
                {draft.client_types.length > 0 && <li><b>Client types:</b> {draft.client_types.join(', ')}</li>}
                {draft.website && <li><b>Website:</b> {draft.website}</li>}
                {draft.city && <li><b>City:</b> {draft.city}</li>}
              </ul>
              <div className="vp-draft-actions">
                <button className="vp-btn sm" onClick={applyDraft}>Use this draft</button>
                <button className="vp-signout" onClick={() => setDraft(null)}>Dismiss</button>
              </div>
            </div>
          )}
        </section>
      </main>
      <ChatWidget mode="vendor" locale="en" />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (<label className="vp-field"><span>{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} /></label>);
}
function ChipGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (<div className="vp-chips">{options.map((o) => (<button key={o} type="button" className={'vp-chip' + (selected.includes(o) ? ' on' : '')} onClick={() => onToggle(o)}>{o}</button>))}</div>);
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
.vp{--bg:#0A0A0F;--bg2:#111118;--surf:rgba(255,255,255,.04);--surf2:rgba(255,255,255,.07);--ink:#F0F0F5;--ink2:#C0C0D0;--muted:#8080A0;--muted2:#505068;--line:rgba(255,255,255,.08);--p:#7C5CFC;--p2:#A78BFA;--p3:#C4B5FD;--pbg:rgba(124,92,252,.12);--pd:#6344DF;--green:#34D399;--sans:'Outfit',system-ui,sans-serif;--serif:'Instrument Serif',Georgia,serif;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;}
.vp *{box-sizing:border-box;}
.vp-loading{min-height:100vh;display:grid;place-items:center;color:var(--muted);}
.vp-gate{max-width:420px;margin:14vh auto;text-align:center;background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:36px;backdrop-filter:blur(12px);}
.vp-gate h1{font-size:22px;font-weight:800;margin-bottom:10px;}
.vp-gate p{color:var(--muted);font-size:14.5px;line-height:1.6;margin-bottom:22px;}
.vp-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 28px;background:rgba(10,10,15,.7);backdrop-filter:blur(24px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10;}
.vp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);}
.vp-mk{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--p),var(--pd));display:grid;place-items:center;font-family:var(--serif);font-size:17px;color:#fff;}
.vp-brand b{font-size:18px;font-weight:700;letter-spacing:-.02em;}.vp-brand i{color:var(--p2);font-style:normal;}
.vp-navr{display:flex;align-items:center;gap:14px;}
.vp-navlink{color:var(--p2);font-size:13.5px;font-weight:600;text-decoration:none;}
.vp-navlink:hover{color:var(--p3);}
.vp-badge{font:600 11px/1 var(--sans);padding:5px 11px;border-radius:99px;text-transform:capitalize;}
.vp-badge.pending{background:rgba(251,191,36,.12);color:#FBBF24;}
.vp-badge.approved{background:rgba(52,211,153,.12);color:var(--green);}
.vp-badge.paused,.vp-badge.rejected{background:var(--surf2);color:var(--muted);}
.vp-signout{background:none;border:1px solid var(--line);color:var(--ink2);font:500 13px var(--sans);padding:8px 14px;border-radius:9px;cursor:pointer;}
.vp-signout:hover{border-color:var(--p2);color:var(--ink);}
.vp-wrap{max-width:760px;margin:0 auto;padding:44px 24px 100px;}
.vp-wrap h1{font-size:30px;font-weight:800;letter-spacing:-.02em;margin-bottom:8px;}
.vp-sub{color:var(--muted);font-size:15px;line-height:1.6;font-weight:300;margin-bottom:28px;}
.vp-msg{background:var(--pbg);border:1px solid rgba(124,92,252,.25);color:var(--p3);padding:11px 15px;border-radius:12px;font-size:13.5px;margin-bottom:20px;}
.vp-card{background:var(--surf);border:1px solid var(--line);border-radius:18px;padding:26px;margin-bottom:20px;backdrop-filter:blur(10px);}
.vp-lbl{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--p2);margin-bottom:14px;}
.vp-hint{color:var(--muted);font-size:13.5px;margin:0 0 16px;font-weight:300;}
.vp-fgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media(max-width:520px){.vp-fgrid{grid-template-columns:1fr;}}
.vp-field{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:500;color:var(--ink2);}
.vp-field input,.vp-field textarea{font-family:var(--sans);padding:12px 14px;border-radius:11px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14.5px;outline:none;width:100%;resize:vertical;}
.vp-field input:focus,.vp-field textarea:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vp-chips{display:flex;flex-wrap:wrap;gap:9px;}
.vp-chip{font-family:var(--sans);padding:9px 15px;border-radius:99px;border:1px solid var(--line);background:var(--bg);color:var(--ink2);font-size:13px;font-weight:500;cursor:pointer;}
.vp-chip:hover{border-color:var(--p2);}
.vp-chip.on{background:var(--pbg);border-color:var(--p);color:var(--p3);}
.vp-btn{font-family:var(--sans);border:none;cursor:pointer;font-size:14.5px;font-weight:600;border-radius:11px;padding:13px 22px;background:var(--p);color:#fff;box-shadow:0 4px 18px rgba(124,92,252,.35);}
.vp-btn:hover{background:var(--pd);}.vp-btn:disabled{opacity:.6;}
.vp-btn.sm{padding:11px 16px;font-size:13.5px;}
.vp-vform{display:grid;grid-template-columns:1fr 1.6fr auto;gap:10px;margin-bottom:18px;}
@media(max-width:600px){.vp-vform{grid-template-columns:1fr;}}
.vp-vform input{font-family:var(--sans);padding:11px 14px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14px;outline:none;}
.vp-vform input:focus{border-color:var(--p);}
.vp-vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
.vp-vcard{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.vp-viframe{position:relative;padding-top:56.25%;background:#000;}
.vp-viframe iframe{position:absolute;inset:0;width:100%;height:100%;border:none;}
.vp-vlink{display:block;padding:20px;color:var(--p2);font-size:13.5px;word-break:break-all;}
.vp-vfoot{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;font-size:12.5px;color:var(--ink2);}
.vp-vfoot button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px;}
.vp-vfoot button:hover{color:#FCA5A5;}
.vp-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:26px;border:1.5px dashed rgba(124,92,252,.35);border-radius:14px;color:var(--p2);cursor:pointer;background:var(--pbg);margin-bottom:16px;}
.vp-drop:hover{border-color:var(--p);}
.vp-drop input{display:none;}
.vp-files{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.vp-files li{display:flex;align-items:center;gap:12px;padding:11px 14px;border:1px solid var(--line);border-radius:10px;font-size:13.5px;background:var(--bg2);}
.vp-files li a{color:var(--p2);flex:1;}
.vp-files li span:first-child{flex:1;color:var(--ink2);}
.vp-fmeta{color:var(--muted);font-size:12px;}
.vp-files button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:12.5px;}
.vp-files button:hover{color:#FCA5A5;}
.vp-files button.vp-ai{color:var(--p2);font-weight:600;}
.vp-files button.vp-ai:hover{color:var(--p3);}
.vp-files button.vp-ai:disabled{opacity:.5;cursor:default;}
.vp-draft{margin-top:18px;border:1px solid rgba(124,92,252,.35);background:var(--pbg);border-radius:14px;padding:20px;}
.vp-draft-list{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:8px;font-size:13.5px;color:var(--ink2);line-height:1.5;}
.vp-draft-list b{color:var(--ink);}
.vp-draft-actions{display:flex;gap:10px;}
`;
