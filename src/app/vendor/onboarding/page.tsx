'use client';

// Vendor onboarding — v2 "hub + four focused sections" card flow.
//
// Replaces the v1 single 12-card line (Slice S1) per Cesar's explicit
// rejection of that look ("content floats left in a huge empty white void;
// tiny disconnected Save & exit; lonely Next button; the single card line
// feels endless") and CESAR'S PORTAL REDESIGN BLUEPRINT (workplace/plans/
// vendor-onboarding-uber-flow-2026-07-29.md).
//
// Structure: an entry hub (welcome + 4 section tiles, each showing its own
// completion state) + a persistent calm checklist (sidebar on desktop,
// collapsible strip on mobile — plain items, green check when done, violet
// highlight on the active one; no % ring, no lock icons, no "unlocks" copy).
// Each of the first 3 sections opens its own short card-flow. Section 4
// (Agreement & Activation) recaps what was built, then presents the vendor
// terms as a scannable table + a single checkbox + the Activate CTA.
//
// Data + reuse contract (unchanged from Slice S1):
// - No new data. Every field already exists on vendor_profiles / vendor_*
//   tables and is saved through the SAME endpoints the portal page
//   (src/app/vendor/portal/page.tsx) uses — see useVendorOnboardingProfile.ts.
// - No AI in the flow (guardrail) — "Use a template" inserts a static string,
//   no API call.
// - CategoryPicker is embedded exactly as-is (a future slice reworks its
//   search/chip UI; this rebuild must not touch that shared component).
// - The vendor-agreement click-wrap is recorded through the SAME endpoint
//   the portal's "I accept the NXT//LINK vendor terms" button already calls
//   (POST /api/vendor/agreement) — this flow never invents a second legal
//   record, only a friendlier presentation of the same one.

import { useEffect, useMemo, useRef, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import {
  Image as LogoIcon, Building2, Building, Phone, Quote, FileText, Factory, Users,
  Boxes, MapPin, Award, Check, X, ShieldCheck, Camera, Video as VideoIcon,
  Handshake, ChevronRight, ChevronDown, ExternalLink, Warehouse, ShoppingCart,
  UtensilsCrossed, Car, Snowflake, ArrowLeftRight, HardHat, Truck, Pill, Plane,
  Wrench, Home, Landmark, type LucideIcon,
} from 'lucide-react';
import CategoryChipPicker from './CategoryChipPicker';
import LanguageToggle, { useLang } from '@/components/LanguageToggle';
import {
  SECTION_ORDER, STOREFRONT_STEPS, CAPABILITIES_STEPS, TRUST_STEPS, AGREEMENT_STEPS,
  stepsForSection, clampStepIndex, computeSectionStatus, countSectionsDone, showServiceAreasQuestion,
  type SectionKey, type StepId,
} from './steps';
import {
  useVendorOnboardingProfile,
  type OnboardingVendor,
  type OnboardingCertification,
  type OnboardingPhoto,
  type OnboardingCaseStudy,
  type CertificationInput,
  type CaseStudyInput,
} from './useVendorOnboardingProfile';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-vo2',
  display: 'swap',
});

// Mirrors the taxonomy lists in src/app/vendor/portal/page.tsx (not exported
// there, and that page stays untouched — see file header).
const AREAS = ['El Paso', 'Juárez', 'New Mexico', 'West Texas', 'Cross-border', 'National'];
const INDUSTRIES = [
  'Warehousing & 3PL', 'Manufacturing', 'Retail & E-commerce', 'Food & Beverage', 'Automotive',
  'Cold Chain', 'Import / Export & Customs', 'Construction', 'Distribution Centers',
  'Pharma & Healthcare', 'Aerospace & Defense', 'General Industrial',
];
const CLIENT_SIZES = [
  'Small businesses (1–50 people)', 'Mid-size companies (51–500)', 'Large companies (500+)', 'Enterprise / Fortune 500',
];

// Icon maps for the 2026-07-30 "more visual and interactive" pass — pure
// presentation, no effect on stored values (still plain strings in
// vendor.industries / vendor.client_types).
const INDUSTRY_ICON: Record<string, LucideIcon> = {
  'Warehousing & 3PL': Warehouse,
  'Manufacturing': Factory,
  'Retail & E-commerce': ShoppingCart,
  'Food & Beverage': UtensilsCrossed,
  'Automotive': Car,
  'Cold Chain': Snowflake,
  'Import / Export & Customs': ArrowLeftRight,
  'Construction': HardHat,
  'Distribution Centers': Truck,
  'Pharma & Healthcare': Pill,
  'Aerospace & Defense': Plane,
  'General Industrial': Wrench,
};
const CLIENT_SIZE_ICON: Record<string, LucideIcon> = {
  'Small businesses (1–50 people)': Home,
  'Mid-size companies (51–500)': Building,
  'Large companies (500+)': Building2,
  'Enterprise / Fortune 500': Landmark,
};

type Lang = 'en' | 'es';
type View = { mode: 'hub' } | { mode: 'section'; section: SectionKey; stepId: StepId };
type TrustTools = {
  certifications: OnboardingCertification[];
  photos: OnboardingPhoto[];
  caseStudies: OnboardingCaseStudy[];
  videos: { id: string; title: string | null; url: string }[];
  proofBusy: 'certification' | 'case-study' | 'photo' | null;
  proofError: string;
  setProofError: (message: string) => void;
  addCertification: (input: CertificationInput, file: File | null) => Promise<boolean>;
  removeCertification: (id: string) => Promise<boolean>;
  addCaseStudy: (input: CaseStudyInput) => Promise<boolean>;
  removeCaseStudy: (id: string) => Promise<boolean>;
  addPhoto: (caption: string, file: File) => Promise<boolean>;
  removePhoto: (id: string) => Promise<boolean>;
  videoBusy: boolean;
  addVideo: (title: string, url: string) => Promise<boolean>;
  removeVideo: (id: string) => void;
};
const EMPTY_CERTIFICATION_INPUT: CertificationInput = {
  name: '', issuer: '', credential: '', issued_on: '', expires_on: '',
};
const EMPTY_CASE_STUDY_INPUT: CaseStudyInput = {
  title: '', challenge: '', solution: '', result: '',
};

// Full (unfiltered) step order per section — used only to find a sane
// fallback card if the currently-shown one disappears mid-flow (Capabilities
// dropping "service_areas" for a software-only vendor).
const FULL_ORDER: Record<SectionKey, StepId[]> = {
  storefront: STOREFRONT_STEPS,
  capabilities: CAPABILITIES_STEPS,
  trust: TRUST_STEPS,
  agreement: AGREEMENT_STEPS,
};

const SECTION_ICON: Record<SectionKey, LucideIcon> = {
  storefront: Building2, capabilities: Boxes, trust: ShieldCheck, agreement: Handshake,
};
const STEP_ICON: Partial<Record<StepId, LucideIcon>> = {
  name_logo: LogoIcon, location_areas: MapPin, tagline_about: Quote, contact: Phone,
  industries: Factory, client_size: Users, categories: Boxes,
  proof: ShieldCheck, videos: VideoIcon, awards: Award,
};

const TR: Record<string, { en: string; es: string }> = {
  doc_title: { en: 'Set up your storefront — NXT//LINK', es: 'Configura tu tienda — NXT//LINK' },
  loading: { en: 'Loading…', es: 'Cargando…' },
  redirecting: { en: 'One moment…', es: 'Un momento…' },
  signin_h: { en: 'Sign in to set up your storefront', es: 'Inicia sesión para configurar tu tienda' },
  signin_body: { en: 'Create or access your vendor account to build your profile.', es: 'Crea o accede a tu cuenta de proveedor para construir tu perfil.' },
  signin_cta: { en: 'Go to sign in', es: 'Ir a iniciar sesión' },
  exit: { en: 'Save & exit', es: 'Guardar y salir' },
  back: { en: 'Back', es: 'Atrás' },
  next: { en: 'Next', es: 'Siguiente' },
  done: { en: 'Done', es: 'Listo' },
  overview: { en: 'Overview', es: 'Resumen' },
  saved: { en: 'Saved', es: 'Guardado' },
  save_error: { en: 'Could not save — check your connection.', es: 'No se pudo guardar — revisa tu conexión.' },
  step_of: { en: 'Step {n} of {total}', es: 'Paso {n} de {total}' },

  // Hub
  hub_h: { en: 'Let’s build your storefront', es: 'Construyamos tu tienda' },
  hub_sub: { en: 'This is what buyers see. Nothing you enter here is ever lost.', es: 'Esto es lo que ven los compradores. Nada de lo que ingreses aquí se pierde.' },
  hub_progress: { en: '{n} of 4 sections done', es: '{n} de 4 secciones completas' },
  status_not_started: { en: 'Not started', es: 'No iniciado' },
  status_progress: { en: '{done} of {total} done', es: '{done} de {total} completos' },
  status_complete: { en: 'Complete', es: 'Completo' },
  checklist_title: { en: 'Your progress', es: 'Tu progreso' },
  strip_summary: { en: '{n} of 4 sections done', es: '{n} de 4 secciones completas' },

  sec_storefront_label: { en: 'Storefront', es: 'Tienda' },
  sec_storefront_blurb: { en: 'Name, logo, location, and how buyers reach you', es: 'Nombre, logo, ubicación y cómo te contactan los compradores' },
  sec_capabilities_label: { en: 'Capabilities', es: 'Capacidades' },
  sec_capabilities_blurb: { en: 'Industries, client sizes, and what you sell', es: 'Industrias, tamaños de clientes y qué vendes' },
  sec_trust_label: { en: 'Trust & Proof', es: 'Confianza y pruebas' },
  sec_trust_blurb: { en: 'Certifications, case studies, photos, and more', es: 'Certificaciones, casos de éxito, fotos y más' },
  sec_agreement_label: { en: 'Agreement & Activation', es: 'Acuerdo y activación' },
  sec_agreement_blurb: { en: 'Review the terms and activate your storefront', es: 'Revisa los términos y activa tu tienda' },

  // Storefront cards
  h_name_logo: { en: 'What’s your company called?', es: '¿Cómo se llama tu empresa?' },
  company_label: { en: 'Company name', es: 'Nombre de la empresa' },
  logo_upload: { en: 'Upload logo', es: 'Subir logo' },
  logo_replace: { en: 'Replace logo', es: 'Reemplazar logo' },
  logo_uploading: { en: 'Uploading…', es: 'Subiendo…' },
  logo_remove: { en: 'Remove', es: 'Quitar' },
  h_location: { en: 'Where is your business located?', es: '¿Dónde está ubicada tu empresa?' },
  loc_region_ep: { en: 'El Paso, United States', es: 'El Paso, Estados Unidos' },
  loc_region_jz: { en: 'Ciudad Juárez, Mexico', es: 'Ciudad Juárez, México' },
  loc_region_lc: { en: 'Las Cruces, United States', es: 'Las Cruces, Estados Unidos' },
  loc_region_chi: { en: 'Chihuahua, Mexico', es: 'Chihuahua, México' },
  loc_other: { en: 'Somewhere else', es: 'Otro lugar' },
  ph_location_other: { en: 'e.g. "Houston, United States"', es: 'ej. "Houston, Estados Unidos"' },
  h_tagline: { en: 'Sum up your company in one line', es: 'Resume tu empresa en una línea' },
  ph_tagline: { en: 'e.g. "Forklift service across the Borderplex since 2009."', es: 'ej. "Servicio de montacargas en la frontera desde 2009."' },
  h_about: { en: 'What does your company do?', es: '¿Qué hace tu empresa?' },
  ph_about: { en: 'e.g. "We sell, rent, and repair forklifts in El Paso and Juárez."', es: 'ej. "Vendemos, rentamos y reparamos montacargas en El Paso y Juárez."' },
  use_template: { en: 'Use a template', es: 'Usar una plantilla' },
  h_contact: { en: 'How can buyers reach you?', es: '¿Cómo pueden contactarte los compradores?' },
  contact_name_label: { en: 'Contact name', es: 'Nombre de contacto' },
  website_label: { en: 'Website (optional)', es: 'Sitio web (opcional)' },
  phone_label: { en: 'Phone', es: 'Teléfono' },

  // Capabilities cards
  h_industries: { en: 'Which industries do you serve?', es: '¿A qué industrias atiendes?' },
  sub_industries: { en: 'Pick every one that fits — buyers filter by this.', es: 'Elige todas las que apliquen — los compradores filtran por esto.' },
  add_industry_ph: { en: 'Add another industry…', es: 'Agrega otra industria…' },
  h_client_size: { en: 'What size companies do you serve?', es: '¿De qué tamaño son las empresas que atiendes?' },
  h_categories: { en: 'What do you sell?', es: '¿Qué vendes?' },
  sub_categories: { en: 'Search, or tap a popular category below.', es: 'Busca, o toca una categoría popular abajo.' },
  h_service_areas: { en: 'Where do you provide service?', es: '¿Dónde das servicio?' },

  // Trust & Proof cards
  h_proof: { en: 'Show buyers you’re the real deal', es: 'Demuestra que eres de confianza' },
  sub_proof: { en: 'Certifications, case studies, and photos build trust fast.', es: 'Certificaciones, casos de éxito y fotos generan confianza rápido.' },
  proof_added: { en: 'Added', es: 'Agregado' },
  h_certifications: { en: 'Certifications', es: 'Certificaciones' },
  certs_empty: { en: 'No certifications yet.', es: 'Aún no hay certificaciones.' },
  certs_cta: { en: 'Add certifications in your portal', es: 'Agrega certificaciones en tu portal' },
  h_case_studies: { en: 'Case studies', es: 'Casos de éxito' },
  cases_empty: { en: 'No case studies yet.', es: 'Aún no hay casos de éxito.' },
  cases_cta: { en: 'Add case studies in your portal', es: 'Agrega casos de éxito en tu portal' },
  h_photos: { en: 'Photo gallery', es: 'Galería de fotos' },
  photos_empty: { en: 'No photos yet.', es: 'Aún no hay fotos.' },
  photos_cta: { en: 'Add photos in your portal', es: 'Agrega fotos en tu portal' },
  h_videos: { en: 'Showcase videos', es: 'Videos de tu trabajo' },
  sub_videos: { en: 'Paste a YouTube or Vimeo link.', es: 'Pega un enlace de YouTube o Vimeo.' },
  video_title_ph: { en: 'Title (optional)', es: 'Título (opcional)' },
  video_url_ph: { en: 'https://youtube.com/watch?v=…', es: 'https://youtube.com/watch?v=…' },
  video_add: { en: 'Add video', es: 'Agregar video' },
  video_remove: { en: 'Remove', es: 'Quitar' },
  videos_empty: { en: 'No videos yet.', es: 'Aún no hay videos.' },
  h_awards: { en: 'Any awards or certifications to highlight?', es: '¿Algún premio o certificación que destacar?' },
  sub_awards: { en: 'Optional — you can add this anytime.', es: 'Opcional — puedes agregarlo cuando quieras.' },
  add_award_ph: { en: 'Add an award or recognition…', es: 'Agrega un premio o reconocimiento…' },
  add_btn: { en: 'Add', es: 'Agregar' },

  proof_intro: { en: 'Add at least one strong proof item now. You can add more later.', es: 'Agrega al menos una prueba sólida ahora. Puedes agregar más después.' },
  proof_error: { en: 'We could not save that item. Check the information and try again.', es: 'No pudimos guardar ese elemento. Revisa la información e inténtalo de nuevo.' },
  proof_remove: { en: 'Remove', es: 'Quitar' },
  proof_optional: { en: 'Optional', es: 'Opcional' },
  proof_required: { en: 'Required', es: 'Obligatorio' },
  proof_saved: { en: 'Saved to your storefront', es: 'Guardado en tu tienda' },
  proof_view_document: { en: 'View document', es: 'Ver documento' },
  cert_desc: { en: 'Show licenses, safety training, quality standards, or manufacturer credentials buyers can verify.', es: 'Muestra licencias, capacitación de seguridad, normas de calidad o credenciales del fabricante que los compradores puedan verificar.' },
  cert_name: { en: 'Certification name', es: 'Nombre de la certificación' },
  cert_name_ph: { en: 'e.g. ISO 9001', es: 'ej. ISO 9001' },
  cert_issuer: { en: 'Issued by', es: 'Emitida por' },
  cert_issuer_ph: { en: 'e.g. International Organization for Standardization', es: 'ej. Organización Internacional de Normalización' },
  cert_credential: { en: 'Credential or license number', es: 'Número de credencial o licencia' },
  cert_issued: { en: 'Issue date', es: 'Fecha de emisión' },
  cert_expires: { en: 'Expiration date', es: 'Fecha de vencimiento' },
  cert_document: { en: 'Certificate document', es: 'Documento del certificado' },
  cert_file_help: { en: 'PNG, JPG, WEBP, or PDF · up to 8 MB', es: 'PNG, JPG, WEBP o PDF · hasta 8 MB' },
  cert_add: { en: 'Save certification', es: 'Guardar certificación' },
  cert_limit: { en: '{n} of 12 certifications', es: '{n} de 12 certificaciones' },
  cert_missing: { en: 'Enter the certification name first.', es: 'Primero ingresa el nombre de la certificación.' },
  cert_expiry_meta: { en: 'Expires {date}', es: 'Vence {date}' },
  cases_desc: { en: 'Tell a short buyer story: the problem, what your team did, and the measurable result.', es: 'Cuenta una historia breve para el comprador: el problema, lo que hizo tu equipo y el resultado medible.' },
  case_title: { en: 'Project title', es: 'Título del proyecto' },
  case_title_ph: { en: 'e.g. Cut forklift downtime at a distribution center', es: 'ej. Redujimos el tiempo fuera de servicio de montacargas' },
  case_challenge: { en: 'The buyer’s challenge', es: 'El reto del comprador' },
  case_challenge_ph: { en: 'What was slowing down or putting the operation at risk?', es: '¿Qué frenaba o ponía en riesgo la operación?' },
  case_solution: { en: 'What you delivered', es: 'Lo que entregaste' },
  case_solution_ph: { en: 'Describe the work, product, or approach.', es: 'Describe el trabajo, producto o método.' },
  case_result: { en: 'Result', es: 'Resultado' },
  case_result_ph: { en: 'Use a number when possible, such as 18% less downtime.', es: 'Usa una cifra cuando sea posible, como 18% menos tiempo fuera de servicio.' },
  case_add: { en: 'Save case study', es: 'Guardar caso de éxito' },
  case_limit: { en: '{n} of 3 case studies', es: '{n} de 3 casos de éxito' },
  case_missing: { en: 'Give the case study a clear title first.', es: 'Primero dale un título claro al caso de éxito.' },
  photos_desc: { en: 'Show your team, facility, installed equipment, or completed work. Real photos help buyers know what to expect.', es: 'Muestra tu equipo, instalaciones, equipos instalados o trabajos terminados. Las fotos reales ayudan al comprador a saber qué esperar.' },
  photo_caption: { en: 'Caption', es: 'Descripción de la foto' },
  photo_caption_ph: { en: 'e.g. Preventive maintenance at an El Paso warehouse', es: 'ej. Mantenimiento preventivo en un almacén de El Paso' },
  photo_file: { en: 'Choose a photo', es: 'Elige una foto' },
  photo_file_help: { en: 'PNG, JPG, or WEBP · up to 8 MB', es: 'PNG, JPG o WEBP · hasta 8 MB' },
  photo_add: { en: 'Upload photo', es: 'Subir foto' },
  photo_limit: { en: '{n} of 12 photos', es: '{n} de 12 fotos' },
  photo_missing: { en: 'Choose a photo first.', es: 'Primero elige una foto.' },
  proof_saving: { en: 'Saving…', es: 'Guardando…' },

  // Agreement & Activation
  h_recap: { en: 'You’re almost there', es: 'Ya casi terminas' },
  sub_recap: { en: 'Here’s what you’ve built so far.', es: 'Esto es lo que has construido hasta ahora.' },
  stat_listings: { en: 'Listings', es: 'Publicaciones' },
  stat_categories: { en: 'Categories selected', es: 'Categorías seleccionadas' },
  stat_proof: { en: 'Proof items', es: 'Elementos de prueba' },
  h_terms: { en: 'Review the vendor terms', es: 'Revisa los términos de proveedor' },
  terms_row_pay: { en: 'What you pay', es: 'Lo que pagas' },
  terms_row_protected: { en: 'Protected period', es: 'Período protegido' },
  terms_row_stay: { en: 'Stay on platform', es: 'Permanece en la plataforma' },
  terms_row_accurate: { en: 'Accurate listings', es: 'Publicaciones precisas' },
  terms_disclaimer: { en: 'Plain-language business terms, not final legal wording — a lawyer reviews the full agreement before real commerce.', es: 'Términos de negocio en lenguaje sencillo, no es el texto legal final — un abogado revisa el acuerdo completo antes del comercio real.' },
  terms_full_link: { en: 'Read the full terms', es: 'Leer los términos completos' },
  reassure_main: { en: 'No subscription or monthly commitment. You only pay when a qualifying deal is completed.', es: 'Sin suscripción ni compromiso mensual. Solo pagas cuando se completa un trato que califica.' },
  reassure_sub: { en: 'Introduced-customer and protected-period terms may continue as described in the Vendor Agreement.', es: 'Los términos de cliente presentado y del período de protección pueden continuar según se describe en el Acuerdo de Proveedor.' },
  accept_checkbox: { en: 'I accept the NXT//LINK vendor terms', es: 'Acepto los términos de proveedor de NXT//LINK' },
  activate_btn: { en: 'Activate My Storefront', es: 'Activar mi tienda' },
  activate_error: { en:…13216 tokens truncated…ot.lg{width:28px;height:28px;}
.vo-checkdraw{stroke-dasharray:20;stroke-dashoffset:20;animation:vo-draw 420ms ease-out forwards;}
@keyframes vo-draw{to{stroke-dashoffset:0;}}

.vo-stripmobile{display:block;border-bottom:1px solid var(--line);background:var(--surf);flex-shrink:0;}
.vo-stripmobile summary{list-style:none;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;font-size:13.5px;font-weight:600;color:var(--muted);cursor:pointer;min-height:44px;}
.vo-stripmobile summary::-webkit-details-marker{display:none;}
.vo-stripmobile[open] summary{color:var(--ink);}
.vo-stripmobile .vo-checklist{padding:0 12px 12px;}

.vo-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;}
.vo-top{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;flex-shrink:0;}
.vo-exit{font-size:13px;font-weight:500;color:var(--muted);text-decoration:none;padding:8px;border-radius:8px;}
.vo-exit:hover{color:var(--ink);}

.vo-hubwrap{flex:1;overflow-y:auto;padding:8px 24px 32px;max-width:680px;margin:0 auto;width:100%;}
.vo-hub-h{font-family:var(--serif);font-size:28px;font-weight:700;letter-spacing:-.02em;margin:8px 0 8px;}
.vo-hub-sub{font-size:15px;color:var(--muted);line-height:1.5;margin:0 0 16px;max-width:520px;}
.vo-hub-progress{font-size:13px;font-weight:600;color:var(--pd);margin:0 0 8px;}
.vo-hub-preview{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--pd);text-decoration:none;padding:6px 0;margin:0 0 16px;min-height:44px;}
.vo-hub-preview:hover{color:var(--p);text-decoration:underline;}
.vo-hub-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.vo-hub-card{display:flex;align-items:flex-start;gap:12px;text-align:left;background:var(--surf);border:1px solid var(--line);border-radius:16px;padding:20px;cursor:pointer;box-shadow:var(--shadow);transition:transform 150ms ease,box-shadow 150ms ease,border-color var(--spec-duration-reveal,220ms) var(--spec-ease,ease),background var(--spec-duration-reveal,220ms) var(--spec-ease,ease);}
.vo-hub-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,58,237,.1);}
.vo-hub-card.done{border-color:rgba(47,158,106,.35);background:#F5FBF8;}
.vo-hub-card-icon{width:40px;height:40px;border-radius:12px;background:var(--bg);color:var(--ink);display:grid;place-items:center;flex-shrink:0;}
.vo-hub-card-body{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;}
.vo-hub-card-body b{font-size:15px;font-weight:700;}
.vo-hub-card-blurb{font-size:12.5px;color:var(--muted);line-height:1.4;}
.vo-hub-card-status{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--muted2);margin-top:4px;}
.vo-hub-card-status.done{color:var(--green);}
.vo-hub-card-chevron{color:var(--muted2);flex-shrink:0;margin-top:2px;}

.vo-sectionhead{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 20px 8px;flex-shrink:0;flex-wrap:wrap;}
.vo-overview-link{background:none;border:none;font-family:var(--sans);font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;padding:8px 4px;min-height:44px;}
.vo-overview-link:hover{color:var(--pd);}
.vo-dots{display:flex;gap:6px;}
.vo-dot{flex:1;max-width:40px;height:4px;border-radius:99px;background:var(--line);transition:background var(--spec-duration-reveal,220ms) var(--spec-ease,ease),opacity var(--spec-duration-reveal,220ms) var(--spec-ease,ease);}
.vo-dot.done{background:var(--p);opacity:.5;}
.vo-dot.current{background:var(--p);}
.vo-cardicon{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:var(--pbg);color:var(--pd);margin-bottom:14px;flex-shrink:0;}

.vo-viewport{flex:1;min-height:0;display:flex;overflow:hidden;padding:0 20px;}
.vo-card{flex:1;min-height:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;max-width:520px;margin:0 auto;width:100%;overflow-y:auto;padding:16px 0;}
.vo-card:has(.vo-proofeditor){justify-content:flex-start;}
.vo-in-fwd{animation:voInFwd 200ms cubic-bezier(0,0,.2,1);}
.vo-in-back{animation:voInBack 200ms cubic-bezier(0,0,.2,1);}
@keyframes voInFwd{from{opacity:0;transform:translateX(24px);}to{opacity:1;transform:translateX(0);}}
@keyframes voInBack{from{opacity:0;transform:translateX(-24px);}to{opacity:1;transform:translateX(0);}}
.vo-h{font-family:var(--serif);font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1.2;margin:0 0 8px;}
.vo-h2{font-family:var(--sans);font-size:15px;font-weight:700;color:var(--ink);margin:28px 0 8px;}
.vo-sub{font-size:15px;font-weight:400;color:var(--muted);line-height:1.5;margin:0 0 24px;max-width:440px;}
.vo-fields{display:flex;flex-direction:column;gap:16px;width:100%;margin-top:8px;}
.vo-field{display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:600;color:var(--muted);width:100%;}
.vo-field input{font-family:var(--sans);padding:14px 16px;border-radius:12px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:16px;font-weight:400;outline:none;min-height:48px;width:100%;}
.vo-field input:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vo-bigfield{font-family:var(--sans);width:100%;padding:16px;border-radius:12px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:16px;font-weight:400;outline:none;margin-top:8px;resize:none;}
.vo-bigfield::placeholder{color:var(--muted2);}
.vo-bigfield:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vo-textarea{line-height:1.6;}
.vo-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
.vo-chip{font-family:var(--sans);display:inline-flex;align-items:center;gap:6px;padding:11px 16px;min-height:44px;border-radius:99px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:14px;font-weight:400;cursor:pointer;transition:transform var(--spec-duration-fast,150ms) var(--spec-ease,ease),border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vo-chip:hover{border-color:var(--p);}
.vo-chip:active{transform:scale(.96);}
.vo-chip.on{background:var(--pbg);border-color:var(--p);color:var(--pd);font-weight:600;animation:voChipIn var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vo-chip-check{color:var(--p);flex-shrink:0;}
@keyframes voChipIn{from{opacity:.4;transform:scale(.92);}to{opacity:1;transform:scale(1);}}
.vo-addown{display:flex;gap:8px;margin-top:16px;}
.vo-addown input{flex:1;font-family:var(--sans);padding:12px 14px;min-height:44px;border-radius:10px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:14px;outline:none;}
.vo-addown input:focus{border-color:var(--p);}
.vo-textbtn{font-family:var(--sans);background:none;border:1px solid var(--line);color:var(--pd);font-size:13px;font-weight:600;padding:11px 16px;min-height:44px;border-radius:10px;cursor:pointer;}
.vo-textbtn:hover{border-color:var(--p);background:var(--pbg);}
.vo-textbtn.sm{padding:6px 12px;min-height:32px;font-size:12px;}
.vo-textbtn:disabled{opacity:.5;cursor:default;}
.vo-logobox{width:96px;height:96px;border-radius:20px;border:1px solid var(--line);background:var(--surf);display:grid;place-items:center;overflow:hidden;color:var(--muted2);margin-bottom:20px;}
.vo-logobox img{width:100%;height:100%;object-fit:contain;}
.vo-filebtn{position:relative;overflow:hidden;display:inline-block;font-family:var(--sans);background:var(--surf);border:1px solid var(--line);color:var(--ink);font-size:14px;font-weight:600;padding:12px 20px;min-height:48px;border-radius:12px;cursor:pointer;margin-bottom:10px;}
.vo-filebtn:hover{border-color:var(--p);}
.vo-filebtn input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0;}
.vo-catwrap{width:100%;margin-top:4px;}
.vo-iconcards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;width:100%;}
.vo-iconcard{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:16px;min-height:88px;border-radius:14px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-family:var(--sans);font-size:13.5px;font-weight:600;text-align:left;cursor:pointer;transition:transform var(--spec-duration-fast,150ms) var(--spec-ease,ease),border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vo-iconcard:hover{border-color:var(--p);}
.vo-iconcard:active{transform:scale(.97);}
.vo-iconcard.on{background:var(--pbg);border-color:var(--p);color:var(--pd);animation:voChipIn var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vo-iconcard-icon{width:36px;height:36px;border-radius:10px;background:var(--bg);color:var(--ink);display:grid;place-items:center;}
.vo-iconcard.on .vo-iconcard-icon{background:#fff;color:var(--p);}
.vo-iconcard-label{line-height:1.3;}
.vo-iconcard-check{position:absolute;top:10px;right:10px;width:18px;height:18px;color:var(--p);display:grid;place-items:center;}

.vo-catpicker{width:100%;}
.vo-catchips{margin-bottom:4px;}
.vo-catsearch-row{position:relative;display:flex;align-items:center;margin-top:8px;}
.vo-catsearch-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted2);pointer-events:none;}
.vo-catsearch-input{width:100%;font-family:var(--sans);padding:13px 16px 13px 40px;min-height:48px;border-radius:12px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:16px;outline:none;}
.vo-catsearch-input:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vo-catsuggest{margin-top:8px;}
.vo-catsuglist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surf);}
.vo-catsugbtn{width:100%;display:flex;align-items:center;gap:8px;font-family:var(--sans);font-size:14px;color:var(--ink);background:none;border:none;text-align:left;padding:12px 14px;min-height:44px;cursor:pointer;}
.vo-catsugbtn:hover,.vo-catsugbtn:focus-visible{background:var(--bg);}
.vo-catsugbtn svg{color:var(--p);flex-shrink:0;}
.vo-catnoresults{font-size:13.5px;color:var(--muted);padding:10px 2px;margin:0;}
.vo-catpopular{margin-top:20px;}
.vo-catpopular-h{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted2);margin:0 0 8px;}

.vo-proofeditor{width:100%;display:flex;flex-direction:column;gap:10px;padding-bottom:8px;}
.vo-proof-intro{font-size:13.5px;color:var(--muted);line-height:1.5;margin:-10px 0 2px;}
.vo-prooferror{font-size:13px;color:#9E302B;background:#FBEDEC;border:1px solid rgba(206,75,67,.25);padding:10px 12px;border-radius:10px;margin:0;}
.vo-proofgroup{width:100%;border:1px solid var(--line);border-radius:14px;background:var(--surf);overflow:hidden;}
.vo-proofgroup summary{list-style:none;display:grid;grid-template-columns:40px minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:15px;cursor:pointer;min-height:76px;transition:background 140ms ease,border-color 140ms ease;}
.vo-proofgroup summary::-webkit-details-marker{display:none;}
.vo-proofgroup summary:hover{background:var(--bg);}
.vo-proofgroup[open] summary{border-bottom:1px solid var(--line);background:var(--bg);}
.vo-proofgroup-icon{width:40px;height:40px;border-radius:11px;background:var(--pbg);color:var(--pd);display:grid;place-items:center;}
.vo-proofgroup-copy{display:flex;flex-direction:column;gap:3px;min-width:0;}
.vo-proofgroup-copy b{font-size:14px;font-weight:700;}
.vo-proofgroup-copy span{font-size:12.5px;line-height:1.4;color:var(--muted);max-width:390px;}
.vo-proofgroup-count{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;}
.vo-proofgroup-chevron{color:var(--muted2);transition:transform 200ms cubic-bezier(.2,.8,.2,1);}
.vo-proofgroup[open] .vo-proofgroup-chevron{transform:rotate(180deg);}
.vo-proofgroup-content{padding:16px;display:flex;flex-direction:column;gap:16px;}
.vo-proofrecords,.vo-proofphotos{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.vo-proofrecords li{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border-radius:10px;background:var(--bg);}
.vo-proofrecord-mark{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#E9F7F0;color:var(--green);flex-shrink:0;}
.vo-proofrecord-copy{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;}
.vo-proofrecord-copy b{font-size:13.5px;}
.vo-proofrecord-copy span{font-size:12px;line-height:1.45;color:var(--muted);overflow:hidden;text-overflow:ellipsis;}
.vo-proofrecord-copy a{font-size:12px;font-weight:600;color:var(--pd);margin-top:2px;}
.vo-remove{background:none;border:none;color:var(--muted);font-family:var(--sans);font-size:12px;font-weight:600;padding:6px;border-radius:8px;cursor:pointer;flex-shrink:0;}
.vo-remove:hover{color:#9E302B;background:#FBEDEC;}
.vo-proof-form{display:flex;flex-direction:column;gap:13px;padding-top:15px;border-top:1px solid var(--line);}
.vo-proof-formhead{display:flex;align-items:baseline;justify-content:space-between;gap:12px;}
.vo-proof-formhead b{font-size:14px;}
.vo-proof-formhead span{font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums;}
.vo-proof-form textarea{font-family:var(--sans);padding:12px 14px;border-radius:10px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:14px;line-height:1.5;resize:vertical;outline:none;}
.vo-proof-form textarea:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vo-proof-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.vo-proof-file{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:600;color:var(--muted);}
.vo-proof-file input{font-family:var(--sans);font-size:13px;color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--surf);}
.vo-proof-file input::file-selector-button{font-family:var(--sans);font-weight:600;color:var(--pd);background:var(--pbg);border:0;border-radius:8px;padding:8px 10px;margin-right:10px;cursor:pointer;}
.vo-proof-file small{font-size:11.5px;font-weight:400;color:var(--muted2);}
.vo-proofphotos li{display:grid;grid-template-columns:56px minmax(0,1fr) auto;align-items:center;gap:10px;padding:8px;border-radius:10px;background:var(--bg);font-size:12.5px;color:var(--muted);}
.vo-proofphoto{width:56px;aspect-ratio:1;border-radius:9px;overflow:hidden;background:var(--surf);display:grid;place-items:center;color:var(--muted2);}
.vo-proofphoto img{width:100%;height:100%;object-fit:cover;}
.vo-summarylist{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:8px;width:100%;}
.vo-summarylist li{font-size:14px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--surf);}
.vo-videorow{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.vo-videorow a{color:var(--ink);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.vo-videorow a:hover{color:var(--pd);}
.vo-summaryempty{font-size:14px;color:var(--muted);margin:0 0 16px;}
.vo-deeplink{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:600;color:var(--pd);text-decoration:none;padding:4px 0;min-height:44px;}
.vo-deeplink:hover{color:var(--p);}
.vo-photogrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:100%;margin-bottom:16px;}
.vo-photothumb{aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--bg);border:1px solid var(--line);}
.vo-photothumb img{width:100%;height:100%;object-fit:cover;}
.vo-videoform{display:flex;flex-direction:column;gap:8px;width:100%;margin-bottom:16px;}
.vo-videoform input{font-family:var(--sans);padding:12px 14px;min-height:44px;border-radius:10px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:14px;outline:none;}
.vo-videoform input:focus{border-color:var(--p);}

.vo-statrow{display:flex;gap:24px;flex-wrap:wrap;margin-top:8px;}
.vo-stat{display:flex;flex-direction:column;gap:2px;}
.vo-stat-value{font-family:var(--serif);font-size:32px;font-weight:700;color:var(--ink);line-height:1;}
.vo-stat-label{font-size:12.5px;color:var(--muted);font-weight:500;}

.vo-table-wrap{width:100%;overflow-x:auto;border:1px solid var(--line);border-radius:14px;margin-bottom:16px;}
.vo-table{width:100%;border-collapse:collapse;font-size:13.5px;}
.vo-table tr+tr th,.vo-table tr+tr td{border-top:1px solid var(--line);}
.vo-table th{text-align:left;font-weight:700;color:var(--ink);padding:14px 16px;white-space:nowrap;vertical-align:top;width:38%;background:var(--bg);}
.vo-table td{padding:14px 16px;color:var(--muted);line-height:1.55;vertical-align:top;}
.vo-terms-disclaimer{font-size:12px;color:var(--muted2);line-height:1.6;margin:0 0 20px;}
.vo-terms-disclaimer a{color:var(--pd);}
.vo-reassure-main{font-size:14px;font-weight:600;color:var(--ink);margin:0 0 4px;}
.vo-reassure-sub{font-size:12.5px;color:var(--muted);margin:0 0 20px;line-height:1.5;}
.vo-checkboxrow{display:flex;align-items:flex-start;gap:10px;font-size:14px;font-weight:600;color:var(--ink);padding:8px 0;cursor:pointer;min-height:44px;}
.vo-checkboxrow input{width:20px;height:20px;flex-shrink:0;margin-top:1px;accent-color:var(--p);}
.vo-activate{margin-top:16px;width:100%;}
.vo-accepted{display:flex;gap:12px;align-items:flex-start;background:#E9F7F0;border:1px solid rgba(47,158,106,.3);border-radius:14px;padding:16px 18px;}
.vo-accepted p{margin:0 0 4px;font-size:13.5px;color:#1F7A54;line-height:1.5;}
.vo-previewbtn{margin-top:16px;gap:8px;}

.vo-foot{flex-shrink:0;padding:16px 20px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:rgba(248,247,251,.92);backdrop-filter:blur(16px);}
.vo-error{color:#CE4B43;font-size:13px;margin:0 0 10px;text-align:center;}
.vo-ctarow{display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:520px;margin:0 auto;}
.vo-back{font-family:var(--sans);background:none;border:none;color:var(--muted);font-size:14px;font-weight:600;padding:14px 12px;min-height:48px;border-radius:10px;cursor:pointer;transition:color 150ms ease,transform 100ms ease;}
.vo-back:hover{color:var(--ink);}
.vo-back:active{transform:scale(.98);}
.vo-savedflash{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:var(--green);opacity:0;transition:opacity 200ms ease-out;flex-shrink:0;}
.vo-savedflash.show{opacity:1;}
.vo-btn{font-family:var(--sans);border:none;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;border-radius:12px;padding:14px 28px;min-height:48px;min-width:112px;background:var(--p);color:#fff;box-shadow:var(--shadow);transition:background 150ms ease;}
.vo-btn:hover{background:var(--pd);}
.vo-btn:active{transform:scale(.98);}
.vo-btn:disabled{opacity:.45;cursor:default;}

@media(min-width:900px){.vo-sidebar{display:flex;}.vo-stripmobile{display:none;}}
@media(max-width:480px){.vo-h{font-size:24px;}.vo-hub-h{font-size:24px;}.vo-hub-grid{grid-template-columns:1fr;}.vo-top{padding:14px 16px;}.vo-sectionhead{padding:0 16px 8px;}.vo-viewport{padding:0 16px;}.vo-foot{padding:14px 16px calc(14px + env(safe-area-inset-bottom));}.vo-hubwrap{padding:8px 16px 24px;}.vo-photogrid{grid-template-columns:repeat(3,1fr);}.vo-proofgroup summary{grid-template-columns:36px minmax(0,1fr) auto;padding:13px;}.vo-proofgroup-icon{width:36px;height:36px;}.vo-proofgroup-count{display:none;}.vo-proofgroup-copy span{font-size:12px;}.vo-proofgroup-content{padding:13px;}.vo-proof-two{grid-template-columns:1fr;}.vo-proofphotos li{grid-template-columns:48px minmax(0,1fr) auto;}.vo-proofphoto{width:48px;}}
`;

