'use client';

// Public listing detail page — Carvana-style tabs: Overview, Specs/Process,
// Pilot, Implementation, Pricing, Warranty & Support, Documents, Case Studies,
// plus related listings and an inline Request Quote / Request Service form.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Detail {
  kind: 'product' | 'service';
  listing: Record<string, unknown>;
  images: Array<{ path: string; url: string | null }>;
  documents: Array<{ id: string; file_name: string; title: string | null; ai_summary: string | null; url: string | null }>;
  case_studies: Array<{ id: string; title: string; challenge: string | null; solution: string | null; results: string[] | null }>;
  vendor: { company_name: string; city: string | null; website: string | null; description: string | null } | null;
  related: { same_vendor: Array<{ id: string; kind: string; name: string; category: string }>; same_category: Array<{ id: string; kind: string; name: string; category: string }> };
}

const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

export default function ListingDetailPage() {
  const params = useParams<{ kind: string; id: string }>();
  const kind = params.kind === 'service' ? 'service' : 'product';
  const [d, setD] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState('overview');
  const [imgIdx, setImgIdx] = useState(0);

  // Quote form
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const startedAtRef = useRef(Date.now());
  const [sending, setSending] = useState(false);
  const [sentRef, setSentRef] = useState('');
  const [formMsg, setFormMsg] = useState('');

  useEffect(() => {
    fetch(`/api/marketplace/listings/${params.id}?kind=${kind}`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) setD(data); else setMissing(true); })
      .catch(() => setMissing(true));
  }, [params.id, kind]);

  async function submitQuote(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setFormMsg('');
    try {
      const res = await fetch('/api/marketplace/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, listing_id: params.id, company, contact_name: contact, email, phone, message, website_url: websiteUrl, started_at: startedAtRef.current }),
      });
      const data = await res.json();
      if (data.ok) setSentRef(data.public_ref || 'received');
      else setFormMsg(data.message || 'Could not send');
    } catch { setFormMsg('Could not send'); }
    setSending(false);
  }

  if (missing) return <div className="dt"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="dt-empty">Listing not found. <Link href="/marketplace">Back to marketplace</Link></div></div>;
  if (!d) return <div className="dt"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="dt-empty">Loading…</div></div>;

  const L = d.listing;
  const pilot = obj(L.pilot); const impl = obj(L.implementation); const ws = obj(L.warranty_support);
  const pricing = obj(L.pricing); const fit = obj(L.fit); const roi = obj(L.roi);
  const specs = obj(L.specs);

  const TABS: Array<[string, string, boolean]> = [
    ['overview', 'Overview', true],
    [kind === 'product' ? 'specs' : 'process', kind === 'product' ? 'Specs' : 'Process', kind === 'product' ? Object.keys(specs).length > 0 : arr(L.process).length > 0],
    ['pilot', 'Pilot / Demo', Object.keys(pilot).length > 0],
    ['implementation', 'Implementation', Object.keys(impl).length > 0],
    ['pricing', 'Pricing', Object.keys(pricing).length > 0 || Boolean(s(L.pricing_model))],
    ['warranty', 'Warranty & Support', Object.keys(ws).length > 0],
    ['documents', 'Documents', d.documents.length > 0],
    ['cases', 'Case Studies', d.case_studies.length > 0],
  ];

  const related = [...d.related.same_vendor, ...d.related.same_category];

  return (
    <div className="dt">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="dt-nav">
        <Link className="dt-brand" href="/marketplace">← Marketplace</Link>
        <span className={'dt-kind ' + kind}>{kind}</span>
      </nav>

      <div className="dt-wrap">
        <div className="dt-main">
          <div className="dt-gallery">
            {d.images.length > 0 ? (
              <>
                <div className="dt-img">{d.images[imgIdx]?.url && <img src={d.images[imgIdx].url!} alt={s(L.name)} />}</div>
                {d.images.length > 1 && (
                  <div className="dt-thumbs">
                    {d.images.map((im, i) => (
                      <button key={im.path} className={i === imgIdx ? 'on' : ''} onClick={() => setImgIdx(i)}>{im.url && <img src={im.url} alt="" />}</button>
                    ))}
                  </div>
                )}
              </>
            ) : <div className="dt-img dt-noimg">{kind === 'product' ? 'Product' : 'Service'}</div>}
          </div>

          <div className="dt-head">
            <h1>{s(L.name)}</h1>
            <div className="dt-sub">{s(L.category)}{d.vendor ? ` · ${d.vendor.company_name}` : ''}{d.vendor?.city ? ` · ${d.vendor.city}` : ''}</div>
            <div className="dt-badges">
              {Boolean(pilot.available) && <span>Pilot available</span>}
              {s(ws.warranty) && <span>Warranty</span>}
              {s(L.lead_time) && <span>Lead time: {s(L.lead_time)}</span>}
              {s(L.response_time) && <span>Response: {s(L.response_time)}</span>}
              {Boolean(L.emergency_available) && <span className="urgent">24/7 emergency</span>}
              {arr(L.availability).map((a) => <span key={a}>{a}</span>)}
            </div>
          </div>

          <div className="dt-tabs">
            {TABS.filter(([, , show]) => show).map(([key, label]) => (
              <button key={key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>

          <div className="dt-panel">
            {tab === 'overview' && (
              <>
                <p className="dt-overview">{s(L.overview) || 'No description provided yet.'}</p>
                {arr(L.best_for).length > 0 && <Row label="Best for" items={arr(L.best_for)} />}
                {arr(L.industries).length > 0 && <Row label="Industries" items={arr(L.industries)} />}
                {arr(L.use_cases).length > 0 && <Row label="Use cases" items={arr(L.use_cases)} />}
                {arr(L.service_areas).length > 0 && <Row label="Service areas" items={arr(L.service_areas)} />}
                {arr(L.certifications).length > 0 && <Row label="Certifications" items={arr(L.certifications)} />}
                {arr(fit.company_sizes).length > 0 && <Row label="Company sizes" items={arr(fit.company_sizes)} />}
                {arr(roi.drivers).length > 0 && <Row label="ROI drivers" items={arr(roi.drivers)} />}
              </>
            )}
            {tab === 'specs' && (
              <table className="dt-specs"><tbody>
                {Object.entries(specs).map(([k, v]) => <tr key={k}><td>{k}</td><td>{String(v)}</td></tr>)}
              </tbody></table>
            )}
            {tab === 'process' && (
              <ol className="dt-process">{arr(L.process).map((p, i) => <li key={i}>{p}</li>)}</ol>
            )}
            {tab === 'pilot' && (
              <dl className="dt-kv">
                {Boolean(pilot.available) && <Item k="Pilot" v="Available" />}
                <Item k="Duration" v={s(pilot.duration)} /><Item k="Cost" v={s(pilot.cost)} /><Item k="Scope" v={s(pilot.scope)} />
                {arr(pilot.success_criteria).length > 0 && <Item k="Success criteria" v={arr(pilot.success_criteria).join(' · ')} />}
              </dl>
            )}
            {tab === 'implementation' && (
              <dl className="dt-kv">
                {arr(impl.requirements).length > 0 && <Item k="Requirements" v={arr(impl.requirements).join(' · ')} />}
                <Item k="Typical timeline" v={s(impl.typical_timeline)} /><Item k="Training" v={s(impl.training)} />
                {arr(impl.integrations).length > 0 && <Item k="Integrations" v={arr(impl.integrations).join(' · ')} />}
              </dl>
            )}
            {tab === 'pricing' && (
              <dl className="dt-kv">
                <Item k="Model" v={s(pricing.model) || s(L.pricing_model)} /><Item k="Range" v={s(pricing.range)} />
                {(pricing.buy || pricing.rent || pricing.lease) ? <Item k="Options" v={['buy', 'rent', 'lease'].filter((o) => pricing[o]).join(' · ')} /> : null}
                <Item k="Notes" v={s(pricing.notes)} />
                {!s(pricing.range) && <p className="dt-hint">Exact pricing depends on your situation — request a quote below.</p>}
              </dl>
            )}
            {tab === 'warranty' && (
              <dl className="dt-kv">
                <Item k="Warranty" v={s(ws.warranty)} />
                {arr(ws.support_channels).length > 0 && <Item k="Support" v={arr(ws.support_channels).join(' · ')} />}
                <Item k="SLA" v={s(ws.sla)} /><Item k="Maintenance" v={s(ws.maintenance)} />
              </dl>
            )}
            {tab === 'documents' && (
              <ul className="dt-docs">
                {d.documents.map((doc) => (
                  <li key={doc.id}>
                    {doc.url ? <a href={doc.url} target="_blank" rel="noreferrer">{doc.title || doc.file_name}</a> : <span>{doc.title || doc.file_name}</span>}
                    {doc.ai_summary && <p>{doc.ai_summary}</p>}
                  </li>
                ))}
              </ul>
            )}
            {tab === 'cases' && (
              <div className="dt-cases">
                {d.case_studies.map((c) => (
                  <div className="dt-case" key={c.id}>
                    <b>{c.title}</b>
                    {c.challenge && <p><span>Challenge:</span> {c.challenge}</p>}
                    {c.solution && <p><span>Solution:</span> {c.solution}</p>}
                    {Array.isArray(c.results) && c.results.length > 0 && <p><span>Results:</span> {c.results.join(' · ')}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {related.length > 0 && (
            <div className="dt-related">
              <h3>Related listings</h3>
              <div className="dt-relgrid">
                {related.slice(0, 4).map((r) => (
                  <Link key={r.id} href={`/marketplace/${r.kind}/${r.id}`} className="dt-relcard">
                    <span className={'dt-kind ' + r.kind}>{r.kind}</span>
                    <b>{r.name}</b>
                    <small>{r.category}</small>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="dt-side" id="quote">
          <div className="dt-quote">
            <h3>{kind === 'product' ? 'Request a quote' : 'Request this service'}</h3>
            {d.vendor && <p className="dt-hint">Goes directly to {d.vendor.company_name}. Your info is never shown publicly.</p>}
            {sentRef ? (
              <div className="dt-sent">Request sent. Reference: <b>{sentRef}</b>. The vendor will contact you at the email you provided.</div>
            ) : (
              <form onSubmit={submitQuote}>
                <input type="text" name="website_url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
                <input placeholder="Company *" value={company} onChange={(e) => setCompany(e.target.value)} required />
                <input placeholder="Your name" value={contact} onChange={(e) => setContact(e.target.value)} />
                <input placeholder="Work email *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <textarea placeholder={kind === 'product' ? 'What do you need? Quantity, timeline, site details…' : 'What do you need done? Location, urgency, equipment…'} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
                {formMsg && <div className="dt-err">{formMsg}</div>}
                <button type="submit" disabled={sending}>{sending ? 'Sending…' : kind === 'product' ? 'Request quote' : 'Request service'}</button>
              </form>
            )}
          </div>
          {d.vendor?.description && (
            <div className="dt-vendorcard">
              <h4>{d.vendor.company_name}</h4>
              <p>{d.vendor.description.slice(0, 300)}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, items }: { label: string; items: string[] }) {
  return <div className="dt-row"><span>{label}</span><div>{items.map((t) => <em key={t}>{t}</em>)}</div></div>;
}
function Item({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return <div className="dt-item"><dt>{k}</dt><dd>{v}</dd></div>;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.dt{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.dt *{box-sizing:border-box;}
.dt-empty{min-height:60vh;display:grid;place-items:center;color:#8080A0;}
.dt-empty a{color:#A78BFA;}
.dt-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.85);backdrop-filter:blur(20px);z-index:20;}
.dt-brand{color:#C0C0D0;text-decoration:none;font-size:14px;font-weight:600;}
.dt-kind{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 9px;border-radius:99px;}
.dt-kind.product{background:rgba(124,92,252,.15);color:#C4B5FD;}
.dt-kind.service{background:rgba(52,211,153,.12);color:#34D399;}
.dt-wrap{max-width:1080px;margin:0 auto;padding:28px 20px 100px;display:grid;grid-template-columns:1fr 340px;gap:26px;}
@media(max-width:900px){.dt-wrap{grid-template-columns:1fr;}}
.dt-img{height:320px;border-radius:16px;overflow:hidden;background:#14141F;border:1px solid rgba(255,255,255,.08);}
.dt-img img{width:100%;height:100%;object-fit:cover;}
.dt-noimg{display:grid;place-items:center;color:#505068;letter-spacing:.15em;text-transform:uppercase;font-size:14px;}
.dt-thumbs{display:flex;gap:8px;margin-top:10px;}
.dt-thumbs button{width:64px;height:48px;border-radius:8px;overflow:hidden;border:1.5px solid rgba(255,255,255,.1);background:#14141F;cursor:pointer;padding:0;}
.dt-thumbs button.on{border-color:#7C5CFC;}
.dt-thumbs img{width:100%;height:100%;object-fit:cover;}
.dt-head h1{font-size:clamp(22px,3.4vw,32px);font-weight:800;letter-spacing:-.02em;margin-top:20px;}
.dt-sub{color:#8080A0;font-size:14px;margin-top:6px;}
.dt-badges{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;}
.dt-badges span{font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;}
.dt-badges span.urgent{background:rgba(251,191,36,.12);color:#FBBF24;}
.dt-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-top:22px;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:10px;}
.dt-tabs button{font-family:inherit;font-size:13px;font-weight:600;padding:8px 13px;border-radius:9px;border:none;background:none;color:#8080A0;cursor:pointer;}
.dt-tabs button.on{background:rgba(124,92,252,.15);color:#C4B5FD;}
.dt-panel{padding:20px 2px;min-height:120px;}
.dt-overview{font-size:15px;line-height:1.7;color:#D5D4E0;font-weight:300;margin-bottom:18px;white-space:pre-wrap;}
.dt-row{display:flex;gap:14px;margin-bottom:12px;align-items:baseline;}
.dt-row>span{font-size:12px;color:#8080A0;min-width:110px;}
.dt-row em{font-style:normal;font-size:12.5px;color:#A78BFA;background:rgba(124,92,252,.08);padding:3px 9px;border-radius:6px;margin:0 5px 5px 0;display:inline-block;}
.dt-specs{width:100%;border-collapse:collapse;font-size:14px;}
.dt-specs td{padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.06);}
.dt-specs td:first-child{color:#8080A0;width:40%;}
.dt-process{padding-left:20px;display:flex;flex-direction:column;gap:10px;font-size:14.5px;color:#D5D4E0;line-height:1.5;}
.dt-kv{margin:0;}
.dt-item{display:flex;gap:14px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);}
.dt-item dt{color:#8080A0;font-size:13px;min-width:130px;}
.dt-item dd{margin:0;font-size:14px;color:#D5D4E0;line-height:1.5;}
.dt-hint{color:#8080A0;font-size:13px;line-height:1.5;margin-top:12px;}
.dt-docs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;}
.dt-docs a{color:#A78BFA;font-size:14.5px;}
.dt-docs p{color:#8080A0;font-size:13px;margin:5px 0 0;line-height:1.5;}
.dt-cases{display:flex;flex-direction:column;gap:14px;}
.dt-case{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 18px;}
.dt-case b{font-size:15px;}
.dt-case p{font-size:13.5px;color:#C0C0D0;margin:8px 0 0;line-height:1.55;}
.dt-case p span{color:#8080A0;}
.dt-related h3{font-size:16px;margin:26px 0 12px;}
.dt-relgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}
.dt-relcard{display:flex;flex-direction:column;gap:6px;background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;text-decoration:none;color:#F0F0F5;}
.dt-relcard:hover{border-color:rgba(124,92,252,.5);}
.dt-relcard b{font-size:14px;}
.dt-relcard small{color:#8080A0;font-size:12px;}
.dt-relcard .dt-kind{align-self:flex-start;}
.dt-side{display:flex;flex-direction:column;gap:16px;}
.dt-quote{background:#14141F;border:1px solid rgba(124,92,252,.3);border-radius:16px;padding:20px;position:sticky;top:74px;}
.dt-quote h3{font-size:17px;margin-bottom:6px;}
.dt-quote form{display:flex;flex-direction:column;gap:10px;margin-top:14px;}
.dt-quote input,.dt-quote textarea{font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;resize:vertical;}
.dt-quote input:focus,.dt-quote textarea:focus{border-color:#7C5CFC;}
.dt-quote button{font-family:inherit;font-size:14.5px;font-weight:700;padding:13px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;}
.dt-quote button:hover{background:#6344DF;}
.dt-quote button:disabled{opacity:.6;}
.dt-sent{margin-top:14px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3);color:#6EE7B7;border-radius:12px;padding:14px;font-size:13.5px;line-height:1.6;}
.dt-err{color:#FCA5A5;font-size:13px;}
.dt-vendorcard{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px;}
.dt-vendorcard h4{font-size:15px;margin-bottom:8px;}
.dt-vendorcard p{font-size:13px;color:#8080A0;line-height:1.6;}
`;
