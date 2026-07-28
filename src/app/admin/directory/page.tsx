'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

// Exhibitor-directory style browse: category sidebar + search + A-Z + card
// grid, in the spirit of trade-show exhibitor browsers (e.g. MapYourShow).
// Reuses the same admin APIs as /admin/vendors and /admin/match.

interface Vendor {
  id: string; public_ref: string; company_name: string; contact_name: string;
  email: string; phone: string; website: string; city: string;
  categories: string[]; service_areas: string[]; industries: string[]; client_types: string[]; description: string;
  status: string; brochure_count: number; created_at: string;
}
interface Brochure { id: string; file_name: string; public_url: string | null; title: string; size_bytes: number }
interface Video { id: string; title: string | null; embed_url: string; url: string; provider: string }

const ALPHABET = ['#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
function letterOf(name: string): string {
  const c = (name.trim()[0] || '#').toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export default function AdminDirectoryPage() {
  const [code, setCode] = useState('');
  const [authed, setAuthed] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [areas, setAreas] = useState<Set<string>>(new Set());
  const [industries, setIndustries] = useState<Set<string>>(new Set());
  const [clientTypes, setClientTypes] = useState<Set<string>>(new Set());
  const [letter, setLetter] = useState('');
  const [includePending, setIncludePending] = useState(false);
  const [open, setOpen] = useState<Vendor | null>(null);
  const [zoho, setZoho] = useState<{ mail_ready: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors/manage?status=${includePending ? 'all' : 'approved'}`, { headers: { 'x-access-code': code } });
      if (res.status === 401) { setAuthed(false); return; }
      const data = await res.json();
      setVendors(data.vendors || []);
      setAuthed(true);
    } finally { setLoading(false); }
  }, [code, includePending]);

  useEffect(() => { if (authed) load(); }, [authed, load]);
  useEffect(() => { fetch('/api/zoho/status').then((r) => r.json()).then(setZoho).catch(() => {}); }, []);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    vendors.forEach((v) => (v.categories || []).forEach((c) => m.set(c, (m.get(c) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [vendors]);

  const areaCounts = useMemo(() => {
    const m = new Map<string, number>();
    vendors.forEach((v) => (v.service_areas || []).forEach((a) => m.set(a, (m.get(a) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [vendors]);

  const industryCounts = useMemo(() => {
    const m = new Map<string, number>();
    vendors.forEach((v) => (v.industries || []).forEach((c) => m.set(c, (m.get(c) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [vendors]);

  const clientTypeCounts = useMemo(() => {
    const m = new Map<string, number>();
    vendors.forEach((v) => (v.client_types || []).forEach((c) => m.set(c, (m.get(c) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [vendors]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return vendors
      .filter((v) => !query || v.company_name.toLowerCase().includes(query) || v.description?.toLowerCase().includes(query) || (v.categories || []).some((c) => c.toLowerCase().includes(query)))
      .filter((v) => cats.size === 0 || (v.categories || []).some((c) => cats.has(c)))
      .filter((v) => areas.size === 0 || (v.service_areas || []).some((a) => areas.has(a)))
      .filter((v) => industries.size === 0 || (v.industries || []).some((a) => industries.has(a)))
      .filter((v) => clientTypes.size === 0 || (v.client_types || []).some((a) => clientTypes.has(a)))
      .filter((v) => !letter || letterOf(v.company_name) === letter)
      .sort((a, b) => a.company_name.localeCompare(b.company_name));
  }, [vendors, q, cats, areas, industries, clientTypes, letter]);

  const availableLetters = useMemo(() => new Set(vendors.map((v) => letterOf(v.company_name))), [vendors]);

  function toggle(set: Set<string>, v: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    next.has(v) ? next.delete(v) : next.add(v);
    setter(next);
  }
  function clearAll() { setQ(''); setCats(new Set()); setAreas(new Set()); setIndustries(new Set()); setClientTypes(new Set()); setLetter(''); }

  async function setVendorStatus(id: string, st: string) {
    await fetch('/api/vendors/manage', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-access-code': code }, body: JSON.stringify({ id, status: st }) });
    setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, status: st } : v)));
    if (open?.id === id) setOpen({ ...open, status: st });
  }

  if (!authed) {
    return (
      <div className="dir-root"><style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="dir-gate">
          <div className="dir-mk">N</div>
          <h1>Vendor directory</h1>
          <p>Enter the access code to browse registered companies.</p>
          <input type="password" placeholder="Access code" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <button className="dir-btn" onClick={load}>Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dir-root"><style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="dir-nav">
        <div className="dir-brand"><span className="dir-mk sm">N</span><b>NXT<i>//</i>LINK</b> <span className="dir-tag">Directory</span></div>
        <div className="dir-navr">
          <a href="/admin/vendors" className="dir-link">Table view</a>
          <a href="/admin/match" className="dir-link">Match →</a>
        </div>
      </header>

      <div className="dir-search-bar">
        <div className="dir-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input placeholder="Search companies, categories, keywords…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="dir-check"><input type="checkbox" checked={includePending} onChange={(e) => setIncludePending(e.target.checked)} /> Include pending</label>
        <div className="dir-count">{loading ? 'Loading…' : `${filtered.length} of ${vendors.length} companies`}</div>
      </div>

      <div className="dir-az">
        {ALPHABET.map((l) => (
          <button key={l} disabled={!availableLetters.has(l)} className={'dir-azbtn' + (letter === l ? ' on' : '')} onClick={() => setLetter(letter === l ? '' : l)}>{l}</button>
        ))}
      </div>

      <div className="dir-body">
        <aside className="dir-side">
          <div className="dir-side-head"><span>Filters</span>{(cats.size || areas.size || industries.size || clientTypes.size || q || letter) ? <button onClick={clearAll}>Clear all</button> : null}</div>

          <div className="dir-facet">
            <div className="dir-facet-h">Industry</div>
            {industryCounts.length === 0 ? <p className="dir-empty-mini">No industries yet.</p> : industryCounts.map(([c, n]) => (
              <label key={c} className="dir-cb"><input type="checkbox" checked={industries.has(c)} onChange={() => toggle(industries, c, setIndustries)} /><span>{c}</span><em>{n}</em></label>
            ))}
          </div>

          <div className="dir-facet">
            <div className="dir-facet-h">Client type</div>
            {clientTypeCounts.length === 0 ? <p className="dir-empty-mini">No client types yet.</p> : clientTypeCounts.map(([c, n]) => (
              <label key={c} className="dir-cb"><input type="checkbox" checked={clientTypes.has(c)} onChange={() => toggle(clientTypes, c, setClientTypes)} /><span>{c}</span><em>{n}</em></label>
            ))}
          </div>

          <div className="dir-facet">
            <div className="dir-facet-h">Products / services</div>
            {categoryCounts.length === 0 ? <p className="dir-empty-mini">No categories yet.</p> : categoryCounts.map(([c, n]) => (
              <label key={c} className="dir-cb"><input type="checkbox" checked={cats.has(c)} onChange={() => toggle(cats, c, setCats)} /><span>{c}</span><em>{n}</em></label>
            ))}
          </div>

          <div className="dir-facet">
            <div className="dir-facet-h">Service area</div>
            {areaCounts.length === 0 ? <p className="dir-empty-mini">No areas yet.</p> : areaCounts.map(([a, n]) => (
              <label key={a} className="dir-cb"><input type="checkbox" checked={areas.has(a)} onChange={() => toggle(areas, a, setAreas)} /><span>{a}</span><em>{n}</em></label>
            ))}
          </div>
        </aside>

        <main className="dir-main">
          {filtered.length === 0 ? (
            <div className="dir-empty">No companies match these filters. <a href="/vendor-signup">Share the registration link</a> to grow the directory.</div>
          ) : (
            <div className="dir-grid">
              {filtered.map((v) => (
                <button key={v.id} className="dir-card" onClick={() => setOpen(v)}>
                  <div className="dir-avatar">{initials(v.company_name)}</div>
                  <div className="dir-card-body">
                    <div className="dir-card-head"><b>{v.company_name}</b><em className={'dir-badge ' + v.status}>{v.status}</em></div>
                    {v.industries?.length > 0 && <div className="dir-card-industry">{v.industries.slice(0, 2).join(' · ')}</div>}
                    <div className="dir-card-tags">
                      {(v.categories || []).slice(0, 3).map((c) => <span key={c}>{c}</span>)}
                      {(v.categories || []).length > 3 && <span className="dir-more">+{v.categories.length - 3}</span>}
                    </div>
                    <div className="dir-card-meta">
                      {v.service_areas?.length ? v.service_areas.slice(0, 2).join(', ') : 'No area set'}
                      {v.brochure_count > 0 && <span className="dir-file-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>{v.brochure_count}</span>}
                    </div>
                  </div>
                  <span className="dir-view">View →</span>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      {open && <DirectoryDrawer vendor={open} code={code} zoho={zoho} onClose={() => setOpen(null)} onStatus={setVendorStatus} />}
    </div>
  );
}

function DirectoryDrawer({ vendor, code, zoho, onClose, onStatus }: {
  vendor: Vendor; code: string; zoho: { mail_ready: boolean } | null;
  onClose: () => void; onStatus: (id: string, st: string) => void;
}) {
  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [msg, setMsg] = useState('');
  const [emailBody, setEmailBody] = useState(`Hi ${vendor.contact_name || vendor.company_name},\n\nWe have a protected opportunity that may fit your service area. Are you available to quote?\n\n— NXT//LINK`);

  useEffect(() => {
    fetch(`/api/vendors/brochures?vendor_id=${vendor.id}`, { headers: { 'x-access-code': code } }).then((r) => r.json()).then((d) => setBrochures(d.brochures || [])).catch(() => {});
    fetch(`/api/vendors/videos?vendor_id=${vendor.id}`, { headers: { 'x-access-code': code } }).then((r) => r.json()).then((d) => setVideos(d.videos || [])).catch(() => {});
  }, [vendor.id, code]);

  async function sendEmail() {
    setMsg('Sending…');
    const res = await fetch('/api/zoho/email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': code }, body: JSON.stringify({ to: vendor.email, subject: 'NXT//LINK — opportunity', body: emailBody.replace(/\n/g, '<br>'), vendor_id: vendor.id }) });
    const d = await res.json();
    setMsg(d.message || (d.sent ? 'Sent' : 'Saved as draft'));
  }
  async function scheduleMeeting() {
    setMsg('Scheduling…');
    const start = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const res = await fetch('/api/zoho/meeting', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': code }, body: JSON.stringify({ topic: `NXT//LINK intro — ${vendor.company_name}`, startTime: start, durationMinutes: 30, to: vendor.email, vendor_id: vendor.id }) });
    const d = await res.json();
    setMsg(d.message || 'Done');
  }

  return (
    <div className="dir-overlay" onClick={onClose}>
      <div className="dir-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="dir-x" onClick={onClose}>✕</button>
        <div className="dir-drawer-top">
          <div className="dir-avatar lg">{initials(vendor.company_name)}</div>
          <div>
            <span className={'dir-badge ' + vendor.status}>{vendor.status}</span>
            <h2>{vendor.company_name}</h2>
            <p className="dir-ref">{vendor.public_ref}</p>
          </div>
        </div>

        <div className="dir-kv">
          <div><label>Contact</label><span>{vendor.contact_name || '—'}</span></div>
          <div><label>Email</label><span>{vendor.email || '—'}</span></div>
          <div><label>Phone</label><span>{vendor.phone || '—'}</span></div>
          <div><label>Website</label><span>{vendor.website || '—'}</span></div>
          <div><label>City</label><span>{vendor.city || '—'}</span></div>
        </div>

        {vendor.industries?.length > 0 && <><div className="dir-lbl">Industry</div><div className="dir-chips">{vendor.industries.map((c) => <span key={c} className="dir-chip">{c}</span>)}</div></>}
        {vendor.client_types?.length > 0 && <><div className="dir-lbl">Looking for clients like</div><div className="dir-chips">{vendor.client_types.map((c) => <span key={c} className="dir-chip">{c}</span>)}</div></>}
        {vendor.categories?.length > 0 && <><div className="dir-lbl">Products / services</div><div className="dir-chips">{vendor.categories.map((c) => <span key={c} className="dir-chip">{c}</span>)}</div></>}
        {vendor.service_areas?.length > 0 && <><div className="dir-lbl">Service areas</div><div className="dir-chips">{vendor.service_areas.map((c) => <span key={c} className="dir-chip">{c}</span>)}</div></>}
        {vendor.description && <><div className="dir-lbl">About</div><p className="dir-desc">{vendor.description}</p></>}

        {videos.length > 0 && (
          <>
            <div className="dir-lbl">Showcase videos</div>
            <div className="dir-vgrid">
              {videos.map((v) => (
                <div className="dir-vcard" key={v.id}>
                  {v.provider === 'other' ? <a className="dir-vlink" href={v.url} target="_blank" rel="noreferrer">{v.title || v.url}</a>
                    : <div className="dir-viframe"><iframe src={v.embed_url} title={v.title || 'video'} allow="encrypted-media; picture-in-picture" allowFullScreen /></div>}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="dir-lbl">Brochures</div>
        {brochures.length === 0 ? <p className="dir-desc">No files uploaded.</p> : (
          <ul className="dir-broch">{brochures.map((b) => (
            <li key={b.id}>{b.public_url ? <a href={b.public_url} target="_blank" rel="noreferrer">{b.title || b.file_name}</a> : <span>{b.title || b.file_name}</span>}<small>{(b.size_bytes / 1024 / 1024).toFixed(1)} MB</small></li>
          ))}</ul>
        )}

        <div className="dir-lbl">Decision</div>
        <div className="dir-row">
          <button className="dir-btn green" onClick={() => onStatus(vendor.id, 'approved')}>Approve</button>
          <button className="dir-btn ghost" onClick={() => onStatus(vendor.id, 'paused')}>Pause</button>
          <button className="dir-btn ghost" onClick={() => onStatus(vendor.id, 'rejected')}>Reject</button>
        </div>

        <div className="dir-lbl">Outreach {zoho?.mail_ready ? '' : '(draft mode — connect Zoho to auto-send)'}</div>
        <textarea className="dir-ta" rows={4} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
        <div className="dir-row">
          <button className="dir-btn" onClick={sendEmail} disabled={!vendor.email}>Email via Zoho</button>
          <button className="dir-btn ghost" onClick={scheduleMeeting} disabled={!vendor.email}>Schedule Zoho Meeting</button>
        </div>
        {msg && <div className="dir-msg">{msg}</div>}
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
.dir-root{--bg:#F8F7FB;--bg2:#FFFFFF;--surf:rgba(20,19,32,.04);--surf2:rgba(20,19,32,.07);--ink:#141320;--ink-2:#3B3A4A;--ink-3:#615F72;--line:rgba(20,19,32,.08);--line-2:rgba(20,19,32,.14);--brand:#6C5CE0;--brand-2:#4A3DB0;--brand-soft:rgba(108,92,224,.12);--brand-line:rgba(108,92,224,.25);--p2:#4A3DB0;--p3:#4A3DB0;--green:#2F9E6A;--green-soft:rgba(47,158,106,.12);--amber:#C68A28;--amber-soft:rgba(198,138,40,.12);--red:#CE4B43;--red-soft:rgba(206,75,67,.12);
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.dir-root *{box-sizing:border-box;}
.dir-gate{max-width:380px;margin:12vh auto;background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:32px;text-align:center;backdrop-filter:blur(12px);box-shadow:0 24px 80px rgba(20,19,32,.12);}
.dir-gate h1{font:800 22px/1.1 'Outfit';margin:14px 0 6px;}
.dir-gate p{color:var(--ink-2);font-size:14px;margin:0 0 18px;}
.dir-gate input{width:100%;padding:11px 13px;background:var(--bg);border:1px solid var(--line);border-radius:12px;font:400 15px 'Outfit';color:var(--ink);margin-bottom:12px;outline:none;}
.dir-gate input:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft);}
.dir-mk{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--brand),var(--brand-2));display:grid;place-items:center;margin:0 auto;font-family:'Instrument Serif';font-size:24px;color:#fff;}
.dir-mk.sm{width:28px;height:28px;border-radius:8px;font-size:16px;}
.dir-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 28px;background:rgba(248,247,251,.7);backdrop-filter:blur(24px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20;}
.dir-brand{display:flex;align-items:center;gap:10px;font:800 17px/1 'Outfit';}.dir-brand i{color:var(--p2);font-style:normal;}
.dir-tag{font:600 11px/1 'Outfit';letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);padding:5px 9px;border:1px solid var(--line);border-radius:100px;}
.dir-navr{display:flex;gap:16px;align-items:center;}
.dir-link{color:var(--p2);font:600 13px/1 'Outfit';text-decoration:none;}
.dir-search-bar{display:flex;align-items:center;gap:16px;padding:18px 28px;border-bottom:1px solid var(--line);flex-wrap:wrap;background:var(--bg2);}
.dir-search{flex:1;min-width:220px;display:flex;align-items:center;gap:10px;background:var(--surf);border:1px solid var(--line);border-radius:12px;padding:10px 14px;color:var(--ink-3);}
.dir-search input{flex:1;background:none;border:none;outline:none;color:var(--ink);font:400 14.5px 'Outfit';}
.dir-search input::placeholder{color:var(--ink-3);}
.dir-check{display:flex;align-items:center;gap:8px;font:500 13px/1 'Outfit';color:var(--ink-2);white-space:nowrap;}
.dir-count{color:var(--ink-3);font-size:13px;white-space:nowrap;}
.dir-az{display:flex;gap:4px;padding:12px 28px;flex-wrap:wrap;border-bottom:1px solid var(--line);background:var(--bg2);}
.dir-azbtn{width:26px;height:26px;border-radius:7px;border:1px solid transparent;background:none;color:var(--ink-3);font:600 12px/1 'Outfit';cursor:pointer;}
.dir-azbtn:disabled{opacity:.25;cursor:default;}
.dir-azbtn:not(:disabled):hover{background:var(--surf2);color:var(--ink);}
.dir-azbtn.on{background:var(--brand);color:#fff;}
.dir-body{display:grid;grid-template-columns:240px 1fr;gap:0;max-width:1400px;margin:0 auto;}
@media(max-width:860px){.dir-body{grid-template-columns:1fr;}}
.dir-side{padding:24px 20px;border-right:1px solid var(--line);position:sticky;top:0;align-self:start;max-height:100vh;overflow-y:auto;}
@media(max-width:860px){.dir-side{border-right:none;border-bottom:1px solid var(--line);position:static;max-height:none;}}
.dir-side-head{display:flex;justify-content:space-between;align-items:center;font:700 11px/1 'Outfit';letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-bottom:16px;}
.dir-side-head button{background:none;border:none;color:var(--p2);font:600 11px/1 'Outfit';cursor:pointer;text-transform:none;letter-spacing:0;}
.dir-facet{margin-bottom:26px;}
.dir-facet-h{font:700 12px/1 'Outfit';color:var(--ink);margin-bottom:10px;}
.dir-cb{display:flex;align-items:center;gap:9px;padding:6px 0;cursor:pointer;font:400 13.5px 'Outfit';color:var(--ink-2);}
.dir-cb input{accent-color:var(--brand);}
.dir-cb span{flex:1;}
.dir-cb em{font-style:normal;color:var(--ink-3);font-size:12px;background:var(--surf);border-radius:100px;padding:1px 7px;}
.dir-empty-mini{color:var(--ink-3);font-size:12.5px;}
.dir-main{padding:24px 28px 80px;}
.dir-empty{background:var(--surf);border:1px dashed var(--line-2);border-radius:16px;padding:44px;text-align:center;color:var(--ink-2);font-size:14.5px;}
.dir-empty a{color:var(--p2);}
.dir-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}
.dir-card{text-align:left;background:var(--surf);border:1px solid var(--line);border-radius:16px;padding:18px;cursor:pointer;display:flex;flex-direction:column;gap:12px;transition:.15s;backdrop-filter:blur(8px);position:relative;}
.dir-card:hover{border-color:var(--brand-line);transform:translateY(-2px);box-shadow:0 16px 40px -16px rgba(20,19,32,.16);}
.dir-avatar{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--brand),var(--brand-2));color:#fff;display:grid;place-items:center;font:700 15px 'Outfit';flex:none;}
.dir-avatar.lg{width:56px;height:56px;font-size:19px;border-radius:14px;}
.dir-card-body{flex:1;}
.dir-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;}
.dir-card-head b{font:700 15.5px 'Outfit';color:var(--ink);line-height:1.3;}
.dir-badge{font:600 10.5px/1 'Outfit';padding:4px 9px;border-radius:100px;text-transform:capitalize;white-space:nowrap;}
.dir-badge.approved{background:var(--green-soft);color:var(--green);}
.dir-badge.pending{background:var(--amber-soft);color:var(--amber);}
.dir-badge.paused,.dir-badge.rejected{background:var(--surf2);color:var(--ink-3);}
.dir-card-industry{font:500 11.5px/1 'Outfit';color:var(--ink-3);margin-bottom:8px;}
.dir-card-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
.dir-card-tags span{font:500 11.5px/1 'Outfit';padding:5px 9px;border-radius:100px;background:var(--brand-soft);color:var(--p3);}
.dir-card-tags .dir-more{background:var(--surf2);color:var(--ink-3);}
.dir-card-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--ink-3);font-size:12.5px;}
.dir-file-badge{display:inline-flex;align-items:center;gap:4px;color:var(--ink-2);}
.dir-view{align-self:flex-end;color:var(--p2);font:600 12.5px/1 'Outfit';}
.dir-overlay{position:fixed;inset:0;background:rgba(20,19,32,.6);backdrop-filter:blur(4px);display:flex;justify-content:flex-end;z-index:50;}
.dir-drawer{width:min(520px,100%);height:100%;background:rgba(255,255,255,.92);backdrop-filter:blur(24px);border-left:1px solid var(--line);overflow-y:auto;padding:28px;position:relative;}
.dir-x{position:absolute;top:18px;right:18px;border:none;background:none;font-size:16px;color:var(--ink-3);cursor:pointer;}
.dir-drawer-top{display:flex;gap:16px;align-items:flex-start;margin-bottom:20px;}
.dir-drawer h2{font:800 22px/1.15 'Outfit';margin:8px 0 2px;}
.dir-ref{color:var(--ink-3);font:600 12px/1 'Outfit';}
.dir-kv{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;}
.dir-kv label{display:block;font:700 10px/1 'Outfit';text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);margin-bottom:4px;}
.dir-kv span{font-size:14px;color:var(--ink);word-break:break-word;}
.dir-lbl{font:700 11px/1 'Outfit';letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:18px 0 10px;}
.dir-chips{display:flex;flex-wrap:wrap;gap:7px;}
.dir-chip{padding:5px 11px;border-radius:100px;background:var(--brand-soft);border:1px solid var(--brand-line);color:var(--p3);font:600 12px/1 'Outfit';}
.dir-desc{color:var(--ink-2);font-size:14px;line-height:1.6;margin:0;}
.dir-broch{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.dir-broch li{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-size:13px;background:var(--surf);}
.dir-broch a{color:var(--p2);}
.dir-broch small{color:var(--ink-3);}
.dir-vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:6px;}
.dir-vcard{background:var(--surf);border:1px solid var(--line);border-radius:10px;overflow:hidden;}
.dir-viframe{position:relative;padding-top:56.25%;background:#000;}
.dir-viframe iframe{position:absolute;inset:0;width:100%;height:100%;border:none;}
.dir-vlink{display:block;padding:14px;color:var(--p2);font-size:12.5px;word-break:break-all;}
.dir-row{display:flex;gap:8px;flex-wrap:wrap;}
.dir-btn{font-family:'Outfit';border:none;cursor:pointer;font:600 13px/1 'Outfit';border-radius:9px;padding:10px 15px;background:var(--brand);color:#fff;box-shadow:0 4px 16px rgba(108,92,224,.3);}
.dir-btn:hover{background:var(--brand-2);}.dir-btn:disabled{opacity:.5;cursor:default;}
.dir-btn.ghost{background:var(--surf);border:1px solid var(--line);color:var(--ink);box-shadow:none;}
.dir-btn.ghost:hover{border-color:var(--brand-line);}
.dir-btn.green{background:#227A50;box-shadow:none;}.dir-btn.green:hover{background:#1A5F3E;}
.dir-ta{width:100%;padding:11px 13px;background:var(--bg);border:1px solid var(--line);border-radius:10px;font:400 14px/1.5 'Outfit';color:var(--ink);outline:none;resize:vertical;margin-bottom:10px;}
.dir-ta:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft);}
.dir-msg{margin-top:10px;padding:9px 12px;background:var(--brand-soft);border:1px solid var(--brand-line);border-radius:9px;color:var(--p3);font:500 13px/1.4 'Outfit';}
.dir-root button,.dir-root a{transition:background .15s ease,border-color .15s ease,color .15s ease;}
.dir-root button:focus-visible,.dir-root a:focus-visible,.dir-root input:focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:6px;}
`;
