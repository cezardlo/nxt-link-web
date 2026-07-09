'use client';

// Buyer profile — customers introduce themselves: company logo, company name,
// their own name, position, industry, city, phone. Used to prefill requests
// and give vendors context once a deal is accepted.

import { useEffect, useState } from 'react';

const INDUSTRIES = [
  'Warehousing & 3PL', 'Manufacturing', 'Retail & E-commerce', 'Food & Beverage', 'Automotive',
  'Cold Chain', 'Import / Export & Customs', 'Construction', 'Distribution Centers',
  'Pharma & Healthcare', 'Aerospace & Defense', 'General Industrial',
];
const COUNTRY_CODES = [
  { c: '+1', n: 'US / Canada (+1)' }, { c: '+52', n: 'Mexico (+52)' }, { c: '+44', n: 'UK (+44)' },
  { c: '+34', n: 'Spain (+34)' }, { c: '+49', n: 'Germany (+49)' }, { c: '+86', n: 'China (+86)' },
  { c: '+91', n: 'India (+91)' }, { c: '+81', n: 'Japan (+81)' },
];
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
  const [checking, setChecking] = useState(true);
  const [state, setState] = useState<'signed-out' | 'unverified' | 'ok'>('signed-out');
  const [p, setP] = useState<Profile>({ company_name: '', contact_name: '', position: '', industry: '', city: '', phone: '' });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [customInd, setCustomInd] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    document.title = 'My profile — NXT//LINK';
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
    setMsg(data.ok ? 'Saved.' : (data.message || 'Could not save'));
    setSaving(false);
  }
  async function uploadLogo(file: File) {
    setLogoBusy(true); setMsg('');
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/buyer/profile/logo', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.ok) setLogoUrl(data.logo_url || null); else setMsg(data.message || 'Upload failed');
    setLogoBusy(false);
  }
  async function removeLogo() {
    setLogoUrl(null);
    await fetch('/api/buyer/profile/logo', { method: 'DELETE' });
  }

  const phone = parsePhone(p.phone || '');
  const emitPhone = (code: string, num: string) => set('phone', num.trim() ? `${code} ${num.trim()}` : '');

  return (
    <div className="bp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="bp-nav">
        <a className="bp-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>My profile</span></a>
        <a className="bp-link" href="/buyer">My dashboard</a>
      </nav>
      <main className="bp-wrap">
        {checking ? <div className="bp-empty">Loading…</div>
          : state === 'signed-out' ? <div className="bp-empty">Sign in to set up your profile — <a href="/login">go to sign in</a></div>
          : state === 'unverified' ? <div className="bp-empty">Verify your email first — check your inbox for the confirmation link.</div>
          : (
            <>
              <h1>Your profile</h1>
              <p className="bp-sub">Tell vendors who they&apos;re dealing with. This prefills your requests and is shared with a vendor only after you accept their quote.</p>
              {msg && <div className={msg === 'Saved.' ? 'bp-ok' : 'bp-err'}>{msg}</div>}

              <section className="bp-card">
                <div className="bp-lbl">Company logo / photo</div>
                <div className="bp-logo">
                  <div className="bp-logobox">{logoUrl ? <img src={logoUrl} alt="Company logo" /> : <span>Logo</span>}</div>
                  <div className="bp-logoactions">
                    <label className="bp-btn sm bp-logobtn">
                      {logoBusy ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload'}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={logoBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ''; }} />
                    </label>
                    {logoUrl && <button className="bp-ghost" type="button" onClick={removeLogo}>Remove</button>}
                  </div>
                </div>

                <div className="bp-grid">
                  <label>Company name<input value={p.company_name || ''} onChange={(e) => set('company_name', e.target.value)} placeholder="e.g. Borderplex Logistics LLC" /></label>
                  <label>Your name<input value={p.contact_name || ''} onChange={(e) => set('contact_name', e.target.value)} placeholder="e.g. Cesar de la O" /></label>
                  <label>Your position<input value={p.position || ''} onChange={(e) => set('position', e.target.value)} placeholder="e.g. Operations Manager" /></label>
                  <label>City<input value={p.city || ''} onChange={(e) => set('city', e.target.value)} placeholder="e.g. El Paso, TX" /></label>
                </div>

                <div className="bp-lbl" style={{ marginTop: 20 }}>Industry you&apos;re in</div>
                <div className="bp-chips">
                  {Array.from(new Set([...INDUSTRIES, ...(p.industry && !INDUSTRIES.includes(p.industry) ? [p.industry] : [])])).map((i) => (
                    <button key={i} type="button" className={'bp-chip' + (p.industry === i ? ' on' : '')} onClick={() => set('industry', p.industry === i ? '' : i)}>{i}</button>
                  ))}
                </div>
                <div className="bp-addown">
                  <input value={customInd} placeholder="Or type your own industry…" onChange={(e) => setCustomInd(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && customInd.trim()) { set('industry', customInd.trim()); setCustomInd(''); } }} />
                  <button className="bp-btn sm" type="button" onClick={() => { if (customInd.trim()) { set('industry', customInd.trim()); setCustomInd(''); } }}>Set</button>
                </div>

                <div className="bp-lbl" style={{ marginTop: 20 }}>Phone</div>
                <div className="bp-phone">
                  <select value={phone.code} onChange={(e) => emitPhone(e.target.value, phone.number)}>
                    {COUNTRY_CODES.some((o) => o.c === phone.code) ? null : <option value={phone.code}>{phone.code}</option>}
                    {COUNTRY_CODES.map((o) => <option key={o.n} value={o.c}>{o.n}</option>)}
                  </select>
                  <input inputMode="tel" placeholder="Phone number" value={phone.number} onChange={(e) => emitPhone(phone.code, e.target.value)} />
                </div>

                <button className="bp-btn" style={{ marginTop: 22 }} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save profile'}</button>
              </section>
            </>
          )}
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.bp{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.bp *{box-sizing:border-box;}
.bp-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);z-index:20;}
.bp-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.bp-brand b{font-size:17px;}.bp-brand i{color:#A78BFA;font-style:normal;}
.bp-brand span{color:#8080A0;font-size:13px;}
.bp-link{color:#A78BFA;font-size:13.5px;font-weight:600;text-decoration:none;}
.bp-wrap{max-width:640px;margin:0 auto;padding:36px 20px 100px;}
.bp-wrap h1{font-size:26px;font-weight:800;letter-spacing:-.02em;}
.bp-sub{color:#8080A0;font-size:14px;margin:6px 0 18px;line-height:1.6;}
.bp-empty{text-align:center;color:#8080A0;padding:70px 0;}
.bp-empty a{color:#A78BFA;}
.bp-ok{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3);color:#34D399;border-radius:10px;padding:10px 14px;font-size:13.5px;margin-bottom:14px;}
.bp-err{background:rgba(252,165,165,.08);border:1px solid rgba(252,165,165,.3);color:#FCA5A5;border-radius:10px;padding:10px 14px;font-size:13.5px;margin-bottom:14px;}
.bp-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:24px;}
.bp-lbl{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#A78BFA;margin-bottom:12px;}
.bp-logo{display:flex;align-items:center;gap:16px;margin-bottom:20px;}
.bp-logobox{width:76px;height:76px;flex-shrink:0;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;display:grid;place-items:center;overflow:hidden;color:#505068;font-size:12px;letter-spacing:.12em;text-transform:uppercase;}
.bp-logobox img{width:100%;height:100%;object-fit:contain;}
.bp-logoactions{display:flex;gap:10px;align-items:center;}
.bp-logobtn{position:relative;overflow:hidden;}
.bp-logobtn input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0;}
.bp-ghost{font-family:inherit;background:none;border:1px solid rgba(255,255,255,.12);color:#C0C0D0;font-size:13px;border-radius:9px;padding:9px 14px;cursor:pointer;}
.bp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:520px){.bp-grid{grid-template-columns:1fr;}}
.bp-grid label,.bp-phone{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:500;color:#C0C0D0;}
.bp-grid input,.bp-addown input,.bp-phone input,.bp-phone select{font-family:inherit;font-size:14.5px;padding:11px 13px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;width:100%;}
.bp-grid input:focus,.bp-addown input:focus,.bp-phone input:focus{border-color:#7C5CFC;}
.bp-chips{display:flex;flex-wrap:wrap;gap:8px;}
.bp-chip{font-family:inherit;font-size:12.5px;font-weight:500;padding:8px 13px;border-radius:99px;border:1px solid rgba(255,255,255,.12);background:none;color:#C0C0D0;cursor:pointer;}
.bp-chip:hover{border-color:rgba(124,92,252,.5);}
.bp-chip.on{background:rgba(124,92,252,.15);border-color:#7C5CFC;color:#C4B5FD;}
.bp-addown{display:flex;gap:9px;margin-top:11px;}
.bp-phone{flex-direction:row;gap:9px;}
.bp-phone select{max-width:170px;}
.bp-btn{font-family:inherit;font-size:14.5px;font-weight:700;padding:12px 20px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;}
.bp-btn:hover{background:#6344DF;}.bp-btn:disabled{opacity:.6;}
.bp-btn.sm{padding:10px 16px;font-size:13.5px;}
`;
