'use client';

// Public marketplace browse: search, filters, standardized product/service
// cards, save + compare (localStorage, no login needed), request quote via
// the detail page. Amazon-style discovery for industrial buyers.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface Card {
  id: string; kind: 'product' | 'service'; name: string; category: string;
  overview: string | null; best_for: string[]; industries: string[];
  image_url: string | null; vendor_name: string; vendor_city: string | null;
  pilot: { available?: boolean } | null;
  pricing: { model?: string; range?: string } | null;
  warranty_support: { warranty?: string } | null;
  availability?: string[]; lead_time?: string | null;
  service_areas?: string[]; response_time?: string | null; emergency_available?: boolean;
  pricing_model?: string | null;
}

const CATEGORIES = ['', 'Forklifts', 'Warehouse technology', 'Robotics', 'WMS', 'TMS', 'Telematics/ELD', 'Cold Chain', 'Labels / Zebra', 'Electrical service', 'General maintenance', 'IT support', 'Pest control', 'Staffing agency', 'Transportation / FTL / LTL', 'Customs/Cross-Border'];
const INDUSTRIES = ['', 'Warehousing & 3PL', 'Manufacturing', 'Retail & E-commerce', 'Food & Beverage', 'Automotive', 'Cold Chain', 'Distribution Centers', 'Pharma & Healthcare', 'General Industrial'];
const AREAS = ['', 'El Paso', 'Juárez', 'New Mexico', 'West Texas', 'Cross-border', 'National'];

function useLocalSet(key: string): [Set<string>, (id: string) => void] {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { setSet(new Set(JSON.parse(localStorage.getItem(key) || '[]'))); } catch { /* ignore */ }
  }, [key]);
  const toggle = (id: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };
  return [set, toggle];
}

export default function MarketplacePage() {
  const [kind, setKind] = useState<'all' | 'product' | 'service'>('all');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [industry, setIndustry] = useState('');
  const [area, setArea] = useState('');
  const [pilotOnly, setPilotOnly] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, toggleSaved] = useLocalSet('nxt_saved');
  const [compare, toggleCompare] = useLocalSet('nxt_compare');
  const [showCompare, setShowCompare] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const p = new URLSearchParams();
      if (kind !== 'all') p.set('kind', kind);
      if (q.trim()) p.set('q', q.trim());
      if (category) p.set('category', category);
      if (industry) p.set('industry', industry);
      if (area) p.set('area', area);
      if (pilotOnly) p.set('pilot', '1');
      try {
        const res = await fetch(`/api/marketplace/listings?${p}`);
        const data = await res.json();
        setCards(data.listings || []);
      } catch { setCards([]); }
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [kind, q, category, industry, area, pilotOnly]);

  const visible = useMemo(() => (savedOnly ? cards.filter((c) => saved.has(c.id)) : cards), [cards, savedOnly, saved]);
  const compareCards = useMemo(() => cards.filter((c) => compare.has(c.id)).slice(0, 3), [cards, compare]);

  return (
    <div className="mk">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="mk-nav">
        <Link className="mk-brand" href="/"><b>NXT<i>//</i>LINK</b><span>Marketplace</span></Link>
        <div className="mk-navr">
          <button className={'mk-pill' + (savedOnly ? ' on' : '')} onClick={() => setSavedOnly(!savedOnly)}>Saved ({saved.size})</button>
          <Link className="mk-pill" href="/vendor-login">For vendors</Link>
        </div>
      </nav>

      <header className="mk-hero">
        <h1>Find industrial products &amp; services</h1>
        <p>Standardized listings from verified Borderplex vendors — pilots, implementation, warranties, and pricing up front.</p>
        <input className="mk-search" placeholder="Search products, services, categories…" value={q} onChange={(e) => setQ(e.target.value)} />
      </header>

      <div className="mk-filters">
        <div className="mk-tabs">
          {(['all', 'product', 'service'] as const).map((k) => (
            <button key={k} className={'mk-tab' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>
              {k === 'all' ? 'Everything' : k === 'product' ? 'Products' : 'Services'}
            </button>
          ))}
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c || 'All categories'}</option>)}</select>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)}>{INDUSTRIES.map((c) => <option key={c} value={c}>{c || 'All industries'}</option>)}</select>
        <select value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map((c) => <option key={c} value={c}>{c || 'All service areas'}</option>)}</select>
        <label className="mk-check"><input type="checkbox" checked={pilotOnly} onChange={(e) => setPilotOnly(e.target.checked)} /> Pilot available</label>
      </div>

      <main className="mk-grid-wrap">
        {loading ? <div className="mk-empty">Loading…</div>
          : visible.length === 0 ? <div className="mk-empty">No listings match yet. Try clearing filters{savedOnly ? ' or the Saved view' : ''}.</div>
          : (
            <div className="mk-grid">
              {visible.map((c) => (
                <div className="mk-card" key={c.id}>
                  <Link href={`/marketplace/${c.kind}/${c.id}`} className="mk-card-img">
                    {c.image_url ? <img src={c.image_url} alt={c.name} /> : <div className="mk-noimg">{c.kind === 'product' ? 'Product' : 'Service'}</div>}
                  </Link>
                  <div className="mk-card-body">
                    <div className="mk-kindrow">
                      <span className={'mk-kind ' + c.kind}>{c.kind}</span>
                      {c.pilot?.available && <span className="mk-badge">Pilot available</span>}
                      {c.warranty_support?.warranty && <span className="mk-badge">Warranty</span>}
                      {c.emergency_available && <span className="mk-badge urgent">24/7</span>}
                    </div>
                    <Link href={`/marketplace/${c.kind}/${c.id}`} className="mk-name">{c.name}</Link>
                    <div className="mk-vendor">{c.vendor_name}{c.vendor_city ? ` · ${c.vendor_city}` : ''}</div>
                    {c.best_for.length > 0 && (
                      <div className="mk-tags">{c.best_for.slice(0, 3).map((t) => <span key={t}>Best for: {t}</span>)}</div>
                    )}
                    <div className="mk-meta">
                      {c.kind === 'product' && c.lead_time && <span>Lead time: {c.lead_time}</span>}
                      {c.kind === 'service' && c.response_time && <span>Response: {c.response_time}</span>}
                      {(c.pricing?.range || c.pricing_model) && <span>{c.pricing?.range || c.pricing_model}</span>}
                    </div>
                    <div className="mk-actions">
                      <button className={'mk-mini' + (saved.has(c.id) ? ' on' : '')} onClick={() => toggleSaved(c.id)}>{saved.has(c.id) ? 'Saved' : 'Save'}</button>
                      <button className={'mk-mini' + (compare.has(c.id) ? ' on' : '')} onClick={() => toggleCompare(c.id)}>{compare.has(c.id) ? 'In compare' : 'Compare'}</button>
                      <Link className="mk-quote" href={`/marketplace/${c.kind}/${c.id}#quote`}>{c.kind === 'product' ? 'Request quote' : 'Request service'}</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </main>

      {compareCards.length > 0 && (
        <div className="mk-cbar">
          <span>{compareCards.length} selected to compare</span>
          <button className="mk-mini on" onClick={() => setShowCompare(true)} disabled={compareCards.length < 2}>Compare now</button>
          <button className="mk-mini" onClick={() => compareCards.forEach((c) => toggleCompare(c.id))}>Clear</button>
        </div>
      )}

      {showCompare && compareCards.length >= 2 && (
        <div className="mk-modal" onClick={() => setShowCompare(false)}>
          <div className="mk-modal-in" onClick={(e) => e.stopPropagation()}>
            <div className="mk-modal-head"><b>Compare</b><button onClick={() => setShowCompare(false)}>Close</button></div>
            <div className="mk-ctable-wrap">
              <table className="mk-ctable">
                <thead><tr><th></th>{compareCards.map((c) => <th key={c.id}><Link href={`/marketplace/${c.kind}/${c.id}`}>{c.name}</Link></th>)}</tr></thead>
                <tbody>
                  <tr><td>Vendor</td>{compareCards.map((c) => <td key={c.id}>{c.vendor_name}</td>)}</tr>
                  <tr><td>Type</td>{compareCards.map((c) => <td key={c.id}>{c.kind}</td>)}</tr>
                  <tr><td>Category</td>{compareCards.map((c) => <td key={c.id}>{c.category}</td>)}</tr>
                  <tr><td>Best for</td>{compareCards.map((c) => <td key={c.id}>{c.best_for.join(', ') || '—'}</td>)}</tr>
                  <tr><td>Pilot</td>{compareCards.map((c) => <td key={c.id}>{c.pilot?.available ? 'Available' : '—'}</td>)}</tr>
                  <tr><td>Lead / response</td>{compareCards.map((c) => <td key={c.id}>{c.lead_time || c.response_time || '—'}</td>)}</tr>
                  <tr><td>Pricing</td>{compareCards.map((c) => <td key={c.id}>{c.pricing?.range || c.pricing?.model || c.pricing_model || 'Request quote'}</td>)}</tr>
                  <tr><td>Warranty</td>{compareCards.map((c) => <td key={c.id}>{c.warranty_support?.warranty || '—'}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.mk{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.mk *{box-sizing:border-box;}
.mk-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.85);backdrop-filter:blur(20px);z-index:20;}
.mk-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.mk-brand b{font-size:17px;}.mk-brand i{color:#A78BFA;font-style:normal;}
.mk-brand span{color:#8080A0;font-size:13px;}
.mk-navr{display:flex;gap:10px;}
.mk-pill{font-family:inherit;font-size:13px;font-weight:500;color:#C0C0D0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:8px 14px;cursor:pointer;text-decoration:none;}
.mk-pill.on{background:rgba(124,92,252,.15);border-color:#7C5CFC;color:#C4B5FD;}
.mk-hero{text-align:center;padding:46px 20px 10px;max-width:760px;margin:0 auto;}
.mk-hero h1{font-size:clamp(24px,4vw,36px);font-weight:800;letter-spacing:-.02em;}
.mk-hero p{color:#8080A0;font-size:15px;margin:10px 0 22px;line-height:1.5;}
.mk-search{width:100%;max-width:620px;padding:15px 20px;font-family:inherit;font-size:15px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:#14141F;color:#F0F0F5;outline:none;}
.mk-search:focus{border-color:#7C5CFC;box-shadow:0 0 0 3px rgba(124,92,252,.15);}
.mk-filters{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;padding:20px;max-width:1080px;margin:0 auto;}
.mk-tabs{display:flex;background:#14141F;border:1px solid rgba(255,255,255,.1);border-radius:11px;overflow:hidden;}
.mk-tab{font-family:inherit;font-size:13.5px;font-weight:600;padding:10px 16px;background:none;border:none;color:#8080A0;cursor:pointer;}
.mk-tab.on{background:#7C5CFC;color:#fff;}
.mk-filters select{font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#14141F;color:#C0C0D0;outline:none;}
.mk-check{display:flex;align-items:center;gap:7px;font-size:13.5px;color:#C0C0D0;cursor:pointer;}
.mk-grid-wrap{max-width:1080px;margin:0 auto;padding:10px 20px 120px;}
.mk-empty{text-align:center;color:#8080A0;padding:60px 0;}
.mk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px;}
.mk-card{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .15s;}
.mk-card:hover{border-color:rgba(124,92,252,.5);}
.mk-card-img{display:block;height:140px;background:#0E0E16;}
.mk-card-img img{width:100%;height:100%;object-fit:cover;}
.mk-noimg{height:100%;display:grid;place-items:center;color:#505068;font-size:13px;letter-spacing:.15em;text-transform:uppercase;}
.mk-card-body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:7px;flex:1;}
.mk-kindrow{display:flex;flex-wrap:wrap;gap:6px;}
.mk-kind{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:99px;}
.mk-kind.product{background:rgba(124,92,252,.15);color:#C4B5FD;}
.mk-kind.service{background:rgba(52,211,153,.12);color:#34D399;}
.mk-badge{font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;}
.mk-badge.urgent{background:rgba(251,191,36,.12);color:#FBBF24;}
.mk-name{font-size:16px;font-weight:700;color:#F0F0F5;text-decoration:none;line-height:1.3;}
.mk-name:hover{color:#C4B5FD;}
.mk-vendor{font-size:12.5px;color:#8080A0;}
.mk-tags{display:flex;flex-wrap:wrap;gap:5px;}
.mk-tags span{font-size:11.5px;color:#A78BFA;background:rgba(124,92,252,.08);padding:3px 8px;border-radius:6px;}
.mk-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:#8080A0;margin-top:auto;}
.mk-actions{display:flex;gap:8px;margin-top:10px;}
.mk-mini{font-family:inherit;font-size:12px;font-weight:600;padding:8px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:none;color:#C0C0D0;cursor:pointer;}
.mk-mini.on{border-color:#7C5CFC;color:#C4B5FD;background:rgba(124,92,252,.1);}
.mk-mini:disabled{opacity:.5;}
.mk-quote{margin-left:auto;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:9px;background:#7C5CFC;color:#fff;text-decoration:none;}
.mk-quote:hover{background:#6344DF;}
.mk-cbar{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;background:#1A1A28;border:1px solid rgba(124,92,252,.4);border-radius:14px;padding:12px 18px;font-size:13.5px;z-index:30;box-shadow:0 10px 40px rgba(0,0,0,.5);}
.mk-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;z-index:40;padding:20px;}
.mk-modal-in{background:#14141F;border:1px solid rgba(255,255,255,.1);border-radius:18px;max-width:900px;width:100%;max-height:80vh;overflow:auto;padding:22px;}
.mk-modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
.mk-modal-head button{font-family:inherit;background:none;border:1px solid rgba(255,255,255,.12);color:#C0C0D0;border-radius:9px;padding:7px 12px;cursor:pointer;}
.mk-ctable-wrap{overflow-x:auto;}
.mk-ctable{width:100%;border-collapse:collapse;font-size:13.5px;}
.mk-ctable th,.mk-ctable td{text-align:left;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.07);vertical-align:top;}
.mk-ctable th a{color:#C4B5FD;text-decoration:none;}
.mk-ctable td:first-child{color:#8080A0;white-space:nowrap;}
`;
