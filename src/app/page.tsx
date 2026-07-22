'use client';

// NXT//LINK homepage — task-oriented action engine (Cesar's spec, distilled
// from Amazon Business / Fiverr Pro / Alibaba / Thomasnet / Upwork).
//
// VISUAL RESKIN (2026-07-21, this pass): reskinned from the app's old dark
// "command-center" theme to Design System v1.0 (vault/Design-System.md) —
// light content + violet #6C5CE0 accent, applying the `--spec-*` tokens
// wired in globals.css. The public header is light so the anonymous journey
// uses one coherent shell; the hero remains the deliberate dark accent.
// Structure: light sticky header (logo + known-item search + vendor/sign-in/
// join actions) → a slim always-on category nav bar → a rich dark
// hero carrying a big "describe your need" prompt card (the RFQ path,
// Fiverr-Pro-style) with quick-start chips + an illustrative vendor proof
// card → numbered how-it-works → elevated category tiles → a quiet trust
// bar → THEN the existing discovery sections (featured listings, buying
// tools, FAQs, footer), all
// restyled to match. Footer stays dark too, bookending the light content
// area (a second bridge back toward the app).
//
// Slice 1 (2026-07-22) applies the approved flow blueprint: one light public
// header, a permanent vendor door, vendor pitch immediately after the hero,
// and one six-category browse system. All changed copy is bilingual and
// avoids fee-credit, escrow, or funds-holding promises. Featured products are
// real marketplace data.
//
// Trust-bar wording deviates from the original brief on purpose (Cesar-approved,
// workplace/plans/DECISIONS-2026-07-21.md): no escrow, no "secure payments" —
// NXT//LINK never implies it holds funds. See the ship report for the exact
// copy substitutions.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { IBM_Plex_Sans } from 'next/font/google';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';
import {
  BadgeCheck, ShieldCheck, Send, ClipboardList, Sparkles, Handshake, Forklift,
  HardHat, Warehouse, Bot, Wrench, Truck, MessageSquareText, Building2,
  Check, Menu, X,
} from 'lucide-react';

// One consistent lucide-react icon language throughout this page: same
// stroke weight (lucide's default 2px), a fixed 3-tier size scale — 20px
// inline (next to text: trust bullets, meta rows), 28px category tiles,
// 40px how-it-works — and never mixed with filled icon styles.
const ICON_INLINE = 20;
const ICON_TILE = 28;
const ICON_STEP = 40;

// Body text font per Design System v1.0 (headings use Space Grotesk, already
// loaded app-wide in layout.tsx as --font-space-grotesk). Loaded here,
// scoped to this page only, so the rest of the app is untouched.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-landing',
  display: 'swap',
});

interface Card {
  id: string; kind: 'product' | 'service'; name: string; category: string;
  overview: string | null; image_url: string | null; vendor_name: string;
  vendor_city: string | null; vendor_verified?: boolean;
  pricing: { range?: string } | null; pilot: { available?: boolean } | null;
}
// The 6 curated category tiles (Cesar's spec) mapped to REAL functional-group
// values from the marketplace taxonomy (src/app/api/marketplace/categories) —
// same fg codes used by /marketplace's department filter and SupplyChips, so
// every tile actually filters real listings instead of being a dead link.
// Also reused by the slim category nav bar under the header.
const CATEGORY_TILES: Array<{ fg: string; en: string; es: string; Icon: typeof Forklift }> = [
  { fg: 'material_handling', en: 'Material Handling', es: 'Manejo de materiales', Icon: Forklift },
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
    becomeVendor: 'Become a Vendor',
    postRequest: 'Post a Request',
    eyebrow: 'Borderplex Industrial Marketplace',
    heroTitle: 'Find industrial suppliers. Get competitive quotes. Close deals safely.',
    heroCta1: 'Search Products & Services',
    heroCta2: 'Post a Request / RFQ',
    promptPh: 'I need maintenance for 6 forklifts in El Paso next week.',
    promptAria: 'Describe what you need — post a request',
    promptChip1: 'Forklift repair',
    promptChip2: 'Warehouse racking',
    promptChip3: 'Barcode & scanning',
    promptChip4: 'Conveyor installation',
    promptChip5: 'PPE & safety supplies',
    proofBadge: 'Verified Vendor',
    proofResponds: 'Responds fast',
    howHeading: 'How it works',
    step1Title: 'Describe your need', step1Desc: 'Search the catalog or post one request describing what you need.',
    step2Title: 'Get matched quotes', step2Desc: 'Verified Borderplex vendors respond with price, lead time, and warranty.',
    step3Title: 'Compare and close safely', step3Desc: 'Compare side by side and close the deal through NXT//LINK.',
    catHeading: 'Browse by category',
    browseAllCategories: 'Browse all categories →',
    trustVerified: 'Verified Suppliers',
    trustProtected: 'Protected Introductions (12 months)',
    trustFree: 'Free to send · no commitment',
    featuredHeading: 'Featured on NXT//LINK', seeAll: 'See all →', pilotAvailable: 'Pilot available',
    createFreeAccount: 'Create a free account',
    toolsHeading: 'Everything the buying process needs',
    tool1T: 'Request quotes in one place', tool1D: 'Send one request, reach the vendors you choose. No chasing emails.',
    tool2T: 'Compare vendors side by side', tool2D: 'Price, lead time, installation, warranty, and support — lined up to decide fast.',
    tool3T: 'Pilot before you buy', tool3D: 'Try equipment on your own dock, with real success criteria, before committing.',
    tool4T: 'Track every project', tool4D: 'From quote to install to warranty — one workspace with the next step always clear.',
    tool5T: 'Protected & transparent', tool5D: 'Deals run through NXT//LINK. Your introduction is protected and pricing is clear.',
    tool6T: 'Built for the Borderplex', tool6D: 'Local El Paso & Juárez vendors, cross-border ready, English and Spanish.',
    vendorHeading: 'Showcase your company to Borderplex buyers',
    vendorBody: 'Create your storefront, publish products and services, and manage buyer requests in one place. Joining and quoting are free; NXT//LINK earns only after completed business.',
    vendorBenefit1: 'Free to join',
    vendorBenefit2: '60-second signup, no long form',
    vendorBenefit3: 'Protected introductions for 12 months',
    vendorBenefit4: 'Bilingual storefront in English and Spanish',
    vendorApply: 'Apply for early access',
    eaTitle: 'Apply for early access',
    eaSub: 'Tell us about your company. We onboard vendors one-on-one — no long forms, no cost to join.',
    eaCompany: 'Company name', eaContact: 'Your name', eaEmail: 'Work email', eaPhone: 'Phone (optional)',
    eaCity: 'City (El Paso, Juárez…)', eaNote: 'What do you sell or service? (optional)',
    eaSubmit: 'Request early access', eaSending: 'Sending…',
    eaFootnote: 'Free to join and quote · a success fee applies only after completed business.',
    eaDoneTitle: 'You’re on the list.',
    eaDoneBody: 'Thanks — a member of the NXT//LINK team will reach out personally to set up your storefront. Keep an eye on your inbox.',
    eaDoneBtn: 'Done',
    close: 'Close',
    faqHeading: 'Frequently asked questions',
    faq1q: 'What is NXT//LINK?',
    faq1a: 'NXT//LINK is the industrial marketplace for the El Paso–Juárez Borderplex. Warehouses, 3PLs, distribution centers, and manufacturers use it to find, compare, and request quotes for the equipment, products, technology, and services they need — and to manage the whole project in one place.',
    faq2q: 'Is it free to use?',
    faq2a: 'Yes. Creating an account, browsing, comparing, and requesting quotes is free for buyers. Vendors join and quote for free too — NXT//LINK only earns a success fee after completed business.',
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
    becomeVendor: 'Ser proveedor',
    postRequest: 'Publicar una solicitud',
    eyebrow: 'Mercado industrial del Borderplex',
    heroTitle: 'Encuentra proveedores industriales. Obtén cotizaciones competitivas. Cierra tratos de forma segura.',
    heroCta1: 'Buscar productos y servicios',
    heroCta2: 'Publicar una solicitud (RFQ)',
    promptPh: 'Necesito mantenimiento para 6 montacargas en El Paso la próxima semana.',
    promptAria: 'Describe lo que necesitas — publica una solicitud',
    promptChip1: 'Reparación de montacargas',
    promptChip2: 'Racks de almacén',
    promptChip3: 'Códigos de barras y escaneo',
    promptChip4: 'Instalación de transportadores',
    promptChip5: 'Equipo de seguridad y EPP',
    proofBadge: 'Proveedor verificado',
    proofResponds: 'Responde rápido',
    howHeading: 'Cómo funciona',
    step1Title: 'Describe lo que necesitas', step1Desc: 'Busca en el catálogo o publica una solicitud describiendo lo que necesitas.',
    step2Title: 'Recibe cotizaciones a tu medida', step2Desc: 'Proveedores verificados del Borderplex responden con precio, tiempo de entrega y garantía.',
    step3Title: 'Compara y cierra de forma segura', step3Desc: 'Compara lado a lado y cierra el trato a través de NXT//LINK.',
    catHeading: 'Explorar por categoría',
    browseAllCategories: 'Ver todas las categorías →',
    trustVerified: 'Proveedores verificados',
    trustProtected: 'Introducciones protegidas (12 meses)',
    trustFree: 'Gratis enviar · sin compromiso',
    featuredHeading: 'Destacado en NXT//LINK', seeAll: 'Ver todo →', pilotAvailable: 'Piloto disponible',
    createFreeAccount: 'Crea una cuenta gratis',
    toolsHeading: 'Todo lo que necesita el proceso de compra',
    tool1T: 'Solicita cotizaciones en un solo lugar', tool1D: 'Envía una solicitud y llega a los proveedores que elijas. Sin perseguir correos.',
    tool2T: 'Compara proveedores lado a lado', tool2D: 'Precio, tiempo de entrega, instalación, garantía y soporte — listos para decidir rápido.',
    tool3T: 'Prueba antes de comprar', tool3D: 'Prueba el equipo en tu propio sitio, con criterios de éxito reales, antes de comprometerte.',
    tool4T: 'Da seguimiento a cada proyecto', tool4D: 'De la cotización a la instalación y la garantía — un solo espacio con el siguiente paso siempre claro.',
    tool5T: 'Protegido y transparente', tool5D: 'Los tratos se manejan a través de NXT//LINK. Tu presentación está protegida y el precio es claro.',
    tool6T: 'Hecho para el Borderplex', tool6D: 'Proveedores locales de El Paso y Juárez, listos para cruzar la frontera, en inglés y español.',
    vendorHeading: 'Muestra tu empresa a compradores del Borderplex',
    vendorBody: 'Crea tu escaparate, publica productos y servicios y administra solicitudes de compradores en un solo lugar. Unirte y cotizar es gratis; NXT//LINK solo gana cuando se completa el negocio.',
    vendorBenefit1: 'Gratis para unirte',
    vendorBenefit2: 'Registro en 60 segundos, sin formulario largo',
    vendorBenefit3: 'Introducciones protegidas por 12 meses',
    vendorBenefit4: 'Escaparate bilingüe en inglés y español',
    vendorApply: 'Solicitar acceso anticipado',
    eaTitle: 'Solicitar acceso anticipado',
    eaSub: 'Cuéntanos sobre tu empresa. Incorporamos proveedores uno a uno — sin formularios largos, sin costo por unirte.',
    eaCompany: 'Nombre de la empresa', eaContact: 'Tu nombre', eaEmail: 'Correo de trabajo', eaPhone: 'Teléfono (opcional)',
    eaCity: 'Ciudad (El Paso, Juárez…)', eaNote: '¿Qué vendes o qué servicio ofreces? (opcional)',
    eaSubmit: 'Solicitar acceso anticipado', eaSending: 'Enviando…',
    eaFootnote: 'Gratis para unirte y cotizar · la comisión aplica solo después de completar el negocio.',
    eaDoneTitle: 'Ya estás en la lista.',
    eaDoneBody: 'Gracias — alguien del equipo de NXT//LINK te contactará personalmente para armar tu escaparate. Mantente al pendiente de tu correo.',
    eaDoneBtn: 'Listo',
    close: 'Cerrar',
    faqHeading: 'Preguntas frecuentes',
    faq1q: '¿Qué es NXT//LINK?',
    faq1a: 'NXT//LINK es el marketplace industrial para el Borderplex El Paso–Juárez. Almacenes, 3PLs, centros de distribución y manufactureras lo usan para encontrar, comparar y solicitar cotizaciones del equipo, productos, tecnología y servicios que necesitan — y para manejar todo el proyecto en un solo lugar.',
    faq2q: '¿Es gratis usarlo?',
    faq2a: 'Sí. Crear una cuenta, explorar, comparar y solicitar cotizaciones es gratis para compradores. Los proveedores también se unen y cotizan gratis — NXT//LINK solo gana una comisión de éxito después de completar el negocio.',
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
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    (async () => {
      try {
        const l = await fetch('/api/marketplace/listings?kind=product');
        const lj = await l.json();
        setFeatured((lj.listings || []).slice(0, 8));
      } catch { /* landing still works without live data */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className={`hp ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* One light public header. The hero owns the request/RFQ action; this
          utility bar keeps known-item search and both marketplace doors clear. */}
      <header className="hp-header">
        <div className="hp-headmain">
          <a className="hp-brand" href="/" aria-label="NXT LINK home"><b>NXT<i>{'//'}</i>LINK</b></a>
          <form className={`hp-headsearch ${searchOpen ? 'open' : ''}`} onSubmit={goSearch} role="search">
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
            <LanguageToggle lang={lang} onChange={setLang} variant="light" />
            <a className="hp-vendorbtn" href="/vendor-signup">{t.becomeVendor}</a>
            <a className="hp-signin" href="/login">{t.signIn}</a>
            <a className="hp-joinbtn" href="/signup">{t.join}</a>
          </div>
          <button
            type="button"
            className="hp-searchtoggle"
            aria-label={t.searchAria}
            aria-expanded={searchOpen}
            onClick={() => { setSearchOpen((open) => !open); setMenuOpen(false); }}
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className="hp-menubtn"
            aria-label={menuOpen ? t.close : 'Menu'}
            aria-expanded={menuOpen}
            aria-controls="hp-mobile-menu"
            onClick={() => { setMenuOpen((open) => !open); setSearchOpen(false); }}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
        {menuOpen && (
          <div id="hp-mobile-menu" className="hp-mobilemenu">
            <LanguageToggle lang={lang} onChange={setLang} variant="light" />
            <a className="hp-vendorbtn" href="/vendor-signup">{t.becomeVendor}</a>
            <a className="hp-signin" href="/login">{t.signIn}</a>
            <a className="hp-joinbtn" href="/signup">{t.join}</a>
          </div>
        )}
      </header>

      {/* Slim always-on category nav bar — same real taxonomy as the tile
          grid further down; this strip is the "always there" wayfinding
          row (Fiverr's category-bar pattern), the tile grid stays as the
          bigger visual browse entry point. */}
      <nav className="hp-catbar" aria-label={t.catHeading}>
        <div className="hp-catbarin">
          {CATEGORY_TILES.map(({ fg, en, es }) => (
            <Link key={fg} href={`/marketplace?department=${fg}`} className="hp-catbarlink">
              {lang === 'es' ? es : en}
            </Link>
          ))}
        </div>
      </nav>

      {/* Hero — rich dark band (violet-on-ink). The big "describe your need"
          prompt card is the RFQ path's centerpiece (Fiverr Pro pattern);
          quick-start chips and the trust checkmarks sit under it. The
          illustrative vendor proof card is generic on purpose — no
          fabricated vendor name or stats, just badge + qualitative label. */}
      <section className="hp-hero">
        <div className="hp-herobg" aria-hidden="true" />
        <div className="hp-heroin">
          <div className="hp-herocol">
            <span className="hp-eyebrow">{t.eyebrow}</span>
            <h1>{t.heroTitle}</h1>

            <div className="hp-promptcard">
              <MessageSquareText className="hp-prompticon" size={ICON_INLINE} aria-hidden="true" />
              <span className="hp-promptph">{t.promptPh}</span>
              <Link className="hp-promptbtn" href="/intake" aria-label={t.promptAria}>{t.heroCta2}</Link>
            </div>

            <div className="hp-chips">
              {[t.promptChip1, t.promptChip2, t.promptChip3, t.promptChip4, t.promptChip5].map((c) => (
                <Link key={c} href="/intake" className="hp-chip">{c}</Link>
              ))}
            </div>

            <div className="hp-herochecks">
              <span><BadgeCheck size={ICON_INLINE} aria-hidden="true" /> {t.trustVerified}</span>
              <span><ShieldCheck size={ICON_INLINE} aria-hidden="true" /> {t.trustProtected}</span>
              <span><Send size={ICON_INLINE} aria-hidden="true" /> {t.trustFree}</span>
            </div>

            <div className="hp-herocta">
              <button type="button" className="hp-btn outline" onClick={focusSearch}>{t.heroCta1}</button>
            </div>
          </div>

          <div className="hp-proofcard" aria-hidden="true">
            <div className="hp-proofavatar"><Building2 size={ICON_TILE} aria-hidden="true" /></div>
            <div className="hp-proofmeta">
              <div className="hp-proofbadge"><BadgeCheck size={ICON_INLINE} aria-hidden="true" /> {t.proofBadge}</div>
              <div className="hp-proofline">{t.proofResponds}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Vendor entry is intentionally visible before the buyer education
          sections so suppliers never have to search for their side. */}
      <section className="hp-vendorband" aria-labelledby="vendor-pitch-title">
        <div className="hp-vbin">
          <div className="hp-vbcopy">
            <h2 id="vendor-pitch-title">{t.vendorHeading}</h2>
            <p>{t.vendorBody}</p>
            <div className="hp-vbbenefits">
              {[t.vendorBenefit1, t.vendorBenefit2, t.vendorBenefit3, t.vendorBenefit4].map((benefit) => (
                <span key={benefit}><Check size={16} aria-hidden="true" />{benefit}</span>
              ))}
            </div>
          </div>
          <button className="hp-btn" onClick={() => { setEaOpen(true); setEaDone(false); eaStarted.current = Date.now(); }}>{t.vendorApply}</button>
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
              <div className="hp-steptop">
                <Icon className="hp-stepicon" size={ICON_STEP} aria-hidden="true" />
                <span className="hp-stepn">{n}</span>
              </div>
              <b>{title}</b>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Category tiles — 3x2 grid (swipeable row on mobile), real taxonomy values */}
      <section className="hp-sec">
        <div className="hp-sechead"><h2>{t.catHeading}</h2><a href="/marketplace">{t.browseAllCategories}</a></div>
        <div className="hp-cattiles">
          {CATEGORY_TILES.map(({ fg, en, es, Icon }) => (
            <Link key={fg} href={`/marketplace?department=${fg}`} className="hp-cattile">
              <span className="hp-cattileicon"><Icon size={ICON_TILE} aria-hidden="true" /></span>
              <b>{lang === 'es' ? es : en}</b>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust bar — no escrow / no funds-holding language (see file header note) */}
      <div className="hp-trustbar">
        <span className="hp-trustitem"><BadgeCheck size={ICON_INLINE} aria-hidden="true" /> {t.trustVerified}</span>
        <span className="hp-trustitem"><ShieldCheck size={ICON_INLINE} aria-hidden="true" /> {t.trustProtected}</span>
        <span className="hp-trustitem"><Send size={ICON_INLINE} aria-hidden="true" /> {t.trustFree}</span>
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

      {/* Footer — dark ink, bookending the light content area (second bridge
          back toward the app's dark chrome) */}
      <footer className="hp-foot">
        <div className="hp-footcols">
          <div>
            <b>NXT<i style={{ color: '#A99DF2', fontStyle: 'normal' }}>{'//'}</i>LINK</b>
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

// Design System & App Spec v1.0 (vault/Design-System.md) applied via the
// `--spec-*` CSS variables already wired in globals.css: light content
// (warm white / white cards, violet #6C5CE0 primary, IBM Plex Sans body +
// Space Grotesk headings + IBM Plex Mono for data/eyebrows), with the
// hero, vendor-recruit band, and footer kept as deliberate dark "ink"
// accents. The public header stays light for continuity and legibility.
const CSS = `
.hp{background:var(--spec-warm-white);color:var(--spec-ink);font-family:var(--font-ibm-plex-sans-landing),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;}
.hp *{box-sizing:border-box;}
.hp a{text-decoration:none;color:inherit;}
.hp h1,.hp h2,.hp h3{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;}
.hp-sronly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
.hp a:focus-visible,.hp button:focus-visible,.hp input:focus-visible,.hp textarea:focus-visible{outline:3px solid rgba(108,92,224,.38);outline-offset:3px;}

/* Header — light public shell for the anonymous buyer/vendor journey */
.hp-header{position:sticky;top:0;z-index:40;background:rgba(255,254,251,.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--spec-border);padding:12px 20px;box-shadow:0 6px 24px rgba(20,19,32,.05);}
.hp-headmain{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:18px;max-width:1280px;margin:0 auto;}
.hp-brand{grid-column:1;color:var(--spec-ink);display:inline-flex;align-items:center;min-height:44px;}
.hp-brand b{font-family:var(--font-space-grotesk);font-size:18px;font-weight:700;letter-spacing:-.02em;color:var(--spec-ink);}
.hp-brand i{color:var(--spec-violet);font-style:normal;}
.hp-headsearch{grid-column:2;justify-self:center;display:flex;align-items:center;gap:8px;width:100%;max-width:560px;background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-md);padding:0 6px 0 14px;color:var(--spec-text-2nd);}
.hp-headsearch:focus-within{border-color:var(--spec-violet);box-shadow:0 0 0 3px rgba(108,92,224,.15);}
.hp-headsearch svg{flex-shrink:0;}
.hp-headsearch input{flex:1;min-width:0;background:none;border:none;outline:none;color:var(--spec-ink);font-family:inherit;font-size:14.5px;padding:10px 0;}
.hp-headsearch input:focus-visible{outline:none;}
.hp-headsearch input::placeholder{color:var(--spec-text-2nd);}
.hp-headsearch button{flex-shrink:0;background:var(--spec-violet);color:#fff;font-family:inherit;font-weight:700;font-size:13.5px;border:none;border-radius:var(--spec-radius-btn);padding:9px 16px;cursor:pointer;margin:4px 0;transition:background .15s;}
.hp-headsearch button:hover{background:var(--spec-violet-deep);}
.hp-headactions{grid-column:3;justify-self:end;display:flex;align-items:center;gap:12px;flex-shrink:0;}
.hp-signin{color:var(--spec-text-2nd);font-size:13.5px;font-weight:600;white-space:nowrap;padding:10px 2px;}
.hp-signin:hover{color:var(--spec-ink);}
.hp-joinbtn{color:var(--spec-ink);font-size:13.5px;font-weight:700;padding:9px 14px;border-radius:var(--spec-radius-btn);border:1px solid var(--spec-border);white-space:nowrap;background:#fff;}
.hp-joinbtn:hover{border-color:var(--spec-violet);color:var(--spec-violet-deep);}
.hp-vendorbtn{background:var(--spec-violet);color:#fff !important;font-size:13.5px;font-weight:700;padding:10px 15px;border-radius:var(--spec-radius-btn);white-space:nowrap;transition:background .15s;}
.hp-vendorbtn:hover{background:var(--spec-violet-deep);}
.hp-searchtoggle{display:none;width:44px;height:44px;align-items:center;justify-content:center;color:var(--spec-ink);background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-btn);cursor:pointer;}
.hp-menubtn{display:none;width:44px;height:44px;align-items:center;justify-content:center;color:var(--spec-ink);background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-btn);cursor:pointer;}
.hp-mobilemenu{display:none;}
@media(max-width:980px){
  .hp-headmain{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"brand menu" "search search";row-gap:10px;}
  .hp-brand{grid-area:brand;grid-column:auto;min-width:0;}
  .hp-headactions{display:none;}
  .hp-headsearch{grid-area:search;grid-column:auto;max-width:none;min-width:0;}
  .hp-menubtn{grid-area:menu;display:flex;}
  .hp-mobilemenu{max-width:1280px;margin:10px auto 0;padding:12px;display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:10px;background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-md);box-shadow:0 18px 36px rgba(20,19,32,.1);}
}
@media(max-width:620px){
  .hp-header{padding:10px 14px;}
  .hp-headmain{grid-template-columns:minmax(0,1fr) auto auto;grid-template-areas:"brand searchToggle menu";}
  .hp-headsearch{display:none;}
  .hp-headsearch.open{display:flex;grid-column:1/-1;grid-row:2;}
  .hp-searchtoggle{grid-area:searchToggle;display:flex;}
  .hp-mobilemenu{grid-template-columns:1fr 1fr;}
  .hp-mobilemenu .nxlt{grid-column:1/-1;width:max-content;}
  .hp-mobilemenu .hp-vendorbtn{grid-column:1/-1;text-align:center;padding:12px;}
  .hp-mobilemenu .hp-signin,.hp-mobilemenu .hp-joinbtn{text-align:center;}
}

/* Slim always-on category nav bar — sits directly under the header */
.hp-catbar{background:#fff;border-bottom:1px solid var(--spec-border);}
.hp-catbarin{max-width:1160px;margin:0 auto;padding:0 22px;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;}
.hp-catbarin::-webkit-scrollbar{display:none;}
.hp-catbarlink{flex-shrink:0;padding:13px 14px;font-size:13.5px;font-weight:600;color:var(--spec-text-2nd);white-space:nowrap;border-bottom:2px solid transparent;}
.hp-catbarlink:hover{color:var(--spec-violet);border-bottom-color:var(--spec-violet);}

/* Hero — rich dark band, two-column: prompt card + chips + checks left, illustrative proof card right */
.hp-hero{position:relative;overflow:hidden;background:var(--spec-ink);}
.hp-herobg{position:absolute;inset:0;background:
  repeating-linear-gradient(118deg,transparent 0 26px,rgba(169,157,242,.07) 26px 29px),
  linear-gradient(rgba(169,157,242,.05) 1px,transparent 1px),
  linear-gradient(90deg,rgba(169,157,242,.05) 1px,transparent 1px),
  radial-gradient(760px 440px at 88% -12%,rgba(108,92,224,.38),transparent 60%);
  background-size:auto,64px 64px,64px 64px,auto;
  mask-image:linear-gradient(180deg,rgba(0,0,0,.9),rgba(0,0,0,.5));
  pointer-events:none;}
.hp-heroin{position:relative;max-width:1200px;margin:0 auto;padding:56px 22px 60px;display:grid;grid-template-columns:1.35fr 1fr;gap:40px;align-items:center;}
.hp-herocol{min-width:0;}
.hp-eyebrow{font-family:var(--font-ibm-plex-mono);font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--spec-lilac);}
.hp-hero h1{color:#F8F7FB;font-size:clamp(30px,4.6vw,52px);font-weight:700;letter-spacing:-.03em;line-height:1.08;margin:16px 0 28px;max-width:20ch;text-wrap:balance;}

.hp-promptcard{display:flex;align-items:center;gap:12px;background:#fff;border-radius:var(--spec-radius-lg);padding:8px 8px 8px 20px;box-shadow:0 24px 48px -20px rgba(0,0,0,.5);max-width:620px;}
.hp-prompticon{color:var(--spec-violet);flex-shrink:0;}
.hp-promptph{flex:1;min-width:0;color:var(--spec-text-2nd);font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.hp-promptbtn{flex-shrink:0;background:var(--spec-violet);color:#fff !important;font-weight:700;font-size:13.5px;padding:14px 20px;border-radius:var(--spec-radius-btn);white-space:nowrap;transition:background .15s;}
.hp-promptbtn:hover{background:var(--spec-violet-deep);}

.hp-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;max-width:620px;}
.hp-chip{padding:8px 14px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:999px;font-size:12.5px;font-weight:600;color:#fff !important;transition:background .15s,border-color .15s;}
.hp-chip:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.52);}

.hp-herochecks{display:flex;flex-wrap:wrap;gap:18px;margin-top:20px;}
.hp-herochecks span{display:flex;align-items:center;gap:7px;color:#B7B4C6;font-size:12.5px;font-weight:600;}
.hp-herochecks svg{color:var(--spec-success);flex-shrink:0;}

.hp-herocta{display:flex;gap:12px;margin-top:26px;}
.hp-btn{font-family:inherit;background:var(--spec-violet);color:#fff;font-weight:700;font-size:15px;padding:14px 26px;border-radius:var(--spec-radius-btn);border:none;cursor:pointer;transition:background .15s;}
.hp-btn:hover{background:var(--spec-violet-deep);}
.hp-btn.outline{background:transparent;color:#F8F7FB;border:1.5px solid rgba(255,255,255,.34);}
.hp-btn.outline:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.5);}

.hp-proofcard{justify-self:end;background:#fff;border-radius:var(--spec-radius-lg);padding:22px;width:220px;box-shadow:0 30px 60px -22px rgba(0,0,0,.55);transform:rotate(-1.4deg);}
.hp-proofavatar{width:48px;height:48px;border-radius:var(--spec-radius-md);background:var(--spec-ink);color:var(--spec-lilac);display:grid;place-items:center;margin-bottom:14px;}
.hp-proofbadge{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:var(--spec-violet-deep);background:#F3F1FB;padding:7px 11px;border-radius:8px;width:max-content;}
.hp-proofbadge svg{color:var(--spec-violet);}
.hp-proofline{margin-top:10px;font-size:12.5px;color:var(--spec-text-2nd);font-weight:600;}

@media(max-width:900px){
  .hp-heroin{grid-template-columns:1fr;padding:40px 20px 44px;}
  .hp-proofcard{justify-self:start;transform:none;width:max-content;max-width:100%;margin-top:8px;display:flex;align-items:center;gap:14px;padding:16px 18px;}
  .hp-proofavatar{margin-bottom:0;flex-shrink:0;}
}
@media(max-width:520px){
  .hp-promptcard{flex-wrap:wrap;padding:16px;}
  .hp-promptph{width:100%;order:1;white-space:normal;}
  .hp-prompticon{order:0;}
  .hp-promptbtn{order:2;width:100%;text-align:center;}
}

/* How it works */
.hp-how{max-width:1160px;margin:0 auto;padding:56px 22px 8px;}
.hp-howheading{font-size:clamp(20px,2.6vw,26px);font-weight:700;letter-spacing:-.02em;text-align:center;margin:0 0 28px;color:var(--spec-ink);}
.hp-howgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
@media(max-width:720px){.hp-howgrid{grid-template-columns:1fr;}}
.hp-step{background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-lg);padding:28px;}
.hp-steptop{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;}
.hp-stepicon{color:var(--spec-violet);flex-shrink:0;}
.hp-stepn{flex-shrink:0;color:var(--spec-violet-deep);font-family:var(--font-ibm-plex-mono);font-weight:600;font-size:13px;}
.hp-step b{font-size:16px;font-weight:700;display:block;color:var(--spec-ink);}
.hp-step p{color:var(--spec-text-2nd);font-size:13.5px;line-height:1.6;margin:6px 0 0;}

/* Category tiles */
.hp-sec{max-width:1160px;margin:0 auto;padding:56px 22px 0;}
.hp-sechead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:22px;}
.hp-sechead h2{font-size:clamp(20px,2.6vw,27px);font-weight:700;letter-spacing:-.02em;color:var(--spec-ink);}
.hp-sechead a{color:var(--spec-violet);font-size:13.5px;font-weight:600;}
.hp-sechead a:hover{color:var(--spec-violet-deep);}
.hp-cattiles{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.hp-cattile{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-lg);padding:20px 18px;color:var(--spec-ink);transition:border-color .15s,transform .15s,box-shadow .15s;}
.hp-cattile:hover{border-color:var(--spec-violet);transform:translateY(-3px);box-shadow:0 16px 32px -18px rgba(20,19,32,.25);}
.hp-cattile b{font-size:14.5px;font-weight:700;line-height:1.3;}
.hp-cattileicon{flex-shrink:0;width:52px;height:52px;border-radius:var(--spec-radius-md);background:var(--spec-surface);color:var(--spec-violet);display:grid;place-items:center;}
@media(max-width:720px){
  .hp-cattiles{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:74%;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px;-webkit-overflow-scrolling:touch;}
  .hp-cattile{scroll-snap-align:start;}
}

/* Trust bar — quiet confidence */
.hp-trustbar{display:flex;justify-content:center;gap:30px;flex-wrap:wrap;max-width:1000px;margin:44px auto 0;padding:0 22px;}
.hp-trustitem{display:flex;align-items:center;gap:8px;color:var(--spec-text-2nd);font-size:13px;font-weight:600;}
.hp-trustitem svg{color:var(--spec-success);flex-shrink:0;}

/* Featured listings */
.hp-prods{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px;}
.hp-prod{background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-lg);overflow:hidden;display:flex;flex-direction:column;transition:border-color .15s,transform .15s,box-shadow .15s;color:var(--spec-ink);}
.hp-prodskel{height:236px;background:linear-gradient(100deg,#EFEDF5 30%,#E4E1EF 50%,#EFEDF5 70%);background-size:200% 100%;animation:hpshimmer 1.3s ease-in-out infinite;}
@keyframes hpshimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
@media (prefers-reduced-motion:reduce){.hp-prodskel{animation:none;}}
.hp-prod:hover{border-color:var(--spec-violet);transform:translateY(-3px);box-shadow:0 18px 34px -20px rgba(20,19,32,.28);}
.hp-prodimg{height:172px;background:var(--spec-surface);overflow:hidden;}
.hp-prodimg img{width:100%;height:100%;object-fit:cover;transition:transform .3s ease;}
.hp-prod:hover .hp-prodimg img{transform:scale(1.05);}
.hp-noimg{height:100%;display:grid;place-items:center;color:#B7B2C9;font-size:12px;letter-spacing:.2em;font-weight:700;}
.hp-prodbody{padding:14px 15px 16px;display:flex;flex-direction:column;gap:5px;flex:1;}
/* One accent element per card max (price, violet) — the pilot badge stays a
   quiet, muted meta chip so it never competes with the price for attention. */
.hp-badge{align-self:flex-start;display:flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--spec-text-2nd);background:none;border:1px solid var(--spec-border);padding:3px 8px;border-radius:999px;}
.hp-prodname{font-size:14px;font-weight:700;line-height:1.3;color:var(--spec-ink);}
.hp-price{font-family:var(--font-ibm-plex-mono);font-size:15px;font-weight:600;color:var(--spec-violet-deep);font-variant-numeric:tabular-nums;}
.hp-vend{font-size:11.5px;color:var(--spec-text-2nd);margin-top:auto;}
.hp-bigcta{display:block;width:max-content;margin:28px auto 0;background:var(--spec-violet);color:#fff !important;font-weight:700;font-size:14.5px;padding:14px 30px;border-radius:var(--spec-radius-btn);transition:background .15s;}
.hp-bigcta:hover{background:var(--spec-violet-deep);}

/* Buying tools */
.hp-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;}
.hp-tool{background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-lg);padding:24px;}
.hp-tooldot{width:36px;height:36px;border-radius:var(--spec-radius-md);background:linear-gradient(135deg,var(--spec-violet),var(--spec-lilac));margin-bottom:14px;}
.hp-tool b{font-size:15.5px;font-weight:700;color:var(--spec-ink);}
.hp-tool p{color:var(--spec-text-2nd);font-size:13.5px;line-height:1.6;margin:8px 0 0;}

/* Vendor early-access band — dark accent card inside the light page */
.hp-vendorband{max-width:1160px;margin:32px auto 0;padding:0 22px;}
.hp-vbin{background:var(--spec-ink);border-radius:var(--spec-radius-lg);padding:34px 36px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:32px;position:relative;overflow:hidden;}
.hp-vbin::before{content:'';position:absolute;inset:0;background:
  repeating-linear-gradient(118deg,transparent 0 26px,rgba(169,157,242,.08) 26px 29px),
  linear-gradient(rgba(169,157,242,.06) 1px,transparent 1px),
  linear-gradient(90deg,rgba(169,157,242,.06) 1px,transparent 1px);
  background-size:auto,64px 64px,64px 64px;
  mask-image:linear-gradient(180deg,rgba(0,0,0,.8),rgba(0,0,0,.3));}
.hp-vbin>*{position:relative;}
.hp-vbcopy{min-width:0;}
.hp-vbin h2{font-family:var(--font-space-grotesk);color:#F8F7FB;font-size:23px;font-weight:700;letter-spacing:-.02em;}
.hp-vbin p{color:#D9D6E5;font-size:14.5px;line-height:1.6;margin:10px 0 0;max-width:68ch;}
.hp-vbbenefits{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 18px;margin-top:18px;}
.hp-vbbenefits span{display:flex;align-items:center;gap:8px;color:#F8F7FB;font-size:12.5px;font-weight:600;}
.hp-vbbenefits svg{color:#78D7A6;flex-shrink:0;}
.hp-vbin>.hp-btn{white-space:nowrap;min-height:46px;}
@media(max-width:760px){
  .hp-vbin{grid-template-columns:1fr;padding:28px 24px;gap:24px;}
  .hp-vbin>.hp-btn{width:100%;}
}
@media(max-width:520px){.hp-vbbenefits{grid-template-columns:1fr;}}

/* FAQ */
.hp-faqs{display:flex;flex-direction:column;gap:12px;max-width:820px;}
.hp-faq{background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-md);overflow:hidden;}
.hp-faq.open{border-color:var(--spec-violet);}
.hp-faqq{width:100%;display:flex;justify-content:space-between;align-items:center;gap:14px;font-family:inherit;font-size:15px;font-weight:700;color:var(--spec-ink);background:none;border:none;padding:18px 20px;cursor:pointer;text-align:left;}
.hp-faqq:focus-visible{outline:2px solid var(--spec-violet);outline-offset:-2px;}
.hp-faqi{color:var(--spec-violet);font-size:20px;font-weight:400;flex-shrink:0;}
.hp-faqa{padding:0 20px 18px;color:var(--spec-text-2nd);font-size:14px;line-height:1.65;}

/* Footer — dark ink, bookends the light content area */
.hp-foot{margin-top:64px;border-top:1px solid rgba(255,255,255,.08);background:var(--spec-ink);padding-bottom:0;}
.hp-footcols{max-width:1160px;margin:0 auto;padding:48px 22px 32px;display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:28px;}
@media(max-width:720px){.hp-footcols{grid-template-columns:1fr 1fr;}}
.hp-footcols>div>b{font-family:var(--font-space-grotesk);font-size:17px;font-weight:700;color:#F8F7FB;}
.hp-foottag{color:#9B98AC;font-size:13px;line-height:1.6;margin:10px 0 0;max-width:34ch;}
.hp-footcols h4{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8B889C;margin:0 0 12px;}
.hp-footcols a{display:block;color:#C9C6D6;font-size:13.5px;margin-bottom:9px;}
.hp-footcols a:hover{color:var(--spec-lilac);}
.hp-footbottom{border-top:1px solid rgba(255,255,255,.06);padding:18px 22px;text-align:center;color:#75718A;font-size:12.5px;}

/* Early-access modal */
.hp-modal{position:fixed;inset:0;background:rgba(20,19,32,.55);display:grid;place-items:center;z-index:60;padding:20px;}
.hp-modalin{position:relative;background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-lg);max-width:460px;width:100%;padding:28px;box-shadow:0 30px 60px -20px rgba(20,19,32,.4);}
.hp-modalx{position:absolute;top:14px;right:16px;background:none;border:none;color:var(--spec-text-2nd);font-size:24px;line-height:1;cursor:pointer;}
.hp-modalin h3{font-family:var(--font-space-grotesk);font-size:20px;font-weight:700;letter-spacing:-.02em;margin:0;color:var(--spec-ink);}
.hp-easub{color:var(--spec-text-2nd);font-size:13.5px;line-height:1.5;margin:8px 0 16px;}
.hp-earow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
@media(max-width:440px){.hp-earow{grid-template-columns:1fr;}}
.hp-modalin input,.hp-modalin textarea{width:100%;font-family:inherit;font-size:14px;padding:12px 13px;border-radius:var(--spec-radius-md);border:1px solid var(--spec-border);background:var(--spec-warm-white);color:var(--spec-ink);outline:none;margin-bottom:10px;resize:vertical;}
.hp-modalin input::placeholder,.hp-modalin textarea::placeholder{color:#9E9BAF;}
.hp-modalin input:focus,.hp-modalin textarea:focus{border-color:var(--spec-violet);box-shadow:0 0 0 3px rgba(108,92,224,.15);}
.hp-eanote{font-size:11.5px;color:#8B889C;text-align:center;margin:12px 0 0;line-height:1.5;}
.hp-eadone{text-align:center;padding:8px 0;}
.hp-eabig{width:52px;height:52px;border-radius:50%;background:#EDF7F1;color:var(--spec-success);display:grid;place-items:center;font-size:26px;margin:0 auto 14px;}
.hp-eadone h3{font-size:20px;}
.hp-eadone p{color:var(--spec-text-2nd);font-size:14px;line-height:1.6;margin:10px 0 18px;}

/* Mobile sticky primary CTA */
.hp-mobilecta{display:none;}
@media(max-width:760px){
  .hp{padding-bottom:78px;}
  .hp-mobilecta{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:45;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);backdrop-filter:blur(16px);border-top:1px solid var(--spec-border);}
  .hp-mobilectabtn{display:block;width:100%;text-align:center;background:var(--spec-violet);color:#fff !important;font-weight:700;font-size:15px;padding:13px;border-radius:var(--spec-radius-md);}
}
`;
