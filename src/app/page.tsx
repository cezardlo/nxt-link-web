'use client';

// NXT//LINK homepage — task-oriented action engine (Cesar's spec, distilled
// from Amazon Business / Fiverr Pro / Alibaba / Thomasnet / Upwork).
//
// 2026-07-22 REBUILD ("match Codex's look"): Cesar reviewed a further-along
// Codex build at localhost:3014 and asked to match it. That preview is
// served by src/components/landing/LandingExperience.tsx in a separate local
// reference checkout (Codex sandbox, read-only reference — never a git
// dependency of this repo). This file reproduces that design's copy, layout,
// and Design System v1.0 styling, but keeps 100% of THIS branch's working
// infrastructure: PublicHeader (EN/ES, search, vendor entry, Saved-for-Quote
// cart count), the real marketplace listings API, and every existing route
// (search -> /marketplace?q=, RFQ -> /intake, category tiles ->
// /marketplace?department=, vendor -> /vendor-signup).
//
// Cesar follow-up (same pass, after seeing this draft): "organize the browse
// zone like Alibaba's Manufacturers page" — a grid of distinct entry-point
// CARDS below the hero (category / featured suppliers / explore listings /
// post-a-request), plus a real-attribute filter-chip row. Added as the
// `hp-browse` grid and `hp-chiprow` below. NO invented stats anywhere (no
// vendor counts, no response-time claims, no industry counts) — NXT//LINK's
// real numbers are small; showing a real small count is fine, inventing one
// is not. See workplace/plans (Alibaba-pass notes) for the full mapping.
//
// Removed vs. the previous pass: the "Apply for early access" modal — the
// vendor door now goes straight to /vendor-signup (the task's own explicit
// routing instruction, and what Codex's build does too), so there's one
// vendor entry system, not two.
//
// NO fee/credit numbers or escrow/holds-funds language anywhere on this page
// (hard constraint) — the FAQ's "success fee" line intentionally carries no
// number; the actual commission math lives on /terms only.
//
// 2026-07-22 dead-end/empty-state fixes (Cesar + two audits): the
// "Featured suppliers" card above was REMOVED (Cesar's explicit request) —
// the browse grid was 3 cards, not 4. Category tiles only render when
// they actually have published listings (computed live from this page's own
// listings fetch). Buying-tools cards got real icons. The literal 'Vendor'
// placeholder (API fallback when a vendor can't be resolved) is never shown.
//
// 2026-07-22 homepage cleanup (Cesar, same day, reviewing the live page):
// the listing-thumbnail cards weren't rendering right and there isn't
// enough real inventory yet to make either showcase look intentional, so
// TWO MORE sections were removed: the "Explore listings" browse card (was
// the middle of 3 cards in .hp-browsegrid — now 2 cards, category + RFQ)
// and the entire "Featured on NXT//LINK" listings section. Its "Create a
// free account" CTA was pulled out into its own standalone centered section
// so account creation stays one obvious click from the homepage. The
// `pickWithImageBias` / `iconForCard` helpers and the `sample` /
// `featuredDisplay` picks they fed were removed with them — the `featured`
// fetch, `loading`, and `categoryCounts` / `visibleCategoryTiles` stay,
// since "Browse by category" still depends on them.
//
// 2026-07-23 category-browse promotion (Cesar, founder-approved): "Browse by
// category" was cramped as one card sharing a 2-col grid with the RFQ card —
// promoted to its own full-width section (icon grid: 3 cols desktop / 2
// tablet / 1-2 auto-fit on small phones), Amazon Business / Grainger style.
// The old `.hp-browsegrid` 2-card wrapper is gone; the RFQ "one request,
// multiple quotes" card is now its own standalone centered CTA band right
// after, so it doesn't read as an orphaned lonely card. Same
// CATEGORY_TILES data, visibleCategoryTiles empty-hiding, icons, and
// /marketplace?department= routing as before — only the layout changed.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { IBM_Plex_Sans } from 'next/font/google';
import { useLang, type Lang } from '@/components/LanguageToggle';
import PublicHeader from '@/components/PublicHeader';
import {
  ArrowRight, BadgeCheck, ShieldCheck, Send, Search, ChevronRight, Check,
  MessageSquareText, PackageSearch, Forklift, HardHat, Warehouse, Bot, Wrench,
  Truck, Handshake, ClipboardList, MapPin, Zap, Clock,
  Columns3, FlaskConical, Route,
} from 'lucide-react';

const ICON_INLINE = 20;
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
  functional_group?: string | null;
  overview: string | null; image_url: string | null;
  vendor_id: string; vendor_name: string; vendor_city: string | null; vendor_verified?: boolean;
  pricing: { range?: string } | null; pilot: { available?: boolean } | null;
}

// The 6 curated category tiles (Cesar's spec) mapped to REAL functional-group
// values from the marketplace taxonomy (src/app/api/marketplace/categories) —
// same fg codes used by /marketplace's department filter, so every row here
// actually filters real listings instead of being a dead link.
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
    eyebrow: 'Borderplex Industrial Marketplace',
    heroTitle: 'Find industrial solutions. Move purchasing forward.',
    heroBody: 'Search products, services, technology, and vendors. Compare options and keep every next step in one project.',
    searchLabel: 'Search products, services, vendors, or part numbers',
    searchPlaceholder: 'Forklift repair, warehouse racking, barcode scanners…',
    search: 'Search',
    popular: 'Popular',
    quick1: 'Forklift repair', quick2: 'Warehouse racking', quick3: 'Barcode scanners', quick4: 'Pilot-ready solutions',
    customEyebrow: 'Custom or complex purchase',
    customTitle: 'Tell vendors exactly what you need.',
    customBody: 'Add specifications, quantity, timing, and files. You choose who receives it.',
    customPoint1: 'Quotes, demos, and pilots',
    customPoint2: 'Messages and documents stay together',
    postRequest: 'Post a sourcing request',
    requestNote: 'Use this when a simple search is not enough.',
    trustVerified: 'Verified Vendors',
    trustProtected: 'Protected Introductions (12 months)',
    trustFree: 'Free to send · no commitment',
    browseHeading: 'Start sourcing',
    browseSub: 'Three ways in — pick the one that fits what you need right now.',
    catCardTitle: 'Browse by category',
    catCardAction: 'Browse all categories',
    catEmpty: 'New categories are being added — check the full marketplace.',
    rfqCardTitle: 'One request, multiple quotes',
    rfqCardBody: 'Describe what you need once. The vendors you choose respond with quotes, demos, or pilots — no chasing emails.',
    filtersLabel: 'Quick filters',
    chipVerified: 'Verified vendor', chipLocal: 'Local support', chipFast: 'Fast response', chipEmergency: '24/7 emergency', chipCases: 'Has case studies',
    startEyebrow: 'Start sourcing',
    startTitle: 'What are you looking for?',
    startBody: 'Choose a path and go straight to relevant marketplace results.',
    productKicker: 'Products & equipment', productTitle: 'Buy or request pricing',
    productBody: 'Equipment, parts, safety supplies, warehouse systems, and more.', productAction: 'Browse products',
    serviceKicker: 'Industrial services', serviceTitle: 'Find a specialist',
    serviceBody: 'Repair, installation, maintenance, logistics, and technical support.', serviceAction: 'Browse services',
    techKicker: 'Technology', techTitle: 'Evaluate a solution',
    techBody: 'Automation, robotics, scanning, software, demos, and pilots.', techAction: 'Explore technology',
    createFreeAccount: 'Create a free account',
    toolsHeading: 'Everything the buying process needs',
    tool1T: 'Request quotes in one place', tool1D: 'Send one request, reach the vendors you choose. No chasing emails.',
    tool2T: 'Compare vendors side by side', tool2D: 'Price, lead time, installation, warranty, and support — lined up to decide fast.',
    tool3T: 'Pilot before you buy', tool3D: 'Try equipment on your own dock, with real success criteria, before committing.',
    tool4T: 'Track every project', tool4D: 'From quote to install to warranty — one workspace with the next step always clear.',
    tool5T: 'Protected & transparent', tool5D: 'Deals run through NXT//LINK. Your introduction is protected and pricing is clear.',
    tool6T: 'Built for the Borderplex', tool6D: 'Local El Paso & Juárez vendors, cross-border ready, English and Spanish.',
    vendorEyebrow: 'Sell on NXT//LINK',
    vendorHeading: 'Put your company in front of Borderplex buyers.',
    vendorBody: 'Create a standardized storefront, publish products and services, and manage buyer requests from one vendor workspace.',
    vendorPoint1: 'Free to join and publish',
    vendorPoint2: '60-second signup, no long form',
    vendorPoint3: 'Protected introductions for 12 months',
    vendorPoint4: 'Bilingual storefront in English and Spanish',
    vendorApply: 'Create a vendor account',
    howHeading: 'How it works',
    stepLabel: 'Step',
    step1Title: 'Find technology', step1Desc: 'Search or browse real listings from Borderplex vendors.',
    step2Title: 'Request information', step2Desc: 'Send a request — free, no commitment.',
    step3Title: 'Get connected', step3Desc: 'NXT//LINK introduces you to the right supplier.',
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
    forBuyers: 'For buyers', browseMarketplace: 'Browse marketplace', createAccount: 'Create account', myProjects: 'My projects', signIn: 'Sign in',
    forVendors: 'For vendors', listYourCompany: 'List your company', vendorSignIn: 'Vendor sign in', sellerCentral: 'Seller Central',
    company: 'Company', terms: 'Terms', privacy: 'Privacy',
    copyright: '© 2026 NXT//LINK · El Paso, Texas · Serving the Borderplex',
  },
  es: {
    docTitle: 'NXT//LINK — Mercado Industrial del Borderplex',
    eyebrow: 'Mercado industrial del Borderplex',
    heroTitle: 'Encuentra soluciones industriales. Avanza la compra.',
    heroBody: 'Busca productos, servicios, tecnología y proveedores. Compara opciones y mantén cada paso en un proyecto.',
    searchLabel: 'Buscar productos, servicios, proveedores o números de parte',
    searchPlaceholder: 'Reparación de montacargas, racks de almacén, escáneres…',
    search: 'Buscar',
    popular: 'Popular',
    quick1: 'Reparación de montacargas', quick2: 'Racks de almacén', quick3: 'Escáneres de códigos', quick4: 'Soluciones con piloto',
    customEyebrow: 'Compra personalizada o compleja',
    customTitle: 'Diles a los proveedores exactamente qué necesitas.',
    customBody: 'Agrega especificaciones, cantidad, tiempo y archivos. Tú eliges quién la recibe.',
    customPoint1: 'Cotizaciones, demos y pilotos',
    customPoint2: 'Mensajes y documentos juntos',
    postRequest: 'Publicar solicitud de compra',
    requestNote: 'Úsala cuando una búsqueda simple no sea suficiente.',
    trustVerified: 'Proveedores verificados',
    trustProtected: 'Introducciones protegidas (12 meses)',
    trustFree: 'Gratis enviar · sin compromiso',
    browseHeading: 'Empieza a buscar',
    browseSub: 'Tres formas de empezar — elige la que se ajuste a lo que necesitas ahora.',
    catCardTitle: 'Explorar por categoría',
    catCardAction: 'Ver todas las categorías',
    catEmpty: 'Se están agregando nuevas categorías — revisa el marketplace completo.',
    rfqCardTitle: 'Una solicitud, varias cotizaciones',
    rfqCardBody: 'Describe lo que necesitas una vez. Los proveedores que elijas responden con cotizaciones, demos o pilotos — sin perseguir correos.',
    filtersLabel: 'Filtros rápidos',
    chipVerified: 'Proveedor verificado', chipLocal: 'Soporte local', chipFast: 'Respuesta rápida', chipEmergency: 'Emergencia 24/7', chipCases: 'Con casos de éxito',
    startEyebrow: 'Empieza a buscar',
    startTitle: '¿Qué estás buscando?',
    startBody: 'Elige una ruta y ve directamente a resultados relevantes del marketplace.',
    productKicker: 'Productos y equipo', productTitle: 'Compra o solicita precios',
    productBody: 'Equipo, refacciones, seguridad, sistemas de almacén y más.', productAction: 'Explorar productos',
    serviceKicker: 'Servicios industriales', serviceTitle: 'Encuentra un especialista',
    serviceBody: 'Reparación, instalación, mantenimiento, logística y soporte técnico.', serviceAction: 'Explorar servicios',
    techKicker: 'Tecnología', techTitle: 'Evalúa una solución',
    techBody: 'Automatización, robótica, escaneo, software, demos y pilotos.', techAction: 'Explorar tecnología',
    createFreeAccount: 'Crea una cuenta gratis',
    toolsHeading: 'Todo lo que necesita el proceso de compra',
    tool1T: 'Solicita cotizaciones en un solo lugar', tool1D: 'Envía una solicitud y llega a los proveedores que elijas. Sin perseguir correos.',
    tool2T: 'Compara proveedores lado a lado', tool2D: 'Precio, tiempo de entrega, instalación, garantía y soporte — listos para decidir rápido.',
    tool3T: 'Prueba antes de comprar', tool3D: 'Prueba el equipo en tu propio sitio, con criterios de éxito reales, antes de comprometerte.',
    tool4T: 'Da seguimiento a cada proyecto', tool4D: 'De la cotización a la instalación y la garantía — un solo espacio con el siguiente paso siempre claro.',
    tool5T: 'Protegido y transparente', tool5D: 'Los tratos se manejan a través de NXT//LINK. Tu presentación está protegida y el precio es claro.',
    tool6T: 'Hecho para el Borderplex', tool6D: 'Proveedores locales de El Paso y Juárez, listos para cruzar la frontera, en inglés y español.',
    vendorEyebrow: 'Vende en NXT//LINK',
    vendorHeading: 'Presenta tu empresa a compradores del Borderplex.',
    vendorBody: 'Crea un escaparate estandarizado, publica productos y servicios y administra solicitudes de compradores desde un solo espacio de proveedor.',
    vendorPoint1: 'Gratis para unirte y publicar',
    vendorPoint2: 'Registro en 60 segundos, sin formulario largo',
    vendorPoint3: 'Introducciones protegidas por 12 meses',
    vendorPoint4: 'Escaparate bilingüe en inglés y español',
    vendorApply: 'Crear cuenta de proveedor',
    howHeading: 'Cómo funciona',
    stepLabel: 'Paso',
    step1Title: 'Encuentra tecnología', step1Desc: 'Busca o explora publicaciones reales de proveedores del Borderplex.',
    step2Title: 'Solicita información', step2Desc: 'Envía una solicitud — gratis, sin compromiso.',
    step3Title: 'Conéctate', step3Desc: 'NXT//LINK te presenta con el proveedor indicado.',
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
    forBuyers: 'Para compradores', browseMarketplace: 'Explorar marketplace', createAccount: 'Crear cuenta', myProjects: 'Mis proyectos', signIn: 'Iniciar sesión',
    forVendors: 'Para proveedores', listYourCompany: 'Publica tu empresa', vendorSignIn: 'Acceso de proveedores', sellerCentral: 'Centro de vendedores',
    company: 'Compañía', terms: 'Términos', privacy: 'Privacidad',
    copyright: '© 2026 NXT//LINK · El Paso, Texas · Sirviendo al Borderplex',
  },
};

export default function Home() {
  const [lang, setLang] = useLang(); // stored `nxt_lang` — shared across marketplace pages
  const t = T[lang];
  const [featured, setFeatured] = useState<Card[]>([]);
  // Whether we actually received live listing data. The marketplace is now
  // login-walled, so an anonymous homepage visitor's listings fetch returns 401
  // — in that case counts are UNKNOWN and we must show the full curated
  // category tiles rather than filtering them all away (see visibleCategoryTiles).
  const [countsKnown, setCountsKnown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const value = query.trim();
    window.location.href = value ? `/marketplace?q=${encodeURIComponent(value)}` : '/marketplace';
  }

  useEffect(() => { document.title = t.docTitle; }, [t.docTitle]);

  useEffect(() => {
    (async () => {
      try {
        const l = await fetch('/api/marketplace/listings?kind=all');
        // 401 = the login wall (anonymous visitor). The homepage itself stays
        // public; we just leave counts unknown so the curated category tiles
        // still render. Only a real 200 gives us live per-category counts.
        if (l.ok) {
          const lj = await l.json();
          // Keep the FULL response (not just the first few) — the category
          // tile counts below and the image-biased picks need to see
          // everything that came back, not a pre-sliced subset.
          setFeatured(lj.listings || []);
          setCountsKnown(true);
        }
      } catch { /* landing still works without live data */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Category tiles: only show ones that actually have published listings
  // right now (dead-end fix) — counted straight from this same fetch, so as
  // real inventory grows/shrinks a tile appears/disappears automatically.
  // While the fetch is still in flight we don't yet know real counts, so we
  // show the full curated list rather than flashing an empty card.
  const categoryCounts = new Map<string, number>();
  for (const c of featured) {
    if (!c.functional_group) continue;
    categoryCounts.set(c.functional_group, (categoryCounts.get(c.functional_group) || 0) + 1);
  }
  const visibleCategoryTiles = (loading || !countsKnown) ? CATEGORY_TILES : CATEGORY_TILES.filter((tile) => (categoryCounts.get(tile.fg) || 0) > 0);

  const sourceModes = [
    { kicker: t.productKicker, title: t.productTitle, body: t.productBody, action: t.productAction, href: '/marketplace?tab=product', Icon: PackageSearch },
    { kicker: t.serviceKicker, title: t.serviceTitle, body: t.serviceBody, action: t.serviceAction, href: '/marketplace?tab=service', Icon: Wrench },
    { kicker: t.techKicker, title: t.techTitle, body: t.techBody, action: t.techAction, href: '/marketplace?department=warehouse_tech', Icon: Bot },
  ];

  return (
    <div className={`hp ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <PublicHeader lang={lang} onLangChange={setLang} />

      {/* Hero — rich dark band. Big search bar + quick searches on the left,
          the "describe your need" RFQ card on the right — the two-column
          layout Cesar reviewed and asked to match. */}
      <section className="hp-hero">
        <div className="hp-herobg" aria-hidden="true" />
        <div className="hp-heroin">
          <div className="hp-herocol">
            <span className="hp-eyebrow">{t.eyebrow}</span>
            <h1>{t.heroTitle}</h1>
            <p className="hp-herobody">{t.heroBody}</p>

            <form className="hp-searchform" role="search" onSubmit={submitSearch}>
              <Search size={ICON_INLINE} aria-hidden="true" />
              <label className="hp-sronly" htmlFor="hp-search">{t.searchLabel}</label>
              <input
                id="hp-search"
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                autoComplete="off"
              />
              <button type="submit">{t.search}<ArrowRight size={16} aria-hidden="true" /></button>
            </form>

            <div className="hp-quicksearches">
              <span>{t.popular}</span>
              {([
                [t.quick1, 'forklift repair'], [t.quick2, 'warehouse racking'],
                [t.quick3, 'barcode scanners'], [t.quick4, 'pilot'],
              ] as Array<[string, string]>).map(([label, value]) => (
                <Link key={value} href={`/marketplace?q=${encodeURIComponent(value)}`}>{label}</Link>
              ))}
            </div>
          </div>

          <aside className="hp-requestcard" aria-labelledby="hp-request-title">
            <span className="hp-requesteyebrow">{t.customEyebrow}</span>
            <h2 id="hp-request-title">{t.customTitle}</h2>
            <p>{t.customBody}</p>
            <ul>
              <li><Check size={16} aria-hidden="true" />{t.customPoint1}</li>
              <li><Check size={16} aria-hidden="true" />{t.customPoint2}</li>
            </ul>
            <Link className="hp-requestbtn" href="/intake">
              {t.postRequest}<ArrowRight size={16} aria-hidden="true" />
            </Link>
            <small>{t.requestNote}</small>
          </aside>
        </div>
      </section>

      <div className="hp-trustbar">
        <span className="hp-trustitem"><BadgeCheck size={ICON_INLINE} aria-hidden="true" /> {t.trustVerified}</span>
        <span className="hp-trustitem"><ShieldCheck size={ICON_INLINE} aria-hidden="true" /> {t.trustProtected}</span>
        <span className="hp-trustitem"><Send size={ICON_INLINE} aria-hidden="true" /> {t.trustFree}</span>
      </div>

      {/* Browse by category — promoted to its OWN full-width section
          (Cesar, 2026-07-23: was cramped as one card in a 2-col grid next to
          the RFQ card; now reads like Amazon Business / Grainger's
          category-browse band). Icon grid, live categories only — same
          CATEGORY_TILES data, visibleCategoryTiles empty-hiding, and
          /marketplace?department= routing as before, just laid out as tiles
          instead of a vertical list inside a card. No invented stats. */}
      <section className="hp-sec" aria-labelledby="hp-cat-title">
        <div className="hp-sechead">
          <div>
            <h2 id="hp-cat-title">{t.catCardTitle}</h2>
            <p className="hp-browsesub">{t.browseSub}</p>
          </div>
          <Link href="/marketplace" className="hp-sechead-action">{t.catCardAction}<ChevronRight size={15} aria-hidden="true" /></Link>
        </div>

        {visibleCategoryTiles.length > 0 ? (
          <div className="hp-catgrid">
            {visibleCategoryTiles.map(({ fg, en, es, Icon }) => (
              <Link key={fg} href={`/marketplace?department=${fg}`} className="hp-cattile">
                <span className="hp-cattileicon"><Icon size={26} aria-hidden="true" /></span>
                <span className="hp-cattilelabel">{lang === 'es' ? es : en}</span>
                <ChevronRight size={16} className="hp-cattilechev" aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : <p className="hp-catempty">{t.catEmpty}</p>}

        {/* Real-attribute quick filters (Alibaba's chip row) — every chip is
            a genuine /marketplace facet (src/app/marketplace/page.tsx), not a
            cosmetic label; the page reads these from the URL and ticks the
            same checkboxes a visitor could tick by hand. */}
        <div className="hp-chiprow" role="group" aria-label={t.filtersLabel}>
          <span className="hp-chiplabel">{t.filtersLabel}</span>
          <Link href="/marketplace?verified=1" className="hp-fchip"><BadgeCheck size={14} aria-hidden="true" />{t.chipVerified}</Link>
          <Link href="/marketplace?local=1" className="hp-fchip"><MapPin size={14} aria-hidden="true" />{t.chipLocal}</Link>
          <Link href="/marketplace?fast=1" className="hp-fchip"><Zap size={14} aria-hidden="true" />{t.chipFast}</Link>
          <Link href="/marketplace?emergency=1" className="hp-fchip"><Clock size={14} aria-hidden="true" />{t.chipEmergency}</Link>
        </div>
      </section>

      {/* Standalone RFQ CTA — the "one request, multiple quotes" card no
          longer shares a 2-col grid with category browse (that left it
          looking orphaned once category was promoted above). It's now its
          own centered, single-card band — deliberately NOT a 2-col dark
          band like the hero request card or the vendor band below, so it
          complements rather than duplicates them. */}
      <section className="hp-sec hp-rfqsec" aria-labelledby="hp-rfq-title">
        <div className="hp-rfqcard">
          <span className="hp-rfqicon"><Send size={22} aria-hidden="true" /></span>
          <h2 id="hp-rfq-title">{t.rfqCardTitle}</h2>
          <p>{t.rfqCardBody}</p>
          <Link className="hp-rfqbtn" href="/intake">{t.postRequest}<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      {/* "What are you looking for?" — the 3 path cards from Codex's build,
          kept as elevated cards per Design System v1.0. */}
      <section className="hp-sec" aria-labelledby="hp-start-title">
        <div className="hp-sechead"><div><h2 id="hp-start-title">{t.startTitle}</h2><p className="hp-browsesub">{t.startBody}</p></div></div>
        <div className="hp-sourcegrid">
          {sourceModes.map(({ kicker, title, body, action, href, Icon }) => (
            <Link className="hp-sourcecard" href={href} key={href}>
              <span className="hp-sourceicon"><Icon size={28} aria-hidden="true" /></span>
              <span className="hp-sourcekicker">{kicker}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className="hp-sourceaction">{action}<ChevronRight size={16} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* Standalone "Create a free account" CTA. This used to live inside
          the "Featured on NXT//LINK" listings section, which was removed
          (Cesar, 2026-07-22: not enough live inventory yet for that grid to
          look intentional). Kept as its own clean, centered block so account
          creation stays one obvious click from the homepage. */}
      <section className="hp-sec hp-ctasec">
        <a className="hp-bigcta" href="/signup">{t.createFreeAccount}</a>
      </section>

      {/* Buying tools — each card gets a real icon (was a flat colored
          square with no icon, reading as an empty/broken card). */}
      <section className="hp-sec">
        <div className="hp-sechead"><h2>{t.toolsHeading}</h2></div>
        <div className="hp-tools">
          {([
            [t.tool1T, t.tool1D, Send], [t.tool2T, t.tool2D, Columns3], [t.tool3T, t.tool3D, FlaskConical],
            [t.tool4T, t.tool4D, Route], [t.tool5T, t.tool5D, ShieldCheck], [t.tool6T, t.tool6D, MapPin],
          ] as Array<[string, string, typeof Forklift]>).map(([title, d, Icon]) => (
            <div key={title} className="hp-tool">
              <div className="hp-tooldot"><Icon size={ICON_INLINE} aria-hidden="true" /></div>
              <b>{title}</b><p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vendor door — routes straight to /vendor-signup (the organic quick
          lane, oauth_lane=organic / born PENDING, see PublicHeader's "Become
          a Vendor" for the same door). One vendor entry system, not a second
          early-access flow living only on the homepage. */}
      <section className="hp-vendorband" id="for-vendors" aria-labelledby="hp-vendor-title">
        <div className="hp-vbin">
          <div className="hp-vbcopy">
            <span className="hp-vendoreyebrow">{t.vendorEyebrow}</span>
            <h2 id="hp-vendor-title">{t.vendorHeading}</h2>
            <p>{t.vendorBody}</p>
            <div className="hp-vbbenefits">
              {[t.vendorPoint1, t.vendorPoint2, t.vendorPoint3, t.vendorPoint4].map((benefit) => (
                <span key={benefit}><Check size={16} aria-hidden="true" />{benefit}</span>
              ))}
            </div>
          </div>
          <Link className="hp-btn" href="/vendor-signup">{t.vendorApply}<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      {/* How it works — connected timeline (Cesar's 2026-07-22 revision: find
          technology → request information → get connected — no promises
          about matching, speed, or safety). Unchanged from the prior pass. */}
      <section className="hp-how" id="how-it-works">
        <h2 className="hp-howheading">{t.howHeading}</h2>
        <ol className="hp-timeline">
          {([
            ['1', MessageSquareText, t.step1Title, t.step1Desc],
            ['2', ClipboardList, t.step2Title, t.step2Desc],
            ['3', Handshake, t.step3Title, t.step3Desc],
          ] as Array<[string, typeof MessageSquareText, string, string]>).map(([n, Icon, title, desc]) => (
            <li className="hp-tlstep" key={n}>
              <div className="hp-tlmarker" aria-hidden="true">
                <span className="hp-tlcircle"><Icon size={ICON_STEP - 12} /></span>
              </div>
              <div className="hp-tlcontent">
                <span className="hp-tlnum">{t.stepLabel} {n}</span>
                <b>{title}</b>
                <p>{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQs — no fee/credit numbers on this page (hard constraint); the
          real commission math lives on /terms only. */}
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

      {/* Footer — dark ink, bookending the light content area */}
      <footer className="hp-foot">
        <div className="hp-footcols">
          <div>
            <b>NXT<i style={{ color: '#A99DF2', fontStyle: 'normal' }}>//</i>LINK</b>
            <p className="hp-foottag">{t.footerTagline}</p>
          </div>
          <div>
            <h4>{t.forBuyers}</h4>
            <a href="/marketplace">{t.browseMarketplace}</a>
            <a href="/projects">{t.myProjects}</a>
            <a href="/signup">{t.createAccount}</a>
            <a href="/login">{t.signIn}</a>
          </div>
          <div>
            <h4>{t.forVendors}</h4>
            <a href="/vendor-signup">{t.listYourCompany}</a>
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

      {/* Mobile-only sticky primary CTA */}
      <div className="hp-mobilecta">
        <Link className="hp-mobilectabtn" href="/intake">{t.postRequest}</Link>
      </div>
    </div>
  );
}

// Design System & App Spec v1.0 (vault/Design-System.md) applied via the
// `--spec-*` CSS variables already wired in globals.css: light content
// (warm white / white cards, violet #6C5CE0 primary, IBM Plex Sans body +
// Space Grotesk headings + IBM Plex Mono for data/eyebrows). The hero,
// vendor band, and footer stay deliberate dark "ink" accent moments; the new
// browse-zone cards read as one clean grid (Cesar: "I want them to be
// cards" — every entry point below the hero is an elevated, bordered tile).
const CSS = `
.hp{background:var(--spec-warm-white);color:var(--spec-ink);font-family:var(--font-ibm-plex-sans-landing),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;}
.hp *{box-sizing:border-box;}
.hp a{text-decoration:none;color:inherit;}
.hp h1,.hp h2,.hp h3{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;}
.hp-sronly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
.hp a:focus-visible,.hp button:focus-visible,.hp input:focus-visible{outline:3px solid rgba(108,92,224,.38);outline-offset:3px;}

/* Hero */
.hp-hero{position:relative;overflow:hidden;background:var(--spec-ink);}
.hp-herobg{position:absolute;inset:0;background:
  repeating-linear-gradient(118deg,transparent 0 26px,rgba(169,157,242,.07) 26px 29px),
  linear-gradient(rgba(169,157,242,.05) 1px,transparent 1px),
  linear-gradient(90deg,rgba(169,157,242,.05) 1px,transparent 1px),
  radial-gradient(760px 440px at 88% -12%,rgba(108,92,224,.38),transparent 60%);
  background-size:auto,64px 64px,64px 64px,auto;
  mask-image:linear-gradient(180deg,rgba(0,0,0,.9),rgba(0,0,0,.5));
  pointer-events:none;}
.hp-heroin{position:relative;max-width:1200px;margin:0 auto;padding:56px 22px 60px;display:grid;grid-template-columns:1.2fr .8fr;gap:48px;align-items:center;}
.hp-herocol{min-width:0;}
.hp-eyebrow{display:block;font-family:var(--font-ibm-plex-mono);font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--spec-lilac);}
.hp-hero h1{color:#F8F7FB;font-size:clamp(30px,4.6vw,52px);font-weight:700;letter-spacing:-.03em;line-height:1.04;margin:14px 0 14px;max-width:18ch;text-wrap:balance;}
.hp-herobody{max-width:56ch;margin:0;color:rgba(255,255,255,.78);font-size:15.5px;line-height:1.65;}

.hp-searchform{min-height:60px;max-width:640px;margin-top:26px;padding:6px 6px 6px 18px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;border:2px solid #fff;border-radius:var(--spec-radius-lg);background:#fff;box-shadow:0 24px 56px -26px rgba(0,0,0,.75);}
.hp-searchform:focus-within{border-color:var(--spec-lilac);box-shadow:0 0 0 4px rgba(169,157,242,.18),0 24px 56px -26px rgba(0,0,0,.75);}
.hp-searchform>svg{color:var(--spec-violet);}
.hp-searchform input{width:100%;min-width:0;height:44px;padding:0;border:0;outline:0;color:var(--spec-ink);background:transparent;font-family:inherit;font-size:14.5px;}
.hp-searchform input::placeholder{color:var(--spec-text-2nd);}
.hp-searchform button{min-height:46px;padding:0 18px;display:inline-flex;align-items:center;gap:7px;border:0;border-radius:var(--spec-radius-btn);color:#fff;background:var(--spec-violet);font-family:inherit;font-weight:700;font-size:13.5px;cursor:pointer;transition:background .15s;}
.hp-searchform button:hover{background:var(--spec-violet-deep);}

.hp-quicksearches{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:14px;max-width:640px;}
.hp-quicksearches>span{color:rgba(255,255,255,.6);font-size:11.5px;font-weight:600;}
.hp-quicksearches a{padding:7px 12px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:999px;font-size:12px;font-weight:600;color:#fff;transition:background .15s,border-color .15s;}
.hp-quicksearches a:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.5);}

.hp-requestcard{padding:28px;border:1px solid rgba(255,255,255,.75);border-radius:var(--spec-radius-lg);color:var(--spec-ink);background:rgba(255,255,255,.97);box-shadow:0 30px 70px -30px rgba(0,0,0,.7);}
.hp-requesteyebrow{display:block;font-family:var(--font-ibm-plex-mono);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--spec-violet-deep);}
.hp-requestcard h2{margin:10px 0 10px;font-size:24px;line-height:1.12;letter-spacing:-.02em;text-wrap:balance;}
.hp-requestcard>p{margin:0;color:var(--spec-text-2nd);font-size:13.5px;line-height:1.6;}
.hp-requestcard ul{margin:18px 0;padding:0;list-style:none;display:grid;gap:9px;}
.hp-requestcard li{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:650;}
.hp-requestcard li svg{width:19px;height:19px;padding:3px;border-radius:50%;color:var(--spec-success);background:var(--spec-surface);flex-shrink:0;}
.hp-requestbtn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:46px;padding:0 18px;border-radius:var(--spec-radius-btn);color:#fff;background:var(--spec-violet);font-weight:700;font-size:14px;transition:background .15s;}
.hp-requestbtn:hover{background:var(--spec-violet-deep);}
.hp-requestcard small{display:block;margin-top:10px;color:var(--spec-text-2nd);font-size:11px;text-align:center;}

@media(max-width:900px){
  .hp-heroin{grid-template-columns:1fr;padding:40px 20px 40px;gap:30px;}
}
@media(max-width:520px){
  .hp-searchform{grid-template-columns:auto minmax(0,1fr);padding:14px;}
  .hp-searchform button{grid-column:1/-1;width:100%;justify-content:center;margin-top:4px;}
}

/* Trust bar */
.hp-trustbar{display:flex;justify-content:center;gap:30px;flex-wrap:wrap;max-width:1000px;margin:36px auto 0;padding:0 22px;}
.hp-trustitem{display:flex;align-items:center;gap:8px;color:var(--spec-text-2nd);font-size:13px;font-weight:600;}
.hp-trustitem svg{color:var(--spec-success);flex-shrink:0;}

/* Section shell */
.hp-sec{max-width:1160px;margin:0 auto;padding:56px 22px 0;}
.hp-sechead{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:22px;flex-wrap:wrap;}
.hp-sechead h2{font-size:clamp(20px,2.6vw,27px);font-weight:700;letter-spacing:-.02em;color:var(--spec-ink);margin:0;}
.hp-sechead a{color:var(--spec-violet);font-size:13.5px;font-weight:600;flex-shrink:0;}
.hp-sechead a:hover{color:var(--spec-violet-deep);}
.hp-browsesub{margin:6px 0 0;color:var(--spec-text-2nd);font-size:13.5px;line-height:1.55;max-width:52ch;}
.hp-sechead-action{display:inline-flex;align-items:center;gap:5px;}

/* Browse by category — full-width icon grid (promoted out of the old 2-card
   .hp-browsegrid, Cesar 2026-07-23). 3 cols desktop, 2 cols tablet, 1-2 cols
   (auto-fit) on small phones. Each tile: icon + bold label + chevron. */
.hp-catgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}
.hp-cattile{display:flex;align-items:center;gap:14px;padding:20px;background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-lg);color:var(--spec-ink);transition:transform .15s,border-color .15s,box-shadow .15s;}
.hp-cattile:hover{transform:translateY(-2px);border-color:var(--spec-violet);box-shadow:0 16px 32px -22px rgba(20,19,32,.25);}
.hp-cattileicon{flex-shrink:0;width:48px;height:48px;display:grid;place-items:center;border-radius:var(--spec-radius-md);background:var(--spec-surface);color:var(--spec-violet);transition:background .15s,color .15s;}
.hp-cattile:hover .hp-cattileicon{background:var(--spec-violet);color:#fff;}
.hp-cattilelabel{flex:1;min-width:0;font-size:14.5px;font-weight:700;line-height:1.3;}
.hp-cattilechev{flex-shrink:0;color:var(--spec-text-2nd);transition:color .15s;}
.hp-cattile:hover .hp-cattilechev{color:var(--spec-violet);}
.hp-catempty{margin:0;padding:32px;text-align:center;color:var(--spec-text-2nd);font-size:13.5px;line-height:1.55;background:#fff;border:1px dashed var(--spec-border);border-radius:var(--spec-radius-lg);}

@media(max-width:900px){.hp-catgrid{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media(max-width:560px){.hp-catgrid{grid-template-columns:repeat(auto-fit,minmax(130px,1fr));}}

/* Standalone RFQ CTA — one centered card, not a 2-col band, so it reads as
   its own moment rather than a duplicate of the hero request card. */
.hp-rfqsec{padding-top:36px;}
.hp-rfqcard{max-width:640px;margin:0 auto;padding:36px 32px;text-align:center;background:var(--spec-ink);border-radius:var(--spec-radius-lg);color:#fff;}
.hp-rfqicon{display:inline-grid;place-items:center;width:48px;height:48px;border-radius:50%;background:rgba(169,157,242,.16);color:var(--spec-lilac);margin-bottom:16px;}
.hp-rfqcard h2{margin:0 0 10px;font-size:22px;font-weight:700;letter-spacing:-.02em;color:#F8F7FB;}
.hp-rfqcard p{margin:0 auto 22px;max-width:52ch;color:rgba(255,255,255,.76);font-size:14px;line-height:1.6;}
.hp-rfqbtn{display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 26px;border-radius:var(--spec-radius-btn);background:var(--spec-violet);color:#fff;font-weight:700;font-size:14px;transition:background .15s;}
.hp-rfqbtn:hover{background:var(--spec-violet-deep);}

/* Quick-filter chip row */
.hp-chiprow{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-top:20px;padding-top:20px;border-top:1px solid var(--spec-border);}
.hp-chiplabel{color:var(--spec-text-2nd);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-right:2px;}
.hp-fchip{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border:1px solid var(--spec-border);border-radius:999px;color:var(--spec-ink);font-size:12px;font-weight:650;background:#fff;transition:border-color .15s,color .15s,background .15s;}
.hp-fchip svg{color:var(--spec-violet);flex-shrink:0;}
.hp-fchip:hover{border-color:var(--spec-violet);color:var(--spec-violet-deep);background:var(--spec-surface);}

/* "What are you looking for" path cards */
.hp-sourcegrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}
.hp-sourcecard{position:relative;min-height:260px;padding:20px;display:flex;flex-direction:column;border:1px solid var(--spec-border);border-radius:var(--spec-radius-lg);background:#fff;color:var(--spec-ink);transition:transform .15s,border-color .15s,box-shadow .15s;}
.hp-sourcecard:hover{transform:translateY(-3px);border-color:var(--spec-violet);box-shadow:0 20px 40px -26px rgba(20,19,32,.3);}
.hp-sourceicon{width:48px;height:48px;display:grid;place-items:center;border-radius:var(--spec-radius-md);background:linear-gradient(135deg,var(--spec-ink),var(--spec-violet));color:#fff;margin-bottom:14px;}
.hp-sourcekicker{font-family:var(--font-ibm-plex-mono);font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--spec-violet-deep);}
.hp-sourcecard h3{margin:8px 0 6px;font-size:19px;letter-spacing:-.02em;}
.hp-sourcecard p{margin:0;color:var(--spec-text-2nd);font-size:13px;line-height:1.55;}
.hp-sourceaction{margin-top:auto;padding-top:16px;display:flex;align-items:center;gap:4px;color:var(--spec-violet-deep);font-size:13px;font-weight:700;}
@media(max-width:760px){.hp-sourcegrid{grid-template-columns:1fr;}}

/* Standalone "Create a free account" CTA (replaces the removed "Featured on
   NXT//LINK" listings section — this is the CTA that used to live at its
   bottom, kept as its own centered block). */
.hp-ctasec{padding-bottom:56px;text-align:center;}
.hp-bigcta{display:inline-block;background:var(--spec-violet);color:#fff;font-weight:700;font-size:14.5px;padding:14px 30px;border-radius:var(--spec-radius-btn);transition:background .15s;}
.hp-bigcta:hover{background:var(--spec-violet-deep);}

/* Buying tools */
.hp-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;}
.hp-tool{background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-lg);padding:24px;}
.hp-tooldot{width:40px;height:40px;display:grid;place-items:center;border-radius:var(--spec-radius-md);background:linear-gradient(135deg,var(--spec-violet),var(--spec-lilac));color:#fff;margin-bottom:14px;}
.hp-tool b{font-size:15.5px;font-weight:700;color:var(--spec-ink);}
.hp-tool p{color:var(--spec-text-2nd);font-size:13.5px;line-height:1.6;margin:8px 0 0;}

/* Vendor band */
.hp-vendorband{max-width:1160px;margin:56px auto 0;padding:0 22px;}
.hp-vbin{background:var(--spec-ink);border-radius:var(--spec-radius-lg);padding:36px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:30px;position:relative;overflow:hidden;}
.hp-vbin::before{content:'';position:absolute;inset:0;background:
  repeating-linear-gradient(118deg,transparent 0 26px,rgba(169,157,242,.08) 26px 29px),
  linear-gradient(rgba(169,157,242,.06) 1px,transparent 1px),
  linear-gradient(90deg,rgba(169,157,242,.06) 1px,transparent 1px);
  background-size:auto,64px 64px,64px 64px;
  mask-image:linear-gradient(180deg,rgba(0,0,0,.8),rgba(0,0,0,.3));}
.hp-vbin>*{position:relative;}
.hp-vbcopy{min-width:0;}
.hp-vendoreyebrow{display:block;font-family:var(--font-ibm-plex-mono);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--spec-lilac);}
.hp-vbin h2{font-family:var(--font-space-grotesk);color:#F8F7FB;font-size:23px;font-weight:700;letter-spacing:-.02em;margin:8px 0 0;}
.hp-vbin>.hp-vbcopy>p{color:#C9C6D6;font-size:14px;line-height:1.6;margin:10px 0 0;max-width:60ch;}
.hp-vbbenefits{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 18px;margin-top:16px;}
.hp-vbbenefits span{display:flex;align-items:center;gap:8px;color:#F8F7FB;font-size:12.5px;font-weight:600;}
.hp-vbbenefits svg{color:#78D7A6;flex-shrink:0;}
.hp-vbin>.hp-btn{white-space:nowrap;min-height:46px;display:inline-flex;align-items:center;gap:8px;}
.hp-btn{font-family:inherit;background:var(--spec-violet);color:#fff;font-weight:700;font-size:14.5px;padding:0 22px;border-radius:var(--spec-radius-btn);border:none;cursor:pointer;transition:background .15s;}
.hp-btn:hover{background:var(--spec-violet-deep);}
@media(max-width:760px){
  .hp-vbin{grid-template-columns:1fr;padding:28px 24px;gap:22px;}
  .hp-vbin>.hp-btn{width:100%;justify-content:center;}
  .hp-vbbenefits{grid-template-columns:1fr;}
}

/* How it works — vertical connected timeline */
.hp-how{max-width:1160px;margin:0 auto;padding:64px 22px 8px;}
.hp-howheading{font-size:clamp(20px,2.6vw,26px);font-weight:700;letter-spacing:-.02em;text-align:center;margin:0 0 40px;color:var(--spec-ink);}
.hp-timeline{position:relative;list-style:none;margin:0 auto;padding:0;max-width:640px;}
.hp-timeline::before{content:'';position:absolute;left:27px;top:28px;bottom:28px;width:2px;background:var(--spec-border);}
.hp-tlstep{position:relative;display:flex;gap:20px;padding-bottom:40px;}
.hp-tlstep:last-child{padding-bottom:0;}
.hp-tlmarker{position:relative;z-index:1;flex-shrink:0;}
.hp-tlcircle{width:56px;height:56px;border-radius:50%;background:#fff;border:2px solid var(--spec-violet);color:var(--spec-violet);display:grid;place-items:center;box-shadow:0 6px 16px -8px rgba(108,92,224,.35);}
.hp-tlcontent{padding-top:10px;min-width:0;}
.hp-tlnum{display:block;font-family:var(--font-ibm-plex-mono);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--spec-violet-deep);margin:0 0 4px;}
.hp-tlcontent b{font-size:17px;font-weight:700;display:block;color:var(--spec-ink);}
.hp-tlcontent p{color:var(--spec-text-2nd);font-size:14px;line-height:1.6;margin:6px 0 0;max-width:52ch;}
@media(max-width:480px){
  .hp-tlcircle{width:48px;height:48px;}
  .hp-timeline::before{left:23px;}
  .hp-tlstep{gap:16px;padding-bottom:32px;}
}

/* FAQ */
.hp-faqs{display:flex;flex-direction:column;gap:12px;max-width:820px;}
.hp-faq{background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-md);overflow:hidden;}
.hp-faq.open{border-color:var(--spec-violet);}
.hp-faqq{width:100%;display:flex;justify-content:space-between;align-items:center;gap:14px;font-family:inherit;font-size:15px;font-weight:700;color:var(--spec-ink);background:none;border:none;padding:18px 20px;cursor:pointer;text-align:left;}
.hp-faqq:focus-visible{outline:2px solid var(--spec-violet);outline-offset:-2px;}
.hp-faqi{color:var(--spec-violet);font-size:20px;font-weight:400;flex-shrink:0;}
.hp-faqa{padding:0 20px 18px;color:var(--spec-text-2nd);font-size:14px;line-height:1.65;}

/* Footer */
.hp-foot{margin-top:64px;border-top:1px solid rgba(255,255,255,.08);background:var(--spec-ink);padding-bottom:0;}
.hp-footcols{max-width:1160px;margin:0 auto;padding:48px 22px 32px;display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:28px;}
@media(max-width:720px){.hp-footcols{grid-template-columns:1fr 1fr;}}
.hp-footcols>div>b{font-family:var(--font-space-grotesk);font-size:17px;font-weight:700;color:#F8F7FB;}
.hp-foottag{color:#9B98AC;font-size:13px;line-height:1.6;margin:10px 0 0;max-width:34ch;}
.hp-footcols h4{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8B889C;margin:0 0 12px;}
.hp-footcols a{display:block;color:#C9C6D6;font-size:13.5px;margin-bottom:9px;}
.hp-footcols a:hover{color:var(--spec-lilac);}
.hp-footbottom{border-top:1px solid rgba(255,255,255,.06);padding:18px 22px;text-align:center;color:#75718A;font-size:12.5px;}

/* Mobile sticky primary CTA */
.hp-mobilecta{display:none;}
@media(max-width:760px){
  .hp{padding-bottom:78px;}
  .hp-mobilecta{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:45;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);backdrop-filter:blur(16px);border-top:1px solid var(--spec-border);}
  .hp-mobilectabtn{display:block;width:100%;text-align:center;background:var(--spec-violet);color:#fff;font-weight:700;font-size:15px;padding:13px;border-radius:var(--spec-radius-md);}
}
`;
