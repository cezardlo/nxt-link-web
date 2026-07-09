'use client';

// Public vendor storefront — the SAME clean format for every vendor:
// logo + identity + trust, about, what they do, products & services,
// case studies, videos, verified reviews. All deal actions still run
// through NXT//LINK listing pages.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ListingCard {
  id: string; kind: 'product' | 'service'; name: string; category: string;
  overview: string | null; best_for?: string[]; image_url: string | null;
  pilot?: { available?: boolean } | null; pricing?: { model?: string; range?: string } | null;
  warranty_support?: { warranty?: string } | null; response_time?: string | null; emergency_available?: boolean;
}
interface Storefront {
  vendor: {
    id: string; company_name: string; city: string | null; website: string | null;
    description: string | null; verified: boolean; logo_url: string | null;
    banner_url: string | null; tagline: string | null;
    categories: string[]; industries: string[]; service_areas: string[]; client_types: string[];
    achievements: string[];
    rating: number | null; review_count: number;
  };
  listings: ListingCard[];
  case_studies: Array<{ id: string; title: string; challenge: string | null; solution: string | null; result: string | null }>;
  videos: Array<{ id: string; title: string | null; embed_url: string; provider: string }>;
  reviews: Array<{ rating: number; title: string | null; body: string | null }>;
}

const stars = (n: number) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));

export default function VendorStorefrontPage() {
  const params = useParams<{ id: string }>();
  const [d, setD] = useState<Storefront | null>(null);
  const [missing, setMissing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetch(`/api/marketplace/vendor/${params.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) setD(data); else setMissing(true); })
      .catch(() => setMissing(true));
    // Facebook-style: if the signed-in vendor is viewing their OWN page,
    // show the Edit profile button.
    fetch('/api/vendor/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => { if (me?.ok && me.vendor?.id === params.id) setIsOwner(true); })
      .catch(() => {});
  }, [params.id]);

  if (missing) return <div className="vs"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="vs-empty">Vendor not found. <Link href="/marketplace">Back to marketplace</Link></div></div>;
  if (!d) return <div className="vs"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="vs-empty">Loading…</div></div>;

  const v = d.vendor;
  const chipsets: Array<[string, string[]]> = [
    ['Products & services', v.categories],
    ['Industries served', v.industries],
    ['Service areas', v.service_areas],
    ['Typical clients', v.client_types],
  ];

  return (
    <div className="vs">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="vs-nav">
        <Link className="vs-back" href="/marketplace">← Marketplace</Link>
        <span className="vs-thru">Deals run through NXT{'//'}LINK</span>
      </nav>

      {/* Facebook-style profile header — identical structure for every vendor */}
      <div className="vs-cover">
        {v.banner_url ? <img src={v.banner_url} alt="" /> : <div className="vs-coverph" />}
      </div>
      <header className="vs-hero">
        <div className="vs-logo">{v.logo_url ? <img src={v.logo_url} alt={`${v.company_name} logo`} /> : <span>{v.company_name.slice(0, 2).toUpperCase()}</span>}</div>
        <div className="vs-id">
          <div className="vs-namerow">
            <h1>{v.company_name}</h1>
            {isOwner && <Link className="vs-edit" href="/vendor/portal">Edit profile</Link>}
          </div>
          {v.tagline && <p className="vs-tagline">{v.tagline}</p>}
          <div className="vs-sub">{v.city && <span>{v.city}</span>}{v.website && <a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer">Company website ↗</a>}</div>
          <div className="vs-badges">
            {v.verified && <span className="trust">Verified vendor</span>}
            {typeof v.rating === 'number' && v.review_count > 0 && <span className="rating">★ {v.rating.toFixed(1)} ({v.review_count})</span>}
            {d.case_studies.length > 0 && <span>Case studies</span>}
            {d.listings.some((l) => l.pilot?.available) && <span>Pilot available</span>}
          </div>
        </div>
      </header>

      <main className="vs-wrap">
        {v.description && (
          <section className="vs-sec">
            <h2>About</h2>
            <p className="vs-about">{v.description}</p>
          </section>
        )}

        {v.achievements.length > 0 && (
          <section className="vs-sec">
            <h2>Awards &amp; recognitions</h2>
            <div className="vs-awards">
              {v.achievements.map((a) => <span key={a} className="vs-award">{a}</span>)}
            </div>
          </section>
        )}

        {chipsets.some(([, items]) => items.length > 0) && (
          <section className="vs-sec">
            <h2>What they do</h2>
            {chipsets.map(([label, items]) => items.length > 0 && (
              <div className="vs-row" key={label}>
                <span>{label}</span>
                <div>{items.map((t) => <em key={t}>{t}</em>)}</div>
              </div>
            ))}
          </section>
        )}

        <section className="vs-sec">
          <h2>Products &amp; services <small>{d.listings.length}</small></h2>
          {d.listings.length === 0 ? (
            <p className="vs-none">No published listings yet.</p>
          ) : (
            <div className="vs-grid">
              {d.listings.map((l) => (
                <Link href={`/marketplace/${l.kind}/${l.id}`} className="vs-card" key={l.id}>
                  <div className="vs-cimg">{l.image_url ? <img src={l.image_url} alt={l.name} /> : <span>{l.kind}</span>}</div>
                  <div className="vs-cbody">
                    <div className="vs-ctop">
                      <i className={l.kind}>{l.kind}</i>
                      {l.pilot?.available && <b>Pilot</b>}
                      {l.warranty_support?.warranty && <b>Warranty</b>}
                      {l.emergency_available && <b className="urgent">24/7</b>}
                    </div>
                    <strong>{l.name}</strong>
                    <small>{l.category}</small>
                    <span className="vs-quotecta">Request quote →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {d.case_studies.length > 0 && (
          <section className="vs-sec">
            <h2>Case studies</h2>
            <div className="vs-cases">
              {d.case_studies.map((c) => (
                <div className="vs-case" key={c.id}>
                  <b>{c.title}</b>
                  {c.challenge && <p><span>Challenge:</span> {c.challenge}</p>}
                  {c.solution && <p><span>Solution:</span> {c.solution}</p>}
                  {c.result && <p><span>Result:</span> {c.result}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {d.videos.length > 0 && (
          <section className="vs-sec">
            <h2>Videos</h2>
            <div className="vs-videos">
              {d.videos.filter((vd) => vd.provider !== 'other').map((vd) => (
                <div className="vs-video" key={vd.id}>
                  <iframe src={vd.embed_url} title={vd.title || 'video'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                </div>
              ))}
            </div>
          </section>
        )}

        {d.reviews.length > 0 && (
          <section className="vs-sec">
            <h2>Verified reviews</h2>
            <p className="vs-none">From buyers who accepted a quote through NXT{'//'}LINK.</p>
            <div className="vs-reviews">
              {d.reviews.map((r, i) => (
                <div className="vs-review" key={i}>
                  <div className="vs-rvstars">{stars(r.rating)}</div>
                  {r.title && <b>{r.title}</b>}
                  {r.body && <p>{r.body}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.vs{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.vs *{box-sizing:border-box;}
.vs-empty{min-height:60vh;display:grid;place-items:center;color:#8080A0;}
.vs-empty a{color:#A78BFA;}
.vs-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.85);backdrop-filter:blur(20px);z-index:20;}
.vs-back{color:#C0C0D0;text-decoration:none;font-size:14px;font-weight:600;}
.vs-thru{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#C4B5FD;background:rgba(124,92,252,.14);border:1px solid rgba(124,92,252,.3);padding:4px 10px;border-radius:99px;}
.vs-cover{height:220px;overflow:hidden;position:relative;background:#0E0E16;}
.vs-cover img{width:100%;height:100%;object-fit:cover;}
.vs-coverph{width:100%;height:100%;background:linear-gradient(120deg,#1b1533 0%,#241a4d 40%,#12244a 100%);}
.vs-hero{display:flex;gap:22px;align-items:flex-end;max-width:960px;margin:-52px auto 0;padding:0 20px 8px;position:relative;z-index:2;}
.vs-logo{width:112px;height:112px;flex-shrink:0;border-radius:20px;border:4px solid #0A0A0F;background:#14141F;display:grid;place-items:center;overflow:hidden;font-size:30px;font-weight:800;color:#7C5CFC;box-shadow:0 8px 30px rgba(0,0,0,.45);}
.vs-logo img{width:100%;height:100%;object-fit:contain;}
.vs-id{padding-bottom:2px;}
.vs-namerow{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.vs-id h1{font-size:clamp(22px,3.6vw,32px);font-weight:800;letter-spacing:-.02em;}
.vs-edit{font-size:12.5px;font-weight:700;color:#C4B5FD;background:rgba(124,92,252,.14);border:1px solid rgba(124,92,252,.4);border-radius:9px;padding:7px 14px;text-decoration:none;}
.vs-edit:hover{background:rgba(124,92,252,.24);}
.vs-tagline{color:#B8B6CC;font-size:14.5px;margin:6px 0 0;font-weight:300;}
.vs-sub{display:flex;gap:14px;color:#8080A0;font-size:14px;margin-top:6px;flex-wrap:wrap;}
.vs-sub a{color:#A78BFA;text-decoration:none;}
.vs-badges{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px;}
.vs-badges span{font-size:11px;font-weight:600;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;}
.vs-badges span.trust{background:rgba(52,211,153,.12);color:#34D399;}
.vs-badges span.rating{background:rgba(251,191,36,.14);color:#FBBF24;font-weight:700;}
.vs-wrap{max-width:960px;margin:0 auto;padding:10px 20px 110px;}
.vs-sec{margin-top:34px;}
.vs-sec h2{font-size:18px;font-weight:800;letter-spacing:-.01em;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:9px;}
.vs-sec h2 small{color:#8080A0;font-weight:600;font-size:13px;margin-left:8px;}
.vs-about{font-size:15px;line-height:1.7;color:#D5D4E0;font-weight:300;white-space:pre-wrap;max-width:760px;}
.vs-row{display:flex;gap:14px;margin-bottom:12px;align-items:baseline;}
.vs-row>span{font-size:12px;color:#8080A0;min-width:140px;}
.vs-row em{font-style:normal;font-size:12.5px;color:#A78BFA;background:rgba(124,92,252,.08);padding:3px 9px;border-radius:6px;margin:0 5px 5px 0;display:inline-block;}
.vs-none{color:#8080A0;font-size:13.5px;margin-bottom:10px;}
.vs-awards{display:flex;flex-wrap:wrap;gap:9px;}
.vs-award{font-size:13px;font-weight:600;padding:8px 14px;border-radius:99px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);color:#FBBF24;}
.vs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;}
.vs-card{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:15px;overflow:hidden;text-decoration:none;color:#F0F0F5;display:flex;flex-direction:column;transition:border-color .15s,transform .15s;}
.vs-card:hover{border-color:rgba(124,92,252,.5);transform:translateY(-2px);}
.vs-cimg{height:130px;background:#0E0E16;display:grid;place-items:center;color:#505068;font-size:12px;letter-spacing:.14em;text-transform:uppercase;}
.vs-cimg img{width:100%;height:100%;object-fit:cover;}
.vs-cbody{padding:13px 15px 15px;display:flex;flex-direction:column;gap:6px;flex:1;}
.vs-ctop{display:flex;gap:6px;flex-wrap:wrap;}
.vs-ctop i{font-style:normal;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:rgba(124,92,252,.15);color:#C4B5FD;}
.vs-ctop i.service{background:rgba(52,211,153,.12);color:#34D399;}
.vs-ctop b{font-size:10px;font-weight:600;padding:3px 8px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;}
.vs-ctop b.urgent{background:rgba(251,191,36,.12);color:#FBBF24;}
.vs-cbody strong{font-size:15px;font-weight:700;line-height:1.3;}
.vs-cbody small{color:#8080A0;font-size:12px;}
.vs-quotecta{margin-top:auto;padding-top:8px;color:#C4B5FD;font-size:12.5px;font-weight:700;}
.vs-cases{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;}
.vs-case{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 18px;}
.vs-case b{font-size:14.5px;}
.vs-case p{font-size:13px;color:#C0C0D0;margin:8px 0 0;line-height:1.55;}
.vs-case p span{color:#8080A0;}
.vs-videos{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;}
.vs-video{position:relative;padding-top:56.25%;background:#000;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.08);}
.vs-video iframe{position:absolute;inset:0;width:100%;height:100%;border:none;}
.vs-reviews{display:flex;flex-direction:column;gap:12px;}
.vs-review{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:14px 16px;}
.vs-rvstars{color:#FBBF24;letter-spacing:2px;font-size:15px;margin-bottom:5px;}
.vs-review b{font-size:14px;}
.vs-review p{font-size:13.5px;color:#C0C0D0;margin:7px 0 0;line-height:1.55;white-space:pre-wrap;}
@media(max-width:560px){.vs-hero{flex-direction:column;align-items:flex-start;}}
`;
