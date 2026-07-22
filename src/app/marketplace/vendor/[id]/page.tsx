'use client';

// Public vendor storefront — LinkedIn-style profile, one clean format for every
// vendor: header + trust badges + stats, about, expertise, products & services,
// case studies, verified reviews, and a sidebar (quick facts, brands supported,
// coverage, certifications, team). Every section degrades gracefully when the
// vendor hasn't filled it in. Deal actions run through NXT//LINK listing pages.
// When the vendor has no published listings yet, the quote CTAs route to the
// assisted RFQ (/intake) with a vendor hint instead of dead-ending on
// /marketplace — buyer intent isn't lost. Fully EN/ES via the shared
// LanguageToggle/useLang pattern (see /cart).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IBM_Plex_Sans } from 'next/font/google';
import { levelAtLeast } from '@/components/marketplace/TrustBadges';
import { useLang, type Lang } from '@/components/LanguageToggle';
import PublicHeader from '@/components/PublicHeader';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-vendor',
  display: 'swap',
});

interface ListingCard {
  id: string; kind: 'product' | 'service'; name: string; category: string;
  overview: string | null; best_for?: string[]; image_url: string | null;
  pilot?: { available?: boolean } | null; pricing?: { model?: string; range?: string } | null;
  warranty_support?: { warranty?: string } | null; response_time?: string | null; emergency_available?: boolean;
  lead_time?: string | null; implementation?: { typical_timeline?: string } | null;
}

const MODEL_LABEL: Record<Lang, Record<string, string>> = {
  en: {
    one_time: 'One-time', subscription: 'Subscription', monthly: 'Monthly', hourly: 'Hourly',
    per_project: 'Per project', quote: 'By quote', usage: 'Usage-based', lease: 'Lease', rental: 'Rental',
  },
  es: {
    one_time: 'Pago único', subscription: 'Suscripción', monthly: 'Mensual', hourly: 'Por hora',
    per_project: 'Por proyecto', quote: 'Por cotización', usage: 'Según uso', lease: 'Arrendamiento', rental: 'Renta',
  },
};
// Price shown in the compare table — prefer an explicit range, else the model.
const priceText = (l: ListingCard, lang: Lang, byQuote: string) => l.pricing?.range?.trim()
  || (l.pricing?.model ? (MODEL_LABEL[lang][l.pricing.model] || l.pricing.model) : '') || byQuote;
// Numeric key for sorting by price — first dollar figure in the range, else last.
const priceValue = (l: ListingCard) => {
  const m = (l.pricing?.range || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
};
// Timeline shown in the compare table — product lead time, else implementation
// timeline, else a service's response time.
const timelineText = (l: ListingCard, respondsIn: string, dash: string) => l.lead_time?.trim()
  || l.implementation?.typical_timeline?.trim()
  || (l.kind === 'service' && l.response_time ? `${respondsIn} ${l.response_time}` : '') || dash;
// Numeric days from a timeline string ("2–4 weeks", "10 days", "4h"), for the
// length-proportional compare bar. Returns null when nothing parses.
const daysOf = (l: ListingCard): number | null => {
  const s = l.lead_time?.trim() || l.implementation?.typical_timeline?.trim() || (l.kind === 'service' ? l.response_time || '' : '');
  const m = s.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|days?|d|weeks?|wks?|w|months?|mos?|mo|m)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]); const u = m[2].toLowerCase();
  if (u.startsWith('h')) return n / 24;
  if (u.startsWith('d')) return n;
  if (u.startsWith('w')) return n * 7;
  return n * 30;
};
interface Vendor {
  id: string; company_name: string; city: string | null; website: string | null;
  description: string | null; verified: boolean; verification_level?: string | null;
  logo_url: string | null; banner_url: string | null;
  tagline: string | null;
  categories: string[]; industries: string[]; service_areas: string[]; client_types: string[]; achievements: string[];
  company_type: string | null; year_founded: number | null; employee_count: string | null; languages: string[];
  response_time: string | null; emergency_available: boolean; cross_border: boolean;
  installation_available: boolean; pilot_available: boolean;
  main_expertise: string[]; problems_solved: string[]; capabilities: string[]; brands_supported: string[];
  rating: number | null; review_count: number; deals_closed: number;
}
interface Storefront {
  vendor: Vendor;
  listings: ListingCard[];
  case_studies: Array<{ id: string; title: string; challenge: string | null; solution: string | null; result: string | null }>;
  reviews: Array<{ rating: number; title: string | null; body: string | null }>;
  certifications: Array<{ id: string; name: string; issuer: string | null; expires_on: string | null }>;
  team: Array<{ id: string; name: string; position: string | null; expertise: string | null; languages: string[] | null; service_region: string | null }>;
}

const stars = (n: number) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
const initials = (s: string) => s.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const TYPE_LABEL: Record<Lang, Record<string, string>> = {
  en: { manufacturer: 'Manufacturer', distributor: 'Distributor', integrator: 'Systems Integrator', consultant: 'Consultant', service_provider: 'Service Provider', software: 'Software Company' },
  es: { manufacturer: 'Fabricante', distributor: 'Distribuidor', integrator: 'Integrador de sistemas', consultant: 'Consultor', service_provider: 'Proveedor de servicios', software: 'Empresa de software' },
};

const T: Record<Lang, Record<string, string>> = {
  en: {
    marketplace: 'Marketplace',
    editProfile: 'Edit my profile',
    ownerViewing: 'You’re viewing your storefront exactly as buyers see it.',
    backToEditing: '← Back to editing',
    notFound: 'Vendor not found.',
    backToMarketplace: 'Back to marketplace',
    loading: 'Loading…',
    requestQuote: 'Request quote through NXT//LINK',
    viewOfferings: 'View offerings',
    avgResponse: 'Avg. response',
    dealsClosed: 'Deals on NXT//LINK',
    reviews: 'reviews',
    founded: 'Founded',
    foundedStaff: 'Founded · {n} staff',
    navOverview: 'Overview',
    navExpertise: 'Expertise',
    navCompare: 'Compare',
    navProducts: 'Products',
    navServices: 'Services',
    navCases: 'Case studies',
    navReviews: 'Reviews',
    about: 'About',
    noDescription: 'This company hasn’t added a description yet.',
    industriesServed: 'Industries served',
    clientsSpecialize: 'Clients they specialize in',
    expertise: 'Expertise',
    knownFor: 'What they’re known for',
    problemsSolve: 'Problems they solve',
    capabilities: 'Capabilities',
    compareOfferings: 'Compare offerings',
    sort: 'Sort',
    sortAz: 'A–Z',
    sortPriceAsc: 'Price ↑',
    sortPriceDesc: 'Price ↓',
    thOffering: 'Offering',
    thType: 'Type',
    thPrice: 'Price',
    thTimeline: 'Timeline',
    thBestFor: 'Best for',
    thAction: 'Action',
    product: 'Product',
    service: 'Service',
    dash: '—',
    byQuote: 'By quote',
    respondsIn: 'Responds in',
    viewArrow: 'View →',
    compareNote: 'Prices and timelines are vendor-provided estimates. Request a quote through NXT//LINK for firm numbers.',
    productsEquipment: 'Products & equipment',
    services: 'Services',
    caseStudies: 'Case studies',
    challenge: 'Challenge:',
    solution: 'Solution:',
    reviewsOnly: '· from verified NXT//LINK deals only',
    verifiedDeal: '✓ Verified deal',
    workWithVendor: 'Work with this vendor',
    protectedIntro: 'All quotes, files, and messaging run through NXT//LINK. Your introduction is protected.',
    requestAQuote: 'Request a quote',
    noListingsYet: 'This vendor hasn’t published listings yet — describe what you need and we’ll match you, including with this vendor.',
    quickFacts: 'Quick facts',
    companyType: 'Company type',
    employees: 'Employees',
    languages: 'Languages',
    emergencyService: 'Emergency service',
    website: 'Website',
    visit: 'Visit ↗',
    detailsComingSoon: 'Company details coming soon.',
    brandsSupported: 'Brands & equipment supported',
    coverage: 'Coverage',
    certifications: 'Certifications',
    team: 'Team',
    teamNote: 'Direct contact is shared after a protected NXT//LINK introduction.',
    badgeVerifiedIdentity: '✓ Verified identity',
    badgeVerifiedBusiness: '✓ Verified business',
    badgeInsurance: '✓ Insurance reviewed',
    badgeCertified: '✓ Certified',
    badgePilot: 'Pilot available',
    badgeCrossBorder: 'Cross-border ready',
    badgeEmergency: '24/7 emergency',
    badgeInstallation: 'Installation available',
  },
  es: {
    marketplace: 'Marketplace',
    editProfile: 'Editar mi perfil',
    ownerViewing: 'Estás viendo tu perfil exactamente como lo ven los compradores.',
    backToEditing: '← Volver a editar',
    notFound: 'Proveedor no encontrado.',
    backToMarketplace: 'Volver al marketplace',
    loading: 'Cargando…',
    requestQuote: 'Solicitar cotización a través de NXT//LINK',
    viewOfferings: 'Ver publicaciones',
    avgResponse: 'Respuesta prom.',
    dealsClosed: 'Tratos en NXT//LINK',
    reviews: 'reseñas',
    founded: 'Fundada',
    foundedStaff: 'Fundada · {n} empleados',
    navOverview: 'Resumen',
    navExpertise: 'Experiencia',
    navCompare: 'Comparar',
    navProducts: 'Productos',
    navServices: 'Servicios',
    navCases: 'Casos de éxito',
    navReviews: 'Reseñas',
    about: 'Acerca de',
    noDescription: 'Esta empresa aún no ha agregado una descripción.',
    industriesServed: 'Industrias que atiende',
    clientsSpecialize: 'Clientes en los que se especializa',
    expertise: 'Experiencia',
    knownFor: 'Por qué es reconocida',
    problemsSolve: 'Problemas que resuelve',
    capabilities: 'Capacidades',
    compareOfferings: 'Comparar publicaciones',
    sort: 'Ordenar',
    sortAz: 'A–Z',
    sortPriceAsc: 'Precio ↑',
    sortPriceDesc: 'Precio ↓',
    thOffering: 'Publicación',
    thType: 'Tipo',
    thPrice: 'Precio',
    thTimeline: 'Plazo',
    thBestFor: 'Ideal para',
    thAction: 'Acción',
    product: 'Producto',
    service: 'Servicio',
    dash: '—',
    byQuote: 'Por cotización',
    respondsIn: 'Responde en',
    viewArrow: 'Ver →',
    compareNote: 'Los precios y plazos son estimaciones del proveedor. Solicita una cotización a través de NXT//LINK para cifras firmes.',
    productsEquipment: 'Productos y equipo',
    services: 'Servicios',
    caseStudies: 'Casos de éxito',
    challenge: 'Reto:',
    solution: 'Solución:',
    reviewsOnly: '· solo de tratos verificados en NXT//LINK',
    verifiedDeal: '✓ Trato verificado',
    workWithVendor: 'Trabaja con este proveedor',
    protectedIntro: 'Todas las cotizaciones, archivos y mensajes se gestionan a través de NXT//LINK. Tu presentación está protegida.',
    requestAQuote: 'Solicitar cotización',
    noListingsYet: 'Este proveedor aún no ha publicado publicaciones — describe lo que necesitas y te conectaremos, incluyendo con este proveedor.',
    quickFacts: 'Datos rápidos',
    companyType: 'Tipo de empresa',
    employees: 'Empleados',
    languages: 'Idiomas',
    emergencyService: 'Servicio de emergencia',
    website: 'Sitio web',
    visit: 'Visitar ↗',
    detailsComingSoon: 'Detalles de la empresa próximamente.',
    brandsSupported: 'Marcas y equipos que atiende',
    coverage: 'Cobertura',
    certifications: 'Certificaciones',
    team: 'Equipo',
    teamNote: 'El contacto directo se comparte después de una presentación protegida por NXT//LINK.',
    badgeVerifiedIdentity: '✓ Identidad verificada',
    badgeVerifiedBusiness: '✓ Empresa verificada',
    badgeInsurance: '✓ Seguro revisado',
    badgeCertified: '✓ Certificado',
    badgePilot: 'Piloto disponible',
    badgeCrossBorder: 'Lista para cruce fronterizo',
    badgeEmergency: 'Emergencia 24/7',
    badgeInstallation: 'Instalación disponible',
  },
};

export default function VendorStorefrontPage() {
  const params = useParams<{ id: string }>();
  const [lang, setLang] = useLang();
  const t = T[lang];
  const [d, setD] = useState<Storefront | null>(null);
  const [missing, setMissing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [sort, setSort] = useState<'name' | 'price_asc' | 'price_desc'>('name');

  useEffect(() => {
    fetch(`/api/marketplace/vendor/${params.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) { setD(data); document.title = `${data.vendor.company_name} — NXT//LINK`; } else setMissing(true); })
      .catch(() => setMissing(true));
    fetch('/api/vendor/profile').then((r) => (r.ok ? r.json() : null))
      .then((me) => { if (me?.ok && me.vendor?.id === params.id) setIsOwner(true); }).catch(() => {});
  }, [params.id]);

  if (missing) return <div className="vs"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="vs-empty">{t.notFound} <Link href="/marketplace">{t.backToMarketplace}</Link></div></div>;
  if (!d) return <div className="vs"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="vs-empty">{t.loading}</div></div>;

  const v = d.vendor;
  const products = d.listings.filter((l) => l.kind === 'product');
  const services = d.listings.filter((l) => l.kind === 'service');
  const firstListing = d.listings[0];
  // No published listings yet: send the buyer into the assisted RFQ instead of
  // dead-ending on /marketplace, so their intent to reach THIS vendor isn't
  // lost — /intake reads ?vendor=/&vendor_id= as a cheap hint (see intake page).
  const quoteHref = firstListing
    ? `/marketplace/${firstListing.kind}/${firstListing.id}#quote`
    : `/intake?vendor=${encodeURIComponent(v.company_name)}&vendor_id=${v.id}`;

  // Build the badge + stat + nav sets from real data only.
  const badges: Array<[string, string]> = [];
  if (levelAtLeast(v.verification_level, 'identity_verified')) badges.push(['v', t.badgeVerifiedIdentity]);
  else if (v.verified) badges.push(['v', t.badgeVerifiedBusiness]);
  if (levelAtLeast(v.verification_level, 'insurance_reviewed')) badges.push(['g', t.badgeInsurance]);
  if (levelAtLeast(v.verification_level, 'certifications_reviewed')) badges.push(['p', t.badgeCertified]);
  if (v.pilot_available) badges.push(['p', t.badgePilot]);
  if (v.cross_border) badges.push(['a', t.badgeCrossBorder]);
  if (v.emergency_available) badges.push(['g', t.badgeEmergency]);
  if (v.installation_available) badges.push(['g', t.badgeInstallation]);

  const stats: Array<[string, string]> = [];
  if (v.response_time) stats.push([v.response_time, t.avgResponse]);
  if (v.deals_closed > 0) stats.push([String(v.deals_closed), t.dealsClosed]);
  if (v.rating != null) stats.push([`${v.rating}★`, `${v.review_count} ${t.reviews}`]);
  if (v.year_founded) stats.push([String(v.year_founded), v.employee_count ? t.foundedStaff.replace('{n}', v.employee_count) : t.founded]);

  // Unified compare table across every offering (products, tech, services),
  // sortable by price so buyers can scan value and timeline at a glance.
  const compareRows = [...d.listings].sort((a, b) => {
    if (sort === 'price_asc') return priceValue(a) - priceValue(b);
    if (sort === 'price_desc') return priceValue(b) - priceValue(a);
    return a.name.localeCompare(b.name);
  });
  // Scaling for the length-proportional compare bars (finite values only).
  const priceVals = compareRows.map(priceValue).filter((n) => Number.isFinite(n));
  const cmpMaxPrice = priceVals.length ? Math.max(...priceVals) : 0;
  const cmpMinPrice = priceVals.length ? Math.min(...priceVals) : 0;
  const dayVals = compareRows.map(daysOf).filter((n): n is number => n != null);
  const cmpMaxDays = dayVals.length ? Math.max(...dayVals) : 0;
  const cmpMinDays = dayVals.length ? Math.min(...dayVals) : 0;

  const nav: Array<[string, string]> = [['about', t.navOverview]];
  if (v.main_expertise.length || v.problems_solved.length || v.capabilities.length) nav.push(['expertise', t.navExpertise]);
  if (d.listings.length >= 2) nav.push(['compare', t.navCompare]);
  if (products.length) nav.push(['products', t.navProducts]);
  if (services.length) nav.push(['services', t.navServices]);
  if (d.case_studies.length) nav.push(['cases', t.navCases]);
  if (d.reviews.length) nav.push(['reviews', t.navReviews]);

  const ListingCards = ({ items }: { items: ListingCard[] }) => (
    <div className="vs-plist">
      {items.map((l) => (
        <Link key={l.id} className="vs-pcard" href={`/marketplace/${l.kind}/${l.id}`}>
          <div className="vs-pimg">{l.image_url ? <img src={l.image_url} alt={l.name} loading="lazy" /> : <div className="vs-noimg">NXT//LINK</div>}</div>
          <div className="vs-pb">
            {l.pilot?.available && <span className="vs-ptag">{t.badgePilot}</span>}
            <div className="vs-pn">{l.name}</div>
            {l.pricing?.range && <div className="vs-pp">{l.pricing.range}</div>}
            <div className="vs-pm">{l.category}</div>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className={`vs ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* ONE shared public header (Flow Blueprint 2026-07-22 §4, Slice 2) —
          replaces this page's old dark `vs-topbar`. "Marketplace"/"Edit my
          profile" are page-specific utility links, so they move to a slim
          secondary row directly underneath instead of being dropped. */}
      <PublicHeader lang={lang} onLangChange={setLang} />
      <div className="vs-utilnav">
        <Link className="vs-pill" href="/marketplace">{t.marketplace}</Link>
        {isOwner && <Link className="vs-pill on" href="/vendor/portal">{t.editProfile}</Link>}
      </div>

      {isOwner && (
        <div className="vs-ownerbar">
          <span>👁 {t.ownerViewing}</span>
          <Link href="/vendor/portal">{t.backToEditing}</Link>
        </div>
      )}

      <div className="vs-banner" style={v.banner_url ? { backgroundImage: `url(${v.banner_url})` } : undefined} />

      <div className="vs-wrap">
        <div className="vs-head">
          <div className="vs-headrow">
            <div className="vs-logo">{v.logo_url ? <img src={v.logo_url} alt={v.company_name} /> : initials(v.company_name)}</div>
            <div className="vs-headmain">
              <div className="vs-name">{v.company_name}{v.verified && <span className="vs-tick" title="Verified">✓</span>}</div>
              {v.tagline && <div className="vs-tag">{v.tagline}</div>}
              <div className="vs-meta">
                {v.city && <span>📍 <b>{v.city}</b></span>}
                {v.service_areas.length > 0 && <span>🌎 {v.service_areas.slice(0, 4).join(' · ')}</span>}
                {v.response_time && <span>⚡ {t.respondsIn} <b>{v.response_time}</b></span>}
              </div>
              {badges.length > 0 && <div className="vs-badges">{badges.map(([c, tx], i) => <span key={i} className={`vs-badge ${c}`}>{tx}</span>)}</div>}
            </div>
          </div>

          <div className="vs-actions">
            <Link className="vs-btn pri" href={quoteHref}>{t.requestQuote}</Link>
            <button className="vs-btn" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>{t.viewOfferings}</button>
          </div>

          {stats.length > 0 && (
            <div className="vs-stats" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)` }}>
              {stats.map(([b, sv], i) => <div key={i} className="vs-stat"><b>{b}</b><span>{sv}</span></div>)}
            </div>
          )}
        </div>

        {nav.length > 1 && (
          <nav className="vs-subnav">
            {nav.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
        )}

        <div className="vs-grid">
          <main>
            <section id="about" className="vs-card">
              <h2>{t.about}</h2>
              {v.description ? <p className="vs-prose">{v.description}</p> : <p className="vs-prose vs-dim">{t.noDescription}</p>}
              {v.industries.length > 0 && (<><h3>{t.industriesServed}</h3><div className="vs-chips">{v.industries.map((c) => <span key={c} className="vs-chip">{c}</span>)}</div></>)}
              {v.client_types.length > 0 && (<><h3>{t.clientsSpecialize}</h3><ul className="vs-bullets">{v.client_types.map((c) => <li key={c}>{c}</li>)}</ul></>)}
            </section>

            {(v.main_expertise.length > 0 || v.problems_solved.length > 0 || v.capabilities.length > 0) && (
              <section id="expertise" className="vs-card">
                <h2>{t.expertise}</h2>
                {v.main_expertise.length > 0 && (<><h3>{t.knownFor}</h3><ul className="vs-bullets">{v.main_expertise.map((c) => <li key={c}>{c}</li>)}</ul></>)}
                {v.problems_solved.length > 0 && (<><h3>{t.problemsSolve}</h3><div className="vs-chips">{v.problems_solved.map((c) => <span key={c} className="vs-chip n">{c}</span>)}</div></>)}
                {v.capabilities.length > 0 && (<><h3>{t.capabilities}</h3><ul className="vs-bullets g">{v.capabilities.map((c) => <li key={c}>{c}</li>)}</ul></>)}
              </section>
            )}

            {d.listings.length >= 2 && (
              <section id="compare" className="vs-card">
                <div className="vs-cmphead">
                  <h2>{t.compareOfferings}</h2>
                  <div className="vs-sort">
                    <span>{t.sort}</span>
                    <button className={sort === 'name' ? 'on' : ''} onClick={() => setSort('name')}>{t.sortAz}</button>
                    <button className={sort === 'price_asc' ? 'on' : ''} onClick={() => setSort('price_asc')}>{t.sortPriceAsc}</button>
                    <button className={sort === 'price_desc' ? 'on' : ''} onClick={() => setSort('price_desc')}>{t.sortPriceDesc}</button>
                  </div>
                </div>
                <div className="vs-cmpscroll">
                  <table className="vs-cmp">
                    <thead>
                      <tr><th>{t.thOffering}</th><th>{t.thType}</th><th>{t.thPrice}</th><th>{t.thTimeline}</th><th>{t.thBestFor}</th><th aria-label={t.thAction} /></tr>
                    </thead>
                    <tbody>
                      {compareRows.map((l) => (
                        <tr key={l.id}>
                          <td><Link className="vs-cmpname" href={`/marketplace/${l.kind}/${l.id}`}>{l.name}</Link><span className="vs-cmpcat">{l.category}</span></td>
                          <td><span className={`vs-kind ${l.kind}`}>{l.kind === 'product' ? t.product : t.service}</span></td>
                          <td className="vs-cmpprice">{priceText(l, lang, t.byQuote)}
                            {Number.isFinite(priceValue(l)) && cmpMaxPrice > 0 && (
                              <div className="vs-bar"><i className={priceValue(l) === cmpMinPrice ? 'best' : ''} style={{ width: `${Math.max(6, (priceValue(l) / cmpMaxPrice) * 100)}%` }} /></div>
                            )}
                          </td>
                          <td className="vs-cmptime">{timelineText(l, t.respondsIn, t.dash)}
                            {(() => { const dd = daysOf(l); return dd != null && cmpMaxDays > 0 ? (
                              <div className="vs-bar"><i className={dd === cmpMinDays ? 'best' : ''} style={{ width: `${Math.max(6, (dd / cmpMaxDays) * 100)}%` }} /></div>
                            ) : null; })()}
                          </td>
                          <td className="vs-cmpbest">{(l.best_for && l.best_for.length) ? l.best_for.slice(0, 2).join(', ') : t.dash}</td>
                          <td><Link className="vs-cmpview" href={`/marketplace/${l.kind}/${l.id}`}>{t.viewArrow}</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="vs-cmpnote">{t.compareNote}</p>
              </section>
            )}

            {products.length > 0 && <section id="products" className="vs-card"><h2>{t.productsEquipment}</h2><ListingCards items={products} /></section>}
            {services.length > 0 && <section id="services" className="vs-card"><h2>{t.services}</h2><ListingCards items={services} /></section>}

            {d.case_studies.length > 0 && (
              <section id="cases" className="vs-card">
                <h2>{t.caseStudies}</h2>
                {d.case_studies.map((c) => (
                  <div key={c.id} className="vs-cs">
                    <h4>{c.title}</h4>
                    {c.challenge && <p className="vs-cprob"><b>{t.challenge}</b> {c.challenge}</p>}
                    {c.solution && <p className="vs-csol"><b>{t.solution}</b> {c.solution}</p>}
                    {c.result && <p className="vs-cres">{c.result}</p>}
                  </div>
                ))}
              </section>
            )}

            {d.reviews.length > 0 && (
              <section id="reviews" className="vs-card">
                <h2>{t.navReviews} <span className="vs-subtle">{t.reviewsOnly}</span></h2>
                {d.reviews.map((r, i) => (
                  <div key={i} className="vs-rev">
                    <div className="vs-revtop"><span className="vs-stars">{stars(r.rating)}</span><span className="vs-revverif">{t.verifiedDeal}</span></div>
                    {r.title && <div className="vs-revtitle">{r.title}</div>}
                    {r.body && <p className="vs-revbody">{r.body}</p>}
                  </div>
                ))}
              </section>
            )}
          </main>

          <aside className="vs-side">
            <div className="vs-card vs-sidecta">
              <h2>{t.workWithVendor}</h2>
              <p>{t.protectedIntro}</p>
              {!firstListing && <p className="vs-nolisting">{t.noListingsYet}</p>}
              <Link className="vs-btn pri vs-full" href={quoteHref}>{t.requestAQuote}</Link>
            </div>

            <div className="vs-card">
              <h2>{t.quickFacts}</h2>
              {v.company_type && <div className="vs-qf"><span>{t.companyType}</span><b>{TYPE_LABEL[lang][v.company_type] || v.company_type}</b></div>}
              {v.year_founded && <div className="vs-qf"><span>{t.founded}</span><b>{v.year_founded}</b></div>}
              {v.employee_count && <div className="vs-qf"><span>{t.employees}</span><b>{v.employee_count}</b></div>}
              {v.languages.length > 0 && <div className="vs-qf"><span>{t.languages}</span><b>{v.languages.map((l) => l === 'es' ? 'Español' : l === 'en' ? 'English' : l).join(' · ')}</b></div>}
              {v.emergency_available && <div className="vs-qf"><span>{t.emergencyService}</span><b>24/7</b></div>}
              {v.website && <div className="vs-qf"><span>{t.website}</span><b><a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noopener noreferrer nofollow" className="vs-link">{t.visit}</a></b></div>}
              {!v.company_type && !v.year_founded && !v.employee_count && !v.languages.length && <p className="vs-prose vs-dim" style={{ margin: 0 }}>{t.detailsComingSoon}</p>}
            </div>

            {v.brands_supported.length > 0 && (
              <div className="vs-card"><h2>{t.brandsSupported}</h2><div className="vs-brandgrid">{v.brands_supported.map((b) => <span key={b} className="vs-brandpill">{b}</span>)}</div></div>
            )}

            {v.service_areas.length > 0 && (
              <div className="vs-card"><h2>{t.coverage}</h2><div className="vs-coverage">{v.service_areas.map((a) => <div key={a}><span className="vs-dot" />{a}</div>)}</div></div>
            )}

            {d.certifications.length > 0 && (
              <div className="vs-card"><h2>{t.certifications}</h2>{d.certifications.map((c) => <div key={c.id} className="vs-cert"><span className="vs-certi">🛡️</span>{c.name}{c.issuer ? ` · ${c.issuer}` : ''}</div>)}</div>
            )}

            {d.team.length > 0 && (
              <div className="vs-card">
                <h2>{t.team}</h2>
                <div className="vs-team">
                  {d.team.map((m) => (
                    <div key={m.id} className="vs-member">
                      <div className="vs-avatar">{initials(m.name)}</div>
                      <div><b>{m.name}</b><span>{[m.position, m.service_region].filter(Boolean).join(' · ')}</span></div>
                    </div>
                  ))}
                </div>
                <p className="vs-teamnote">{t.teamNote}</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.vs{background:var(--spec-warm-white);color:var(--spec-ink);font-family:var(--font-ibm-plex-sans-vendor),'IBM Plex Sans',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh;}
.vs *{box-sizing:border-box;}
.vs a{text-decoration:none;color:inherit;}
.vs h2,.vs h3,.vs h4{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;}
.vs-empty{max-width:600px;margin:90px auto;text-align:center;color:var(--spec-text-2nd);padding:0 20px;}
.vs-empty a{color:var(--spec-violet-deep);}
.vs-utilnav{display:flex;gap:8px;align-items:center;padding:10px 22px;background:#fff;border-bottom:1px solid var(--spec-border);}
.vs-pill{font-size:12.5px;font-weight:600;color:var(--spec-text-2nd);background:var(--spec-warm-white);border:1px solid var(--spec-border);border-radius:99px;padding:7px 13px;}
.vs-pill.on{background:rgba(108,92,224,.14);border-color:var(--spec-violet);color:var(--spec-violet-deep);}
.vs-ownerbar{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;padding:9px 18px;background:rgba(108,92,224,.1);border-bottom:1px solid rgba(108,92,224,.25);font-size:13px;color:var(--spec-violet-deep);}
.vs-ownerbar a{color:var(--spec-ink);font-weight:700;text-decoration:none;}
.vs-ownerbar a:hover{text-decoration:underline;}
.vs-banner{height:190px;background-color:var(--spec-ink);background-size:cover;background-position:center;background-image:radial-gradient(600px 300px at 80% 0%,rgba(108,92,224,.55),transparent 60%),radial-gradient(500px 300px at 10% 120%,rgba(47,158,106,.32),transparent 55%),linear-gradient(120deg,#1c1832,#101a29);}
.vs-wrap{max-width:1120px;margin:0 auto;padding:0 20px;}
.vs-head{position:relative;margin-top:-52px;}
.vs-headrow{display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap;}
.vs-logo{width:112px;height:112px;border-radius:24px;background:linear-gradient(135deg,var(--spec-violet),var(--spec-success));display:grid;place-items:center;font-size:38px;font-weight:800;color:#fff;border:4px solid #fff;flex-shrink:0;overflow:hidden;box-shadow:0 14px 40px -12px rgba(20,19,32,.4);}
.vs-logo img{width:100%;height:100%;object-fit:cover;}
.vs-headmain{flex:1;min-width:260px;padding-bottom:4px;}
.vs-name{font-size:clamp(23px,3.4vw,31px);font-weight:800;letter-spacing:-.02em;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;color:var(--spec-ink);}
.vs-tick{width:22px;height:22px;border-radius:50%;background:#3E6FD0;color:#fff;display:inline-grid;place-items:center;font-size:13px;font-weight:900;}
.vs-tag{color:var(--spec-text-2nd);font-size:14.5px;margin-top:6px;max-width:60ch;}
.vs-meta{display:flex;gap:16px;flex-wrap:wrap;margin-top:11px;font-size:13px;color:var(--spec-text-2nd);}
.vs-meta b{color:var(--spec-ink);font-weight:600;}
.vs-badges{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px;}
.vs-badge{font-size:11.5px;font-weight:600;padding:5px 11px;border-radius:99px;border:1px solid transparent;}
.vs-badge.v{background:rgba(62,111,208,.12);color:#3E6FD0;border-color:rgba(62,111,208,.3);}
.vs-badge.g{background:rgba(47,158,106,.12);color:#1F7A54;border-color:rgba(47,158,106,.3);}
.vs-badge.a{background:rgba(198,138,40,.12);color:#8A5D14;border-color:rgba(198,138,40,.3);}
.vs-badge.p{background:rgba(108,92,224,.12);color:var(--spec-violet-deep);border-color:rgba(108,92,224,.3);}
.vs-actions{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0 6px;}
.vs-btn{font-family:inherit;font-size:14px;font-weight:700;border-radius:11px;padding:12px 20px;cursor:pointer;border:1px solid var(--spec-border);background:transparent;color:var(--spec-ink);}
.vs-btn:hover{border-color:var(--spec-violet);}
.vs-btn.pri{background:var(--spec-violet);border-color:var(--spec-violet);color:#fff;box-shadow:0 12px 30px -12px rgba(108,92,224,.6);}
.vs-btn.pri:hover{background:var(--spec-violet-deep);}
.vs-btn.vs-full{width:100%;text-align:center;}
.vs-stats{display:grid;gap:1px;background:var(--spec-border);border:1px solid var(--spec-border);border-radius:14px;overflow:hidden;margin-top:16px;}
.vs-stat{background:#fff;padding:15px 16px;}
.vs-stat b{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;display:block;color:var(--spec-ink);}
.vs-stat span{font-size:11.5px;color:var(--spec-text-2nd);}
/* Sticky offset = the shared header's height (--spec-topbar-h) — the
   PublicHeader is the only thing above this that stays pinned. */
.vs-subnav{position:sticky;top:var(--spec-topbar-h);z-index:40;display:flex;gap:4px;overflow-x:auto;background:#fff;border-bottom:1px solid var(--spec-border);margin-top:24px;scrollbar-width:none;}
.vs-subnav::-webkit-scrollbar{display:none;}
.vs-subnav a{font-size:13.5px;font-weight:600;color:var(--spec-text-2nd);padding:14px 15px;border-bottom:2px solid transparent;white-space:nowrap;}
.vs-subnav a:hover{color:var(--spec-ink);}
.vs-grid{display:grid;grid-template-columns:1fr 320px;gap:26px;padding:30px 0 90px;align-items:start;}
@media(max-width:900px){.vs-grid{grid-template-columns:1fr;}}
.vs-grid section{scroll-margin-top:130px;}
.vs-card{background:#fff;border:1px solid var(--spec-border);border-radius:16px;padding:22px;margin-bottom:18px;}
.vs-card h2{font-size:18px;font-weight:800;letter-spacing:-.02em;margin:0 0 14px;color:var(--spec-ink);}
.vs-card h3{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--spec-text-2nd);margin:18px 0 9px;}
.vs-subtle,.vs-subnav+*{}
.vs-subtle{font-size:13px;font-weight:600;color:var(--spec-text-2nd);}
.vs-prose{color:var(--spec-ink);font-size:14.5px;line-height:1.7;}
.vs-dim{color:var(--spec-text-2nd);}
.vs-bullets{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px;}
.vs-bullets li{display:flex;gap:10px;font-size:14px;color:var(--spec-ink);line-height:1.5;}
.vs-bullets li::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--spec-violet);margin-top:7px;flex-shrink:0;}
.vs-bullets.g li::before{background:var(--spec-success);}
.vs-chips{display:flex;flex-wrap:wrap;gap:8px;}
.vs-chip{font-size:12.5px;font-weight:600;padding:7px 13px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep);border:1px solid rgba(108,92,224,.25);}
.vs-chip.n{background:var(--spec-surface);color:var(--spec-ink);border-color:var(--spec-border);}
.vs-plist{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:560px){.vs-plist{grid-template-columns:1fr;}}
.vs-pcard{border:1px solid var(--spec-border);border-radius:13px;overflow:hidden;background:#fff;display:flex;flex-direction:column;transition:border-color .15s,transform .15s;}
.vs-pcard:hover{border-color:var(--spec-violet);transform:translateY(-2px);}
.vs-pimg{height:118px;background:var(--spec-surface);}
.vs-pimg img{width:100%;height:100%;object-fit:cover;}
.vs-noimg{height:100%;display:grid;place-items:center;color:var(--spec-text-2nd);font-size:11px;letter-spacing:.2em;font-weight:700;}
.vs-pb{padding:13px 14px 15px;display:flex;flex-direction:column;gap:6px;flex:1;}
.vs-pn{font-size:14px;font-weight:700;line-height:1.3;color:var(--spec-ink);}
.vs-pp{font-size:14px;font-weight:800;color:var(--spec-violet-deep);font-variant-numeric:tabular-nums;}
.vs-pm{font-size:11.5px;color:var(--spec-text-2nd);margin-top:auto;}
.vs-ptag{align-self:flex-start;font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:rgba(47,158,106,.14);color:#1F7A54;}
.vs-cmphead{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
.vs-cmphead h2{margin:0;}
.vs-sort{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--spec-text-2nd);}
.vs-sort button{font-family:inherit;font-size:12px;font-weight:600;color:var(--spec-text-2nd);background:var(--spec-warm-white);border:1px solid var(--spec-border);border-radius:8px;padding:6px 10px;cursor:pointer;}
.vs-sort button.on{background:rgba(108,92,224,.14);border-color:var(--spec-violet);color:var(--spec-violet-deep);}
.vs-cmpscroll{overflow-x:auto;margin:0 -4px;}
.vs-cmp{width:100%;border-collapse:collapse;font-size:13.5px;min-width:560px;}
.vs-cmp th{text-align:left;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--spec-text-2nd);padding:0 12px 10px;border-bottom:1px solid var(--spec-border);}
.vs-cmp td{padding:13px 12px;border-bottom:1px solid var(--spec-border);vertical-align:top;color:var(--spec-ink);}
.vs-cmp tr:last-child td{border-bottom:none;}
.vs-cmpname{font-weight:700;color:var(--spec-ink);display:block;}
.vs-cmpname:hover{color:var(--spec-violet-deep);}
.vs-cmpcat{font-size:11.5px;color:var(--spec-text-2nd);}
.vs-kind{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;white-space:nowrap;}
.vs-kind.product{background:rgba(108,92,224,.12);color:var(--spec-violet-deep);}
.vs-kind.service{background:rgba(47,158,106,.14);color:#1F7A54;}
.vs-cmpprice{font-weight:800;color:var(--spec-ink);font-variant-numeric:tabular-nums;white-space:nowrap;}
.vs-cmptime{color:var(--spec-ink);white-space:nowrap;}
.vs-bar{height:6px;border-radius:99px;background:var(--spec-surface);margin-top:6px;overflow:hidden;min-width:64px;max-width:120px;}
.vs-bar i{display:block;height:100%;border-radius:99px;background:var(--spec-violet);}
.vs-bar i.best{background:#3E6FD0;}
.vs-cmpbest{color:var(--spec-text-2nd);max-width:220px;}
.vs-cmpview{font-weight:700;color:var(--spec-violet-deep);white-space:nowrap;}
.vs-cmpview:hover{color:var(--spec-violet);}
.vs-cmpnote{font-size:11.5px;color:var(--spec-text-2nd);margin:14px 0 0;line-height:1.5;}
.vs-cs{border:1px solid var(--spec-border);border-radius:13px;padding:16px 18px;margin-bottom:12px;background:#fff;}
.vs-cs h4{font-size:15.5px;font-weight:800;margin:0 0 8px;color:var(--spec-ink);}
.vs-cprob,.vs-csol{font-size:13.5px;color:var(--spec-ink);margin:0 0 7px;line-height:1.55;}
.vs-cprob b,.vs-csol b{color:var(--spec-violet-deep);}
.vs-cres{font-size:13.5px;color:#1F7A54;font-weight:600;margin:8px 0 0;border-top:1px solid var(--spec-border);padding-top:10px;}
.vs-rev{border-bottom:1px solid var(--spec-border);padding:14px 0;}
.vs-rev:last-child{border-bottom:none;padding-bottom:0;}
.vs-revtop{display:flex;justify-content:space-between;align-items:center;gap:10px;}
.vs-stars{color:#8A5D14;font-size:13px;letter-spacing:1px;}
.vs-revverif{font-size:10.5px;font-weight:700;color:#1F7A54;background:rgba(47,158,106,.12);padding:2px 8px;border-radius:99px;}
.vs-revtitle{font-size:14px;font-weight:700;margin-top:8px;color:var(--spec-ink);}
.vs-revbody{font-size:13.5px;color:var(--spec-ink);margin:6px 0 0;line-height:1.55;}
.vs-side{position:sticky;top:calc(var(--spec-topbar-h) + 56px);display:flex;flex-direction:column;gap:0;}
.vs-side .vs-card{margin-bottom:16px;}
.vs-sidecta{background:linear-gradient(135deg,rgba(108,92,224,.14),rgba(47,158,106,.08));border-color:rgba(108,92,224,.3);}
.vs-sidecta p{font-size:12.5px;color:var(--spec-text-2nd);margin:6px 0 12px;line-height:1.5;}
.vs-nolisting{font-size:12px;color:#8A5D14;background:rgba(198,138,40,.1);border:1px solid rgba(198,138,40,.28);border-radius:9px;padding:8px 10px;line-height:1.5;}
.vs-qf{display:flex;justify-content:space-between;gap:12px;font-size:13.5px;padding:8px 0;border-bottom:1px solid var(--spec-border);}
.vs-qf:last-child{border-bottom:none;}
.vs-qf span{color:var(--spec-text-2nd);}
.vs-qf b{font-weight:600;text-align:right;color:var(--spec-ink);}
.vs-link{color:var(--spec-violet-deep);}
.vs-brandgrid{display:flex;flex-wrap:wrap;gap:8px;}
.vs-brandpill{font-size:12px;font-weight:600;color:var(--spec-ink);background:var(--spec-surface);border:1px solid var(--spec-border);border-radius:8px;padding:7px 11px;}
.vs-coverage{display:flex;flex-direction:column;gap:7px;font-size:13px;color:var(--spec-ink);}
.vs-coverage div{display:flex;align-items:center;gap:8px;}
.vs-dot{width:7px;height:7px;border-radius:50%;background:var(--spec-success);}
.vs-cert{display:flex;align-items:center;gap:9px;font-size:13px;padding:7px 0;color:var(--spec-ink);}
.vs-certi{flex-shrink:0;}
.vs-team{display:flex;flex-direction:column;gap:13px;}
.vs-member{display:flex;gap:12px;align-items:center;}
.vs-avatar{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-weight:800;font-size:15px;color:#fff;background:linear-gradient(135deg,var(--spec-violet),var(--spec-lilac));}
.vs-member b{font-size:14px;display:block;color:var(--spec-ink);}
.vs-member span{font-size:12px;color:var(--spec-text-2nd);}
.vs-teamnote{font-size:11.5px;color:var(--spec-text-2nd);margin:13px 0 0;line-height:1.5;}
`;
