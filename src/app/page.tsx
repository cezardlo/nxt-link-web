'use client';

// NXT//LINK homepage — task-oriented action engine (Cesar's spec, distilled
// from Amazon Business / Fiverr / Alibaba / Thomasnet / Upwork): a sticky
// header with logo + centered mega-search + Post-a-Request/Sign-in/Join,
// a hero with two equally-prominent CTAs (search vs. RFQ), a how-it-works
// strip, curated category tiles, and a trust bar — THEN the existing
// discovery sections (featured listings, shop-by-department, buying tools,
// vendor early-access band, FAQs, footer). Fully EN/ES via the shared
// LanguageToggle/useLang pattern (see /buyer, /cart). Featured products &
// departments are REAL data from the marketplace API.
//
// Trust-bar wording deviates from the original brief on purpose (Cesar-approved,
// workplace/plans/DECISIONS-2026-07-21.md): no escrow, no "secure payments" —
// NXT//LINK never implies it holds funds. See the ship report for the exact
// copy substitutions.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';
import { BadgeCheck, ShieldCheck, Send, ClipboardList, Sparkles, Handshake, Boxes, HardHat, Warehouse, Bot, Wrench, Truck } from 'lucide-react';

interface Card {
  id: string; kind: 'product' | 'service'; name: string; category: string;
  overview: string | null; image_url: string | null; vendor_name: string;
  vendor_city: string | null; vendor_verified?: boolean;
  pricing: { range?: string } | null; pilot: { available?: boolean } | null;
}
interface Dept { fg: string; label_en: string; label_es: string; is_service: boolean }

// The 6 curated category tiles (Cesar's spec) mapped to REAL functional-group
// values from the marketplace taxonomy (src/app/api/marketplace/categories) —
// same fg codes used by /marketplace's department filter and SupplyChips, so
// every tile actually filters real listings instead of being a dead link.
const CATEGORY_TILES: Array<{ fg: string; en: string; es: string; Icon: typeof Boxes }> = [
  { fg: 'material_handling', en: 'Material Handling', es: 'Manejo de materiales', Icon: Boxes },
  { fg: 'safety_security', en: 'Safety & PPE', es: 'Seguridad y EPP', Icon: HardHat },
  { fg: 'warehouse_tech', en: 'Warehouse Technology', es: 'Tecnología para almacenes', Icon: Warehouse },
  { fg: 'automation_robotics', en: 'Automation & Robotics', es: 'Automatización y robótica', Icon: Bot },
  { fg: 'svc_maintenance', en: 'Maintenance & Repair', es: 'Mantenimiento y reparación', Icon: Wrench },
  { fg: 'svc_transportation', en: 'Supply Chain Services', es: 'Servicios de cadena de suministro', Icon: Truck },
];

const T: Record<Lang, Record<string, string>> = {
  en: {
    docTitle: 'NXT//LINK — Borderplex Industrial Marketplace',
    searchPh: 'Search equipment, services, or part numbers…',
    searchAria: 'Search the marketplace',
    searchBtn: 'Search',
    signIn: 'Sign in',
    join: 'Join',
    postRequest: 'Post a Request',
    eyebrow: 'Borderplex Industrial Marketplace',
    heroTitle: 'Find industrial suppliers. Get competitive quotes. Close deals safely.',
    heroCta1: 'Search Products & Services',
    heroCta2: 'Post a Request / RFQ',
    howHeading: 'How it works',
    step1Title: 'Describe your need', step1Desc: 'Search the catalog or post one request describing what you need.',
    step2Title: 'Get matched quotes', step2Desc: 'Verified Borderplex vendors respond with price, lead time, and warranty.',
    step3Title: 'Compare and close safely', step3Desc: 'Compare side by side and close the deal through NXT//LINK.',
    catHeading: 'Browse by category',
    trustVerified: 'Verified Suppliers',
    trustProtected: 'Protected Introductions (12 months)',
    trustFree: 'Free to send · no commitment',
    featuredHeading: 'Featured on NXT//LINK', seeAll: 'See all →', pilotAvailable: 'Pilot available',
    createFreeAccount: 'Create a free account',
    deptHeading: 'Shop by department',
    toolsHeading: 'Everything the buying process needs',
    tool1T: 'Request quotes in one place', tool1D: 'Send one request, reach the vendors you choose. No chasing emails.',
    tool2T: 'Compare vendors side by side', tool2D: 'Price, lead time, installation, warranty, and support — lined up to decide fast.',
    tool3T: 'Pilot before you buy', tool3D: 'Try equipment on your own dock, with real success criteria, before committing.',
    tool4T: 'Track every project', tool4D: 'From quote to install to warranty — one workspace with the next step always clear.',
    tool5T: 'Protected & transparent', tool5D: 'Deals run through NXT//LINK. Your introduction is protected and pricing is clear.',
    tool6T: 'Built for the Borderplex', tool6D: 'Local El Paso & Juárez vendors, cross-border ready, English and Spanish.',
    vendorHeading: 'Are you a supplier?',
    vendorBody: 'We’re onboarding the first Borderplex vendors now — personally. Apply for early access and we’ll set up your storefront with you, free. Your first two deals are commission-free.',
    vendorApply: 'Apply for early access',
    eaTitle: 'Apply for early access',
    eaSub: 'Tell us about your company. We onboard vendors one-on-one — no long forms, no cost to join.',
    eaCompany: 'Company name', eaContact: 'Your name', eaEmail: 'Work email', eaPhone: 'Phone (optional)',
    eaCity: 'City (El Paso, Juárez…)', eaNote: 'What do you sell or service? (optional)',
    eaSubmit: 'Request early access', eaSending: 'Sending…',
    eaFootnote: 'Free to join · first two deals commission-free · then 5% when you get paid.',
    eaDoneTitle: 'You’re on the list.',
    eaDoneBody: 'Thanks — a member of the NXT//LINK team will reach out personally to set up your storefront. Keep an eye on your inbox.',
    eaDoneBtn: 'Done',
    close: 'Close',
    faqHeading: 'Frequently asked questions',
    faq1q: 'What is NXT//LINK?',
    faq1a: 'NXT//LINK is the industrial marketplace for the El Paso–Juárez Borderplex. Warehouses, 3PLs, distribution centers, and manufacturers use it to find, compare, and request quotes for the equipment, products, technology, and services they need — and to manage the whole project in one place.',
    faq2q: 'Is it free to use?',
    faq2a: 'Yes. Creating an account, browsing, comparing, and requesting quotes is free for buyers. Vendors join free too — NXT//LINK only earns a success fee after a deal closes, and your first deals are free.',
    faq3q: 'How do quotes work?',
    faq3a: 'Describe what you need (or search for it), pick the vendors you want, and send one request. Vendors respond with structured quotes — price, lead time, warranty, support — that you compare side by side. All communication runs through NXT//LINK.',
    faq4q: 'What areas do you serve?',
    faq4a: 'We focus on the Borderplex: El Paso, Horizon City, Juárez, southern New Mexico, and West Texas — including cross-border and customs-ready vendors.',
    faq5q: 'I’m a vendor — how do I join?',
    faq5a: 'Create a vendor account, upload a brochure, and our AI drafts your listing for you. Once your profile is complete and verified, you start receiving qualified leads from local buyers.',
    footerTagline: 'The industrial supply chain marketplace for the El Paso–Juárez Borderplex.',
    forBuyers: 'For buyers', browseMarketplace: 'Browse marketplace', createAccount: 'Create account', myProjects: 'My projects',
    forVendors: 'For vendors', listYourCompany: 'List your company', vendorSignIn: 'Vendor sign in', sellerCentral: 'Seller Central',
    company: 'Company', terms: 'Terms', privacy: 'Privacy',
    copyright: '© 2026 NXT//LINK · El Paso, Texas · Serving the Borderplex',
  },
  es: {
    docTitle: 'NXT//LINK — Mercado Industrial del Borderplex',
    searchPh: 'Busca equipo, servicios o números de parte…',
    searchAria: 'Buscar en el marketplace',
    searchBtn: 'Buscar',
    signIn: 'Iniciar sesión',
    join: 'Únete',
    postRequest: 'Publicar una solicitud',
    eyebrow: 'Mercado industrial del Borderplex',
    heroTitle: 'Encuentra proveedores industriales. Obtén cotizaciones competitivas. Cierra tratos de forma segura.',
    heroCta1: 'Buscar productos y servicios',
    heroCta2: 'Publicar una solicitud (RFQ)',
    howHeading: 'Cómo funciona',
    step1Title: 'Describe lo que necesitas', step1Desc: 'Busca en el catálogo o publica una solicitud describiendo lo que necesitas.',
    step2Title: 'Recibe cotizaciones a tu medida', step2Desc: 'Proveedores verificados del Borderplex responden con precio, tiempo de entrega y garantía.',
    step3Title: 'Compara y cierra de forma segura', step3Desc: 'Compara lado a lado y cierra el trato a través de NXT//LINK.',
    catHeading: 'Explorar por categoría',
    trustVerified: 'Proveedores verificados',
    trustProtected: 'Introducciones protegidas (12 meses)',
    trustFree: 'Gratis enviar · sin compromiso',
    featuredHeading: 'Destacado en NXT//LINK', seeAll: 'Ver todo →', pilotAvailable: 'Piloto disponible',
    createFreeAccount: 'Crea una cuenta gratis',
    deptHeading: 'Explorar por departamento',
    toolsHeading: 'Todo lo que necesita el proceso de compra',
    tool1T: 'Solicita cotizaciones en un solo lugar', tool1D: 'Envía una solicitud y llega a los proveedores que elijas. Sin perseguir correos.',
    tool2T: 'Compara proveedores lado a lado', tool2D: 'Precio, tiempo de entrega, instalación, garantía y soporte — listos para decidir rápido.',
    tool3T: 'Prueba antes de comprar', tool3D: 'Prueba el equipo en tu propio sitio, con criterios de éxito reales, antes de comprometerte.',
    tool4T: 'Da seguimiento a cada proyecto', tool4D: 'De la cotización a la instalación y la garantía — un solo espacio con el siguiente paso siempre claro.',
    tool5T: 'Protegido y transparente', tool5D: 'Los tratos se manejan a través de NXT//LINK. Tu presentación está protegida y el precio es claro.',
    tool6T: 'Hecho para el Borderplex', tool6D: 'Proveedores locales de El Paso y Juárez, listos para cruzar la frontera, en inglés y español.',
    vendorHeading: '¿Eres proveedor?',
    vendorBody: 'Estamos incorporando a los primeros proveedores del Borderplex ahora — de forma personal. Solicita acceso anticipado y armamos tu escaparate contigo, gratis. Tus primeros dos tratos no tienen comisión.',
    vendorApply: 'Solicitar acceso anticipado',
    eaTitle: 'Solicitar acceso anticipado',
    eaSub: 'Cuéntanos sobre tu empresa. Incorporamos proveedores uno a uno — sin formularios largos, sin costo por unirte.',
    eaCompany: 'Nombre de la empresa', eaContact: 'Tu nombre', eaEmail: 'Correo de trabajo', eaPhone: 'Teléfono (opcional)',
    eaCity: 'Ciudad (El Paso, Juárez…)', eaNote: '¿Qué vendes o qué servicio ofreces? (opcional)',
    eaSubmit: 'Solicitar acceso anticipado', eaSending: 'Enviando…',
    eaFootnote: 'Gratis unirte · tus primeros dos tratos sin comisión · luego 5% cuando te paguen.',
    eaDoneTitle: 'Ya estás en la lista.',
    eaDoneBody: 'Gracias — alguien del equipo de NXT//LINK te contactará personalmente para armar tu escaparate. Mantente al pendiente de tu correo.',
    eaDoneBtn: 'Listo',
    close: 'Cerrar',
    faqHeading: 'Preguntas frecuentes',
    faq1q: '¿Qué es NXT//LINK?',
    faq1a: 'NXT//LINK es el marketplace industrial para el Borderplex El Paso–Juárez. Almacenes, 3PLs, centros de distribución y manufactureras lo usan para encontrar, comparar y solicitar cotizaciones del equipo, productos, tecnología y servicios que necesitan — y para manejar todo el proyecto en un solo lugar.',
    faq2q: '¿Es gratis usarlo?',
    faq2a: 'Sí. Crear una cuenta, explorar, comparar y solicitar cotizaciones es gratis para compradores. Los proveedores también se unen gratis — NXT//LINK solo gana una comisión de éxito cuando se cierra un trato, y tus primeros tratos son gratis.',
    faq3q: '¿Cómo funcionan las cotizaciones?',
    faq3a: 'Describe lo que necesitas (o búscalo), elige los proveedores que quieras y envía una sola solicitud. Los proveedores responden con cotizaciones estructuradas — precio, tiempo de entrega, garantía, soporte — que comparas lado a lado. Toda la comunicación pasa por NXT//LINK.',
    faq4q: '¿Qué zonas cubren?',
    faq4a: 'Nos enfocamos en el Borderplex: El Paso, Horizon City, Juárez, el sur de Nuevo México y el oeste de Texas — incluyendo proveedores listos para cruzar la frontera y con trámites aduanales.',
    faq5q: 'Soy proveedor — ¿cómo me uno?',
    faq5a: 'Crea una cuenta de proveedor, sube un folleto y nuestra IA redacta tu publicación por ti. Cuando tu perfil esté completo y verificado, empiezas a recibir prospectos calificados de compradores locales.',
    footerTagline: 'El marketplace de la cadena de suministro industrial para el Borderplex El Paso–Juárez.',
    forBuyers: 'Para compradores', browseMarketplace: 'Explorar marketplace', createAccount: 'Crear cuenta', myProjects: 'Mis proyectos',
    forVendors: 'Para proveedores', listYourCompany: 'Publica tu empresa', vendorSignIn: 'Acceso de proveedores', sellerCentral: 'Centro de vendedores',
    company: 'Compañía', terms: 'Términos', privacy: 'Privacidad',
    copyright: '© 2026 NXT//LINK · El Paso, Texas · Sirviendo al Borderplex',
  },
};

export default function Home() {
  const [lang, setLang] = useLang(); // stored `nxt_lang` — shared across marketplace pages
  const t = T[lang];
  const [featured, setFeatured] = useState<Card[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  function goSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    window.location.href = q ? `/marketplace?q=${encodeURIComponent(q)}` : '/marketplace';
  }
  // Hero CTA 1 ("Search Products & Services") focuses the header's mega-search
  // instead of navigating away — the search bar is already on screen.
  function focusSearch() {
    searchRef.current?.focus();
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [eaOpen, setEaOpen] = useState(false);
  const [ea, setEa] = useState({ company_name: '', contact_name: '', email: '', phone: '', city: '', note: '' });
  const [eaDone, setEaDone] = useState(false);
  const [eaBusy, setEaBusy] = useState(false);
  const eaStarted = useRef(0);

  async function submitEarlyAccess() {
    if (!ea.email.trim()) return;
    setEaBusy(true);
    try {
      await fetch('/api/early-access', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ea, kind: 'vendor', started_at: eaStarted.current, website_url: '' }),
      });
      setEaDone(true);
    } catch { setEaDone(true); }
    setEaBusy(false);
  }

  useEffect(() => { document.title = t.docTitle; }, [t.docTitle]);

  useEffect(() => {
    (async () => {
      try {
        const [l, c] = await Promise.all([
          fetch('/api/marketplace/listings?kind=product'),
          fetch('/api/marketplace/categories'),
        ]);
        const lj = await l.json();
        setFeatured((lj.listings || []).slice(0, 8));
        const cj = await c.json();
        setDepts((cj.departments || []).map((d: Dept) => ({ fg: d.fg, label_en: d.label_en, label_es: d.label_es, is_service: d.is_service })));
      } catch { /* landing still works without live data */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="hp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Header: logo left, centered mega-search, Post a Request / Sign in / Join right */}
      <header className="hp-header">
        <div className="hp-headmain">
          <a className="hp-brand" href="/"><b>NXT<i>//</i>LINK</b></a>
          <form className="hp-headsearch" onSubmit={goSearch} role="search">
            <SearchIcon />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPh}
              aria-label={t.searchAria}
            />
            <button type="submit">{t.searchBtn}</button>
          </form>
          <div className="hp-headactions">
            <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
            <a className="hp-signin" href="/login">{t.signIn}</a>
            <a className="hp-joinbtn" href="/signup">{t.join}</a>
            <a className="hp-rfqinline" href="/intake">{t.postRequest}</a>
          </div>
        </div>
        <a className="hp-rfqblock" href="/intake">{t.postRequest}</a>
      </header>

      {/* Hero — value prop + two equally-prominent CTAs (search vs. RFQ) */}
      <section className="hp-hero">
        <div className="hp-heroin">
          <span className="hp-eyebrow">{t.eyebrow}</span>
          <h1>{t.heroTitle}</h1>
          <div className="hp-herocta">
            <button type="button" className="hp-btn" onClick={focusSearch}>{t.heroCta1}</button>
            <Link className="hp-btn alt" href="/intake">{t.heroCta2}</Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="hp-how">
        <h2 className="hp-howheading">{t.howHeading}</h2>
        <div className="hp-howgrid">
          {([
            ['1', ClipboardList, t.step1Title, t.step1Desc],
            ['2', Sparkles, t.step2Title, t.step2Desc],
            ['3', Handshake, t.step3Title, t.step3Desc],
          ] as Array<[string, typeof ClipboardList, string, string]>).map(([n, Icon, title, desc]) => (
            <div className="hp-step" key={n}>
              <span className="hp-stepn">{n}</span>
              <div>
                <b><Icon className="hp-stepicon" size={16} aria-hidden="true" /> {title}</b>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category tiles — 3x2 grid (swipeable row on mobile), real taxonomy values */}
      <section className="hp-sec">
        <div className="hp-sechead"><h2>{t.catHeading}</h2></div>
        <div className="hp-cattiles">
          {CATEGORY_TILES.map(({ fg, en, es, Icon }) => (
            <Link key={fg} href={`/marketplace?department=${fg}`} className="hp-cattile">
              <span className="hp-cattileicon"><Icon size={20} aria-hidden="true" /></span>
              <b>{lang === 'es' ? es : en}</b>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust bar — no escrow / no funds-holding language (see file header note) */}
      <div className="hp-trustbar">
        <span className="hp-trustitem"><BadgeCheck size={16} aria-hidden="true" /> {t.trustVerified}</span>
        <span className="hp-trustitem"><ShieldCheck size={16} aria-hidden="true" /> {t.trustProtected}</span>
        <span className="hp-trustitem"><Send size={16} aria-hidden="true" /> {t.trustFree}</span>
      </div>

      {/* Featured live listings */}
      {loading && (
        <section className="hp-sec">
          <div className="hp-sechead"><h2>{t.featuredHeading}</h2></div>
          <div className="hp-prods">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="hp-prod hp-prodskel" />)}</div>
        </section>
      )}
      {!loading && featured.length > 0 && (
        <section className="hp-sec">
          <div className="hp-sechead"><h2>{t.featuredHeading}</h2><a href="/marketplace">{t.seeAll}</a></div>
          <div className="hp-prods">
            {featured.map((c) => (
              <a key={c.id} className="hp-prod" href={`/marketplace/${c.kind}/${c.id}`}>
                <div className="hp-prodimg">{c.image_url ? <img src={c.image_url} alt={c.name} loading="lazy" /> : <div className="hp-noimg">NXT//LINK</div>}</div>
                <div className="hp-prodbody">
                  {c.pilot?.available && <span className="hp-badge">{t.pilotAvailable}</span>}
                  <div className="hp-prodname">{c.name}</div>
                  {c.pricing?.range && <div className="hp-price">{c.pricing.range}</div>}
                  <div className="hp-vend">{c.vendor_name}{c.vendor_city ? ` · ${c.vendor_city}` : ''}</div>
                </div>
              </a>
            ))}
          </div>
          <a className="hp-bigcta" href="/signup">{t.createFreeAccount}</a>
        </section>
      )}

      {/* Shop by department (full live taxonomy) */}
      {depts.length > 0 && (
        <section className="hp-sec">
          <div className="hp-sechead"><h2>{t.deptHeading}</h2></div>
          <div className="hp-depts">
            {depts.map((d) => (
              <a key={d.fg} className={`hp-dept ${d.is_service ? 'svc' : ''}`} href={`/marketplace?department=${d.fg}`}>{lang === 'es' ? d.label_es : d.label_en}</a>
            ))}
          </div>
        </section>
      )}

      {/* Buying tools */}
      <section className="hp-sec">
        <div className="hp-sechead"><h2>{t.toolsHeading}</h2></div>
        <div className="hp-tools">
          {([
            [t.tool1T, t.tool1D], [t.tool2T, t.tool2D], [t.tool3T, t.tool3D],
            [t.tool4T, t.tool4D], [t.tool5T, t.tool5D], [t.tool6T, t.tool6D],
          ] as Array<[string, string]>).map(([title, d]) => (
            <div key={title} className="hp-tool"><div className="hp-tooldot" /><b>{title}</b><p>{d}</p></div>
          ))}
        </div>
      </section>

      {/* For vendors band — early access (concierge onboarding) */}
      <section className="hp-vendorband">
        <div className="hp-vbin">
          <div>
            <h2>{t.vendorHeading}</h2>
            <p>{t.vendorBody}</p>
          </div>
          <button className="hp-btn" onClick={() => { setEaOpen(true); setEaDone(false); eaStarted.current = Date.now(); }}>{t.vendorApply}</button>
        </div>
      </section>

      {/* Early-access modal */}
      {eaOpen && (
        <div className="hp-modal" onClick={() => setEaOpen(false)}>
          <div className="hp-modalin" onClick={(e) => e.stopPropagation()}>
            <button className="hp-modalx" onClick={() => setEaOpen(false)} aria-label={t.close}>×</button>
            {eaDone ? (
              <div className="hp-eadone">
                <div className="hp-eabig">✓</div>
                <h3>{t.eaDoneTitle}</h3>
                <p>{t.eaDoneBody}</p>
                <button className="hp-btn" onClick={() => setEaOpen(false)}>{t.eaDoneBtn}</button>
              </div>
            ) : (
              <>
                <h3>{t.eaTitle}</h3>
                <p className="hp-easub">{t.eaSub}</p>
                <input type="text" name="website_url" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true" />
                <div className="hp-earow">
                  <label className="hp-sronly" htmlFor="ea-company">{t.eaCompany}</label>
                  <input id="ea-company" placeholder={t.eaCompany} value={ea.company_name} onChange={(e) => setEa({ ...ea, company_name: e.target.value })} />
                  <label className="hp-sronly" htmlFor="ea-contact">{t.eaContact}</label>
                  <input id="ea-contact" placeholder={t.eaContact} value={ea.contact_name} onChange={(e) => setEa({ ...ea, contact_name: e.target.value })} />
                </div>
                <div className="hp-earow">
                  <label className="hp-sronly" htmlFor="ea-email">{t.eaEmail}</label>
                  <input id="ea-email" type="email" placeholder={t.eaEmail} value={ea.email} onChange={(e) => setEa({ ...ea, email: e.target.value })} />
                  <label className="hp-sronly" htmlFor="ea-phone">{t.eaPhone}</label>
                  <input id="ea-phone" type="tel" placeholder={t.eaPhone} value={ea.phone} onChange={(e) => setEa({ ...ea, phone: e.target.value })} />
                </div>
                <label className="hp-sronly" htmlFor="ea-city">{t.eaCity}</label>
                <input id="ea-city" placeholder={t.eaCity} value={ea.city} onChange={(e) => setEa({ ...ea, city: e.target.value })} />
                <label className="hp-sronly" htmlFor="ea-note">{t.eaNote}</label>
                <textarea id="ea-note" rows={2} placeholder={t.eaNote} value={ea.note} onChange={(e) => setEa({ ...ea, note: e.target.value })} />
                <button className="hp-btn" disabled={eaBusy || !ea.email.trim()} onClick={submitEarlyAccess} style={{ width: '100%', marginTop: 8 }}>{eaBusy ? t.eaSending : t.eaSubmit}</button>
                <p className="hp-eanote">{t.eaFootnote}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* FAQs */}
      <section className="hp-sec">
        <div className="hp-sechead"><h2>{t.faqHeading}</h2></div>
        <div className="hp-faqs">
          {([
            [t.faq1q, t.faq1a], [t.faq2q, t.faq2a], [t.faq3q, t.faq3a], [t.faq4q, t.faq4a], [t.faq5q, t.faq5a],
          ] as Array<[string, string]>).map(([q, a], i) => (
            <div key={i} className={`hp-faq ${openFaq === i ? 'open' : ''}`}>
              <button className="hp-faqq" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{q}</span><span className="hp-faqi" aria-hidden="true">{openFaq === i ? '–' : '+'}</span>
              </button>
              {openFaq === i && <div className="hp-faqa">{a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="hp-foot">
        <div className="hp-footcols">
          <div>
            <b>NXT<i style={{ color: '#A78BFA', fontStyle: 'normal' }}>//</i>LINK</b>
            <p className="hp-foottag">{t.footerTagline}</p>
          </div>
          <div>
            <h4>{t.forBuyers}</h4>
            <a href="/marketplace">{t.browseMarketplace}</a>
            <a href="/signup">{t.createAccount}</a>
            <a href="/projects">{t.myProjects}</a>
            <a href="/login">{t.signIn}</a>
          </div>
          <div>
            <h4>{t.forVendors}</h4>
            <a href="/signup">{t.listYourCompany}</a>
            <a href="/vendor-login">{t.vendorSignIn}</a>
            <a href="/vendor/leads">{t.sellerCentral}</a>
          </div>
          <div>
            <h4>{t.company}</h4>
            <a href="/terms">{t.terms}</a>
            <a href="/privacy">{t.privacy}</a>
          </div>
        </div>
        <div className="hp-footbottom">{t.copyright}</div>
      </footer>

      {/* Mobile-only sticky primary CTA — keeps "Post a Request" thumb-reachable
          while scrolling category tiles etc. (Cesar's mobile spec). */}
      <div className="hp-mobilecta">
        <a className="hp-mobilectabtn" href="/intake">{t.postRequest}</a>
      </div>
    </div>
  );
}

function SearchIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
}

const CSS = `
.hp{background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.hp *{box-sizing:border-box;}
.hp a{text-decoration:none;}
.hp-sronly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}

/* Header */
.hp-header{position:sticky;top:0;z-index:40;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.08);padding:12px 20px;}
.hp-headmain{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:18px;max-width:1280px;margin:0 auto;}
.hp-brand{grid-column:1;color:#F0F0F5;}
.hp-brand b{font-size:18px;font-weight:800;letter-spacing:-.02em;color:#F0F0F5;}.hp-brand i{color:#A78BFA;font-style:normal;}
.hp-headsearch{grid-column:2;justify-self:center;display:flex;align-items:center;gap:8px;width:100%;max-width:560px;background:#14141F;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:0 6px 0 14px;color:#8080A0;}
.hp-headsearch:focus-within{border-color:#7C5CFC;box-shadow:0 0 0 3px rgba(124,92,252,.2);}
.hp-headsearch svg{flex-shrink:0;}
.hp-headsearch input{flex:1;min-width:0;background:none;border:none;outline:none;color:#F0F0F5;font-family:inherit;font-size:14.5px;padding:10px 0;}
.hp-headsearch input::placeholder{color:#6A6A85;}
.hp-headsearch button{flex-shrink:0;background:#7C5CFC;color:#fff;font-family:inherit;font-weight:700;font-size:13.5px;border:none;border-radius:9px;padding:9px 16px;cursor:pointer;margin:4px 0;}
.hp-headsearch button:hover{background:#6344DF;}
.hp-headactions{grid-column:3;justify-self:end;display:flex;align-items:center;gap:12px;flex-shrink:0;}
.hp-signin{color:#9A97AF;font-size:13.5px;font-weight:600;white-space:nowrap;}
.hp-signin:hover{color:#F0F0F5;}
.hp-joinbtn{color:#F0F0F5;font-size:13.5px;font-weight:700;padding:8px 14px;border-radius:9px;border:1px solid rgba(255,255,255,.16);white-space:nowrap;}
.hp-joinbtn:hover{border-color:rgba(255,255,255,.32);}
.hp-rfqinline{background:#7C5CFC;color:#fff !important;font-size:13.5px;font-weight:700;padding:9px 16px;border-radius:9px;white-space:nowrap;}
.hp-rfqinline:hover{background:#6344DF;}
.hp-rfqblock{display:none;}
@media(max-width:760px){
  .hp-headmain{grid-template-columns:1fr auto;grid-template-areas:"brand actions" "search search";row-gap:10px;}
  .hp-brand{grid-area:brand;grid-column:auto;}
  .hp-headactions{grid-area:actions;grid-column:auto;}
  .hp-headsearch{grid-area:search;grid-column:auto;max-width:none;}
  .hp-rfqinline{display:none;}
  .hp-rfqblock{display:flex;justify-content:center;align-items:center;margin-top:10px;width:100%;background:#7C5CFC;color:#fff;font-weight:700;font-size:15px;padding:13px;border-radius:11px;}
}
@media(max-width:480px){.hp-signin{display:none;}}

/* Hero */
.hp-hero{position:relative;overflow:hidden;border-bottom:1px solid rgba(255,255,255,.06);
  background:radial-gradient(900px 500px at 78% -10%,rgba(124,92,252,.18),transparent 60%),radial-gradient(600px 400px at 5% 110%,rgba(52,211,153,.08),transparent 55%);}
.hp-heroin{max-width:820px;margin:0 auto;padding:56px 22px 48px;text-align:center;}
.hp-eyebrow{font-size:12.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#C4B5FD;}
.hp-hero h1{font-size:clamp(26px,5vw,44px);font-weight:800;letter-spacing:-.03em;line-height:1.12;margin:16px auto 0;max-width:26ch;text-wrap:balance;}
.hp-herocta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:28px;}
.hp-btn{font-family:inherit;background:#7C5CFC;color:#fff;font-weight:700;font-size:15px;padding:14px 26px;border-radius:12px;border:none;cursor:pointer;box-shadow:0 14px 34px -14px rgba(124,92,252,.7);}
.hp-btn:hover{background:#6344DF;}
.hp-btn.alt{background:#1B7A55;box-shadow:0 14px 34px -14px rgba(52,211,153,.5);}
.hp-btn.alt:hover{background:#178F62;}

/* How it works */
.hp-how{max-width:1000px;margin:0 auto;padding:46px 22px 8px;}
.hp-howheading{font-size:clamp(19px,2.6vw,24px);font-weight:800;letter-spacing:-.02em;text-align:center;margin:0 0 22px;}
.hp-howgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
@media(max-width:720px){.hp-howgrid{grid-template-columns:1fr;}}
.hp-step{display:flex;gap:14px;align-items:flex-start;background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:20px;}
.hp-stepn{flex-shrink:0;width:30px;height:30px;border-radius:50%;background:rgba(124,92,252,.16);color:#C4B5FD;font-weight:800;display:grid;place-items:center;font-size:14px;}
.hp-step b{font-size:15.5px;font-weight:800;display:flex;align-items:center;gap:7px;}
.hp-stepicon{color:#A78BFA;flex-shrink:0;}
.hp-step p{color:#8080A0;font-size:13px;line-height:1.55;margin:5px 0 0;}

/* Category tiles */
.hp-cattiles{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.hp-cattile{display:flex;align-items:center;gap:12px;background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 16px;color:#F0F0F5;transition:border-color .15s,transform .15s;}
.hp-cattile:hover{border-color:rgba(124,92,252,.5);transform:translateY(-2px);}
.hp-cattile b{font-size:14px;font-weight:700;line-height:1.3;}
.hp-cattileicon{flex-shrink:0;width:38px;height:38px;border-radius:10px;background:rgba(124,92,252,.14);color:#C4B5FD;display:grid;place-items:center;}
@media(max-width:720px){
  .hp-cattiles{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:74%;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px;-webkit-overflow-scrolling:touch;}
  .hp-cattile{scroll-snap-align:start;}
}

/* Trust bar */
.hp-trustbar{display:flex;justify-content:center;gap:26px;flex-wrap:wrap;max-width:1000px;margin:38px auto 0;padding:0 22px;}
.hp-trustitem{display:flex;align-items:center;gap:8px;color:#B8B6CC;font-size:13px;font-weight:600;}
.hp-trustitem svg{color:#34D399;flex-shrink:0;}

.hp-sec{max-width:1160px;margin:0 auto;padding:52px 22px 0;}
.hp-sechead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:20px;}
.hp-sechead h2{font-size:clamp(19px,2.6vw,26px);font-weight:800;letter-spacing:-.02em;}
.hp-sechead a{color:#A78BFA;font-size:13.5px;font-weight:600;}
.hp-prods{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;}
.hp-prod{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .15s,transform .15s;color:#F0F0F5;}
.hp-prodskel{height:236px;background:linear-gradient(100deg,#14141F 30%,#1c1c2b 50%,#14141F 70%);background-size:200% 100%;animation:hpshimmer 1.3s ease-in-out infinite;}
@keyframes hpshimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
@media (prefers-reduced-motion:reduce){.hp-prodskel{animation:none;}}
.hp-prod:hover{border-color:rgba(124,92,252,.5);transform:translateY(-3px);}
.hp-prodimg{height:150px;background:#0E0E16;}
.hp-prodimg img{width:100%;height:100%;object-fit:cover;}
.hp-noimg{height:100%;display:grid;place-items:center;color:#42425A;font-size:12px;letter-spacing:.2em;font-weight:700;}
.hp-prodbody{padding:13px 14px 15px;display:flex;flex-direction:column;gap:6px;flex:1;}
.hp-badge{align-self:flex-start;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#34D399;background:rgba(52,211,153,.12);padding:3px 8px;border-radius:99px;}
.hp-prodname{font-size:14px;font-weight:700;line-height:1.3;}
.hp-price{font-size:15px;font-weight:800;color:#C4B5FD;font-variant-numeric:tabular-nums;}
.hp-vend{font-size:11.5px;color:#8080A0;margin-top:auto;}
.hp-bigcta{display:block;width:max-content;margin:26px auto 0;background:#7C5CFC;color:#fff;font-weight:700;font-size:14.5px;padding:13px 30px;border-radius:12px;}
.hp-bigcta:hover{background:#6344DF;}
.hp-depts{display:flex;flex-wrap:wrap;gap:10px;}
.hp-dept{background:#14141F;border:1px solid rgba(255,255,255,.1);border-radius:11px;padding:14px 16px;font-size:13.5px;font-weight:600;color:#D5D4E0;transition:border-color .15s,background .15s;}
.hp-dept:hover{border-color:rgba(124,92,252,.5);background:rgba(124,92,252,.08);color:#C4B5FD;}
.hp-dept.svc:hover{border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.08);color:#34D399;}
.hp-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;}
.hp-tool{background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;}
.hp-tooldot{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#7C5CFC,#34D399);margin-bottom:13px;}
.hp-tool b{font-size:15.5px;font-weight:800;}
.hp-tool p{color:#9A97AF;font-size:13.5px;line-height:1.6;margin:7px 0 0;}
.hp-vendorband{max-width:1160px;margin:56px auto 0;padding:0 22px;}
.hp-vbin{background:linear-gradient(120deg,rgba(124,92,252,.16),rgba(52,211,153,.08));border:1px solid rgba(124,92,252,.3);border-radius:18px;padding:30px 32px;display:flex;justify-content:space-between;align-items:center;gap:22px;flex-wrap:wrap;}
.hp-vbin h2{font-size:22px;font-weight:800;letter-spacing:-.02em;}
.hp-vbin p{color:#B8B6CC;font-size:14.5px;line-height:1.55;margin:8px 0 0;max-width:52ch;}
.hp-faqs{display:flex;flex-direction:column;gap:10px;max-width:820px;}
.hp-faq{background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;}
.hp-faq.open{border-color:rgba(124,92,252,.35);}
.hp-faqq{width:100%;display:flex;justify-content:space-between;align-items:center;gap:14px;font-family:inherit;font-size:15px;font-weight:700;color:#F0F0F5;background:none;border:none;padding:17px 18px;cursor:pointer;text-align:left;}
.hp-faqq:focus-visible{outline:2px solid #7C5CFC;outline-offset:-2px;}
.hp-faqi{color:#A78BFA;font-size:20px;font-weight:400;flex-shrink:0;}
.hp-faqa{padding:0 18px 17px;color:#B8B6CC;font-size:14px;line-height:1.65;}
.hp-foot{margin-top:64px;border-top:1px solid rgba(255,255,255,.08);background:#0C0C13;padding-bottom:0;}
.hp-footcols{max-width:1160px;margin:0 auto;padding:44px 22px 30px;display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:28px;}
@media(max-width:720px){.hp-footcols{grid-template-columns:1fr 1fr;}}
.hp-footcols>div>b{font-size:17px;font-weight:800;}
.hp-foottag{color:#8080A0;font-size:13px;line-height:1.6;margin:10px 0 0;max-width:34ch;}
.hp-footcols h4{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8080A0;margin:0 0 12px;}
.hp-footcols a{display:block;color:#B8B6CC;font-size:13.5px;margin-bottom:9px;}
.hp-footcols a:hover{color:#C4B5FD;}
.hp-footbottom{border-top:1px solid rgba(255,255,255,.06);padding:18px 22px;text-align:center;color:#5A5A70;font-size:12.5px;}
.hp-modal{position:fixed;inset:0;background:rgba(0,0,0,.62);display:grid;place-items:center;z-index:60;padding:20px;}
.hp-modalin{position:relative;background:#12121B;border:1px solid rgba(255,255,255,.12);border-radius:18px;max-width:460px;width:100%;padding:26px;}
.hp-modalx{position:absolute;top:14px;right:16px;background:none;border:none;color:#8080A0;font-size:24px;line-height:1;cursor:pointer;}
.hp-modalin h3{font-size:20px;font-weight:800;letter-spacing:-.02em;margin:0;}
.hp-easub{color:#9A97AF;font-size:13.5px;line-height:1.5;margin:8px 0 16px;}
.hp-earow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
@media(max-width:440px){.hp-earow{grid-template-columns:1fr;}}
.hp-modalin input,.hp-modalin textarea{width:100%;font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0A0A0F;color:#F0F0F5;outline:none;margin-bottom:10px;resize:vertical;}
.hp-modalin input:focus,.hp-modalin textarea:focus{border-color:#7C5CFC;}
.hp-eanote{font-size:11.5px;color:#63607A;text-align:center;margin:12px 0 0;line-height:1.5;}
.hp-eadone{text-align:center;padding:8px 0;}
.hp-eabig{width:52px;height:52px;border-radius:50%;background:rgba(52,211,153,.16);color:#34D399;display:grid;place-items:center;font-size:26px;margin:0 auto 14px;}
.hp-eadone h3{font-size:20px;}
.hp-eadone p{color:#9A97AF;font-size:14px;line-height:1.6;margin:10px 0 18px;}

/* Mobile sticky primary CTA */
.hp-mobilecta{display:none;}
@media(max-width:760px){
  .hp{padding-bottom:78px;}
  .hp-mobilecta{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:45;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(10,10,15,.94);backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,.08);}
  .hp-mobilectabtn{display:block;width:100%;text-align:center;background:#7C5CFC;color:#fff;font-weight:700;font-size:15px;padding:13px;border-radius:11px;}
}
`;
