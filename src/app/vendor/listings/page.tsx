'use client';

// Vendor Seller Central: create/edit product & service listings with
// structured fields, image upload, and draft→publish control. Everything is
// scoped to the signed-in vendor.
//
// Split-view product manager (2026-07-30): the list (left) and the editor
// (right) render side by side on desktop; on mobile the editor opens as a
// full-screen sheet. This is a RE-LAYOUT of the presentation only — every
// field, handler, API call, and the localStorage autosave keys are the exact
// same ones the form-first version used. See workplace/design/references/
// listings-manager-splitview-2026-07-30.webp for the layout inspiration
// (styling is NXT//LINK's own violet system, not the reference's blue).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import {
  Search, Plus, ArrowLeft, ExternalLink, Package, Wrench, ImageOff, Check,
  Tag, FileText, Pen, CalendarClock, RefreshCw, ImagePlus,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { scoreListing } from '@/lib/marketplace/completeness';
import { pilotEntriesOf, customFieldsOf, type PilotEntry, type CustomField } from '@/lib/marketplace/types';
import { autosaveKey, serializeAutosave, parseAutosave, isAutosaveWorthKeeping, mergeWithDefaults, sanitizeRestoredListingArrays } from '@/lib/vendor/listing-autosave';
import ChipTagInput from '@/components/marketplace/ChipTagInput';
import CategoryChipPicker from '@/components/vendor/CategoryChipPicker';
import VendorNav from '@/components/VendorNav';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';

// Photo -> AI draft: 1-4 product photos per extraction, mirrors the server
// cap in src/app/api/vendor/listings/extract/route.ts (MAX_IMAGES/
// MAX_IMAGE_BYTES/MAX_TOTAL_IMAGE_BYTES — keep these four in sync with that
// file). Sized against Vercel's fixed ~4.5 MB serverless request-body limit,
// not the 8 MB the listing-media route allows for an already-attached image.
const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_PHOTO_BYTES = 4 * 1024 * 1024;
// Client-side downscale target before upload (see resizeImageForUpload) —
// keeps typical 12MP+ phone photos comfortably under the caps above without
// the vendor having to think about it, and cuts the Gemini bill.
const MAX_PHOTO_EDGE_PX = 1600;
const RESIZE_JPEG_QUALITY = 0.85;

// Vendor-flexibility caps (2026-07-23) — soft client-side guards that mirror
// the hard caps enforced server-side in normalizeListingInput/cleanBlock
// (src/lib/marketplace/types.ts). The API is the real authority; these just
// keep the UI from letting a vendor build something the server will trim.
const PILOT_MAX = 8;
const CUSTOM_MAX = 20;

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): visual/CSS
// only — every handler and state above is unchanged.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-vlistings',
  display: 'swap',
});

type Kind = 'product' | 'service';
interface Listing {
  id: string; public_ref: string; name: string; category: string; overview: string | null;
  best_for: string[]; industries: string[]; image_paths: string[]; status: string;
  use_cases?: string[]; specs?: Record<string, string>; availability?: string[]; lead_time?: string | null;
  service_areas?: string[]; response_time?: string | null; process?: string[]; certifications?: string[];
  pricing_model?: string | null; emergency_available?: boolean;
  pilot?: Record<string, unknown> | null; implementation?: Record<string, unknown> | null;
  warranty_support?: Record<string, unknown> | null; pricing?: Record<string, unknown> | null;
}

// Editor form state: everything as strings/booleans, converted on save.
// Category/industries/best_for/use_cases are chip lists now (was comma
// strings) — category still collapses to ONE string on save (persisted shape
// unchanged: category=string, industries/best_for/use_cases=string[]).
// pilots/impl_custom/ws_custom/pr_custom back the new repeatable/extensible
// sections (see toBody/fromListing for the JSONB shape + back-compat read).
interface Form {
  name: string; category: string; overview: string; best_for: string[]; industries: string[];
  use_cases: string[]; specs: string; buy: boolean; rent: boolean; lease: boolean;
  // `quote` (2026-07-30, listing wizard v1): the server's availability enum
  // already accepts 'buy'|'rent'|'lease'|'quote' (see normalizeListingInput
  // in src/lib/marketplace/types.ts) -- no old UI ever set it, the wizard's
  // "Request a quote" pricing card is the first writer. Existing edit panel
  // never renders a control for this field, so old-panel behavior/output is
  // unchanged (quote always stays false there).
  quote: boolean; lead_time: string;
  service_areas: string; response_time: string; process: string; certifications: string;
  pricing_model: string; emergency_available: boolean;
  pilot_available: boolean; pilots: PilotEntry[];
  impl_requirements: string; impl_timeline: string; impl_training: string; impl_custom: CustomField[];
  ws_warranty: string; ws_channels: string; ws_sla: string; ws_custom: CustomField[];
  pr_model: string; pr_range: string; pr_notes: string; pr_custom: CustomField[];
}
const EMPTY: Form = {
  name: '', category: '', overview: '', best_for: [], industries: [],
  use_cases: [], specs: '', buy: false, rent: false, lease: false, quote: false, lead_time: '',
  service_areas: '', response_time: '', process: '', certifications: '',
  pricing_model: '', emergency_available: false,
  pilot_available: false, pilots: [],
  impl_requirements: '', impl_timeline: '', impl_training: '', impl_custom: [],
  ws_warranty: '', ws_channels: '', ws_sla: '', ws_custom: [],
  pr_model: '', pr_range: '', pr_notes: '', pr_custom: [],
};

const csv = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const join = (v: unknown) => (Array.isArray(v) ? v.join(', ') : '');
const joinL = (v: unknown) => (Array.isArray(v) ? v.join('\n') : '');
const gs = (o: Record<string, unknown> | null | undefined, k: string) => (o && typeof o[k] === 'string' ? (o[k] as string) : '');

/** Best-effort client-side downscale before upload: shrinks the longest edge
 * to MAX_PHOTO_EDGE_PX and re-encodes as JPEG at RESIZE_JPEG_QUALITY. Keeps
 * typical multi-MB phone-camera photos comfortably under the server's
 * per-photo/combined caps (and Vercel's fixed request-body limit) without
 * the vendor having to think about it, and cuts the Gemini bill. Never
 * throws: on any failure (older browser without createImageBitmap/canvas
 * support, decode failure, etc.) or when the photo is already small enough,
 * it falls back to returning the ORIGINAL file untouched — resizing is a
 * pure optimization, never a requirement for the upload to work. */
async function resizeImageForUpload(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    if (longestEdge <= MAX_PHOTO_EDGE_PX) { bitmap.close?.(); return file; }
    const scale = MAX_PHOTO_EDGE_PX / longestEdge;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close?.(); return file; }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', RESIZE_JPEG_QUALITY));
    if (!blob) return file;
    const resizedName = file.name.replace(/\.[^./\\]+$/, '') + '.jpg';
    return new File([blob], resizedName, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

// EN/ES dictionary — same shared LanguageToggle/useLang pattern as
// /vendor/leads (nxt_lang in localStorage). This page had no lang mechanism
// at all before; every vendor-visible string below now goes through `t`.
const T: Record<Lang, Record<string, string>> = {
  en: {
    loading: 'Loading…', signInTitle: 'Sign in to manage your listings', goToSignIn: 'Go to sign in →',
    couldNotExtract: 'Could not extract', giveNameFirst: 'Give the listing a name first.',
    couldNotSave: 'Could not save', savedMsg: 'Saved. Nothing is public until you review and publish.',
    couldNotPublish: 'Could not publish', publishedMsg: 'Published — it is now live in the marketplace.',
    archiveConfirm: 'Archive this listing? It will come down from the marketplace immediately.',
    saveListingFirst: 'Save the listing first, then add photos.', photoAdded: 'Photo added.', uploadFailed: 'Upload failed',
    pageTitle: 'Your listings', pageSub: 'What buyers see in the marketplace. Drafts are private until you publish.',
    leadsInboxLink: 'Leads inbox', companyProfileLink: 'Company profile',
    emailWarn: 'Your email is not verified yet — you can build and save listings, but publishing is locked until you click the confirmation link we emailed you.',
    products: 'Products', services: 'Services',
    newProduct: '+ New product', newService: '+ New service',
    noProductsYet: 'No products yet. Create one — AI can draft it from a spec sheet.',
    noServicesYet: 'No services yet. Create one — AI can draft it from a spec sheet.',
    moveUp: 'Move up', moveDown: 'Move down', noCategory: 'No category',
    viewLive: 'View live', edit: 'Edit', unpublish: 'Unpublish', reviewPublish: 'Review & publish', archive: 'Archive',
    completeSuffix: '% complete', nextPrefix: 'Next:',
    formEditProduct: 'Edit product', formEditService: 'Edit service',
    formNewProduct: 'New product', formNewService: 'New service',
    backToListings: '← Back to listings',
    aiFillOptional: 'AI fill (optional)',
    aiFillHint: 'Add product photos, upload a spec sheet / brochure, or paste text — AI drafts the fields below. It never invents: anything missing stays empty. You review before publishing.',
    reading: 'Reading…', uploadDocument: 'Upload document', pasteHint: '…or paste product/service text here', draftFromText: 'Draft from text',
    entryPhotos: 'Add photos (camera/gallery)', entryBrochure: 'Drop a brochure (PDF)', entryDescribe: 'Describe it',
    photoDisclosure: 'Photos are sent to our AI provider to draft your listing — NXT//LINK does not save them.',
    tooManyPhotos: 'Only the first 4 photos were used.',
    photosTooLarge: 'These photos are too large — try fewer or smaller photos.',
    resumeTitle: 'Resume where you left off?', resumeRestore: 'Restore', resumeDiscard: 'Discard',
    nameLabelProduct: 'Product name *', nameLabelService: 'Service name *',
    categoryLabel: 'Category', categoryHint: 'Type your own or pick a suggestion below',
    descriptionLabel: 'Description', descriptionPh: 'What it is, what problem it solves, why it is different.',
    bestForLabel: 'Best for', industriesLabel: 'Industries served', chipHint: 'Type one and press Enter',
    useCasesLabel: 'Use cases', leadTimeLabel: 'Lead time', leadTimePh: 'e.g. 2-4 weeks',
    specsLabel: 'Specifications (one per line, "Name: value")', specsPh: 'Capacity: 5,000 lb\nPower: Electric 48V',
    availabilityLabel: 'Availability:', buy: 'Buy', rent: 'Rent', lease: 'Lease',
    serviceAreasLabel: 'Service areas (comma-separated)', serviceAreasPh: 'El Paso, Juárez, Cross-border',
    responseTimeLabel: 'Response time', responseTimePh: 'e.g. Same day, 24-48 hours',
    processLabel: 'How it works (one step per line)', processPh: 'Site visit and assessment\nWritten quote\nScheduled service',
    certificationsLabel: 'Certifications / licenses (comma-separated)',
    pricingModelLabel: 'Pricing model', pricingModelPh: 'e.g. Monthly contract, Per visit',
    emergencyLabel: '24/7 emergency service available',
    pilotDemoSummary: 'Pilot / demo', pilotAvailableLabel: 'Pilot or demo available',
    durationLabel: 'Duration', durationPh: 'e.g. 30 days', costLabel: 'Cost', costPh: 'e.g. Free, $2,500',
    scopeLabel: 'Scope', scopePh: 'What the pilot covers', remove: 'Remove', addAnotherPilot: '+ Add another pilot or demo',
    implementationSummary: 'Implementation',
    implRequirementsLabel: 'Requirements (comma-separated)', implRequirementsPh: 'WiFi coverage, Dock access',
    implTimelineLabel: 'Typical timeline', implTimelinePh: 'e.g. 2 weeks',
    implTrainingLabel: 'Training included', implTrainingPh: 'e.g. 2-day on-site training',
    warrantySummary: 'Warranty & support', wsWarrantyLabel: 'Warranty', wsWarrantyPh: 'e.g. 2 years parts & labor',
    wsChannelsLabel: 'Support channels (comma-separated)', wsChannelsPh: 'Phone, On-site, Email',
    wsSlaLabel: 'SLA', wsSlaPh: 'e.g. 4-hour response',
    pricingSummary: 'Pricing', prModelLabel: 'Model', prModelPh: 'e.g. Per unit, Subscription',
    prRangeLabel: 'Range shown to buyers', prRangePh: 'e.g. $15k-$40k — or leave empty for "Request quote"',
    prNotesLabel: 'Notes', prNotesPh: 'Financing, volume discounts…',
    fieldNameLabel: 'Field name', fieldValueLabel: 'Value', addField: '+ Add field',
    photosLabel: 'Photos:', addPhoto: 'Add photo (PNG/JPG/WebP)',
    saving: 'Saving…', saveDraft: 'Save draft',
    reviewBeforePublishing: 'Review before publishing',
    reviewHint: 'This is exactly what buyers will see. Check every line — you are responsible for its accuracy.',
    photoAttached: 'Photo attached', noPhoto: 'No photo', bestForPrefix: 'Best for:',
    prevDescription: 'Description', prevIndustries: 'Industries', prevSpecs: 'Specs', listedSuffix: 'listed',
    prevAvailability: 'Availability', prevLeadTime: 'Lead time', prevServiceAreas: 'Service areas',
    prevResponseTime: 'Response time', prevCertifications: 'Certifications', prevPilotDemo: 'Pilot / demo',
    pilotAvailableFallback: 'Available', pilotsListedSuffix: 'pilots / demos listed',
    prevWarranty: 'Warranty', prevPricing: 'Pricing', requestQuoteFallback: 'Request quote',
    prevPhotos: 'Photos', prevDocuments: 'Documents', checking: 'checking…', prevCaseStudies: 'Case studies',
    reviewFooterHint: 'Empty fields simply will not show. AI-drafted content only used what was in your document — anything missing was left blank on purpose.',
    accuracyConfirm: 'I confirm this information is accurate, current, and approved to be displayed on NXT LINK.',
    keepEditing: 'Keep editing', publishing: 'Publishing…', publishToMarketplace: 'Publish to marketplace',
    previewEmptyNote: 'empty — will not display',
    stDraft: 'Draft', stPublished: 'Published', stNeedsReview: 'Needs review', stReady: 'Ready', stUnpublished: 'Unpublished',
    kindProduct: 'product', kindService: 'service',
    // Split-view manager (2026-07-30) — new strings for the list/editor rebuild.
    searchPh: 'Search by name or category…', searchLabel: 'Search listings',
    filterLabel: 'Filter listings', filterAll: 'All', filterLive: 'Live', filterDrafts: 'Drafts',
    newListing: '+ New listing',
    noMatches: 'No listings match your search or filters.',
    emptyTitle: 'No listings yet',
    emptyBody: 'Create your first product or service listing so buyers can find you.',
    chooseKindTitle: 'What are you listing?',
    pickListingHint: 'Select a listing on the left to edit it, or create a new one.',
    tagsAudienceSummary: 'Tags & audience',
    specsLogisticsSummary: 'Specs & lead time',
    serviceDetailsSummary: 'Service details',
    photosSectionLabel: 'Photos',
    draftSavedLocally: 'Draft saved',
    // Listing-creation wizard v1 (2026-07-30) — new strings for the 3-step +
    // review "+ New listing" flow. All flagged in the delivery report.
    wizStepPrefix: 'Step', wizStepOfSuffix: 'of 4',
    wizDotCategory: 'Category', wizDotDetails: 'Details', wizDotPricing: 'Pricing', wizDotReview: 'Review',
    wizBack: 'Back',
    wizCreatingDraft: 'Setting up your draft…',
    wizStep1Title: 'What category is this?',
    wizStep1Why: 'Buyers filter by category to find you.',
    wizPickCategoryToContinue: 'Pick a category to continue.',
    wizChooseCategory: 'Choose category',
    wizStep2Title: 'Add photos & details',
    wizPhotosHint: 'Drag photos here or tap to upload — listings with photos get more quotes.',
    wizShortDescLabel: 'Short description *',
    wizShortDescPh: 'One or two sentences buyers see first.',
    wizShortDescHint: 'Buyers scan this first — aim for under ~200 characters.',
    wizCharsCounted: 'characters',
    wizFillRequiredToContinue: 'Add a name and short description to continue.',
    wizAddDetails: 'Add details',
    wizStep3Title: 'How do you want to sell this?',
    wizStep3Why: 'This sets the price line buyers see and which fields you fill in.',
    wizAvailabilityLabel: 'Availability',
    wizInStock: 'In stock',
    wizMadeToOrder: 'Made to order',
    wizAvailableForService: 'Available for service',
    wizCardFixed: 'Fixed price',
    wizCardQuote: 'Request a quote',
    wizCardRentLease: 'Rent or lease',
    wizCardSubscription: 'Subscription',
    wizPriceLabel: 'Price', wizPricePh: 'e.g. $1,200 or $15k–$40k',
    wizRateLabel: 'Rate', wizRatePh: 'e.g. $500/week',
    wizWhatBuyersKnowLabel: 'What buyers should know (optional)',
    wizWhatBuyersKnowPh: 'Financing, minimum order, typical turnaround…',
    wizRentAvailable: 'Available to rent', wizLeaseAvailable: 'Available to lease',
    wizRentLeaseServiceNote: "Rent/lease isn't tracked for services yet — this just labels your pricing model.",
    wizSubscriptionNote: 'Billing cycle and recurring price aren\'t set up yet — this just tags the listing as a subscription for now.',
    wizChoosePricingToContinue: 'Pick how you sell this to continue.',
    wizSetPricing: 'Set pricing',
    wizPreviewTitle: 'Preview',
    wizPreviewNoCategory: 'No category yet',
  },
  es: {
    loading: 'Cargando…', signInTitle: 'Inicia sesión para administrar tus publicaciones', goToSignIn: 'Ir a iniciar sesión →',
    couldNotExtract: 'No se pudo extraer', giveNameFirst: 'Primero dale un nombre a la publicación.',
    couldNotSave: 'No se pudo guardar', savedMsg: 'Guardado. Nada es público hasta que lo revises y publiques.',
    couldNotPublish: 'No se pudo publicar', publishedMsg: 'Publicado — ahora está en vivo en el marketplace.',
    archiveConfirm: '¿Archivar esta publicación? Se retirará del marketplace de inmediato.',
    saveListingFirst: 'Guarda la publicación primero y luego agrega fotos.', photoAdded: 'Foto agregada.', uploadFailed: 'Error al subir',
    pageTitle: 'Tus publicaciones', pageSub: 'Lo que los compradores ven en el marketplace. Los borradores son privados hasta que publiques.',
    leadsInboxLink: 'Bandeja de leads', companyProfileLink: 'Perfil de la empresa',
    emailWarn: 'Tu correo aún no está verificado — puedes crear y guardar publicaciones, pero la publicación está bloqueada hasta que hagas clic en el enlace de confirmación que te enviamos.',
    products: 'Productos', services: 'Servicios',
    newProduct: '+ Nuevo producto', newService: '+ Nuevo servicio',
    noProductsYet: 'Aún no hay productos. Crea uno — la IA puede redactarlo a partir de una ficha técnica.',
    noServicesYet: 'Aún no hay servicios. Crea uno — la IA puede redactarlo a partir de una ficha técnica.',
    moveUp: 'Subir', moveDown: 'Bajar', noCategory: 'Sin categoría',
    viewLive: 'Ver en vivo', edit: 'Editar', unpublish: 'Despublicar', reviewPublish: 'Revisar y publicar', archive: 'Archivar',
    completeSuffix: '% completo', nextPrefix: 'Siguiente:',
    formEditProduct: 'Editar producto', formEditService: 'Editar servicio',
    formNewProduct: 'Nuevo producto', formNewService: 'Nuevo servicio',
    backToListings: '← Volver a publicaciones',
    aiFillOptional: 'Completar con IA (opcional)',
    aiFillHint: 'Agrega fotos del producto, sube una ficha técnica / folleto, o pega texto — la IA redacta los campos de abajo. Nunca inventa: lo que falta queda vacío. Tú revisas antes de publicar.',
    reading: 'Leyendo…', uploadDocument: 'Subir documento', pasteHint: '…o pega aquí el texto del producto/servicio', draftFromText: 'Redactar desde texto',
    entryPhotos: 'Agregar fotos (cámara/galería)', entryBrochure: 'Subir un folleto (PDF)', entryDescribe: 'Descríbelo',
    photoDisclosure: 'Las fotos se envían a nuestro proveedor de IA para redactar tu publicación — NXT//LINK no las guarda.',
    tooManyPhotos: 'Solo se usaron las primeras 4 fotos.',
    photosTooLarge: 'Estas fotos son demasiado grandes — intenta con menos fotos o fotos más pequeñas.',
    resumeTitle: '¿Continuar donde quedaste?', resumeRestore: 'Restaurar', resumeDiscard: 'Descartar',
    nameLabelProduct: 'Nombre del producto *', nameLabelService: 'Nombre del servicio *',
    categoryLabel: 'Categoría', categoryHint: 'Escribe la tuya o elige una sugerencia abajo',
    descriptionLabel: 'Descripción', descriptionPh: 'Qué es, qué problema resuelve, por qué es diferente.',
    bestForLabel: 'Ideal para', industriesLabel: 'Industrias atendidas', chipHint: 'Escribe uno y presiona Enter',
    useCasesLabel: 'Casos de uso', leadTimeLabel: 'Plazo de entrega', leadTimePh: 'ej. 2-4 semanas',
    specsLabel: 'Especificaciones (una por línea, "Nombre: valor")', specsPh: 'Capacidad: 5,000 lb\nEnergía: Eléctrico 48V',
    availabilityLabel: 'Disponibilidad:', buy: 'Comprar', rent: 'Rentar', lease: 'Arrendar',
    serviceAreasLabel: 'Áreas de servicio (separadas por comas)', serviceAreasPh: 'El Paso, Juárez, transfronterizo',
    responseTimeLabel: 'Tiempo de respuesta', responseTimePh: 'ej. Mismo día, 24-48 horas',
    processLabel: 'Cómo funciona (un paso por línea)', processPh: 'Visita al sitio y evaluación\nCotización por escrito\nServicio programado',
    certificationsLabel: 'Certificaciones / licencias (separadas por comas)',
    pricingModelLabel: 'Modelo de precios', pricingModelPh: 'ej. Contrato mensual, Por visita',
    emergencyLabel: 'Servicio de emergencia 24/7 disponible',
    pilotDemoSummary: 'Piloto / demo', pilotAvailableLabel: 'Piloto o demo disponible',
    durationLabel: 'Duración', durationPh: 'ej. 30 días', costLabel: 'Costo', costPh: 'ej. Gratis, $2,500',
    scopeLabel: 'Alcance', scopePh: 'Qué cubre el piloto', remove: 'Quitar', addAnotherPilot: '+ Agregar otro piloto o demo',
    implementationSummary: 'Implementación',
    implRequirementsLabel: 'Requisitos (separados por comas)', implRequirementsPh: 'Cobertura WiFi, Acceso a andén',
    implTimelineLabel: 'Plazo típico', implTimelinePh: 'ej. 2 semanas',
    implTrainingLabel: 'Capacitación incluida', implTrainingPh: 'ej. 2 días de capacitación en sitio',
    warrantySummary: 'Garantía y soporte', wsWarrantyLabel: 'Garantía', wsWarrantyPh: 'ej. 2 años de piezas y mano de obra',
    wsChannelsLabel: 'Canales de soporte (separados por comas)', wsChannelsPh: 'Teléfono, En sitio, Correo',
    wsSlaLabel: 'SLA', wsSlaPh: 'ej. Respuesta en 4 horas',
    pricingSummary: 'Precios', prModelLabel: 'Modelo', prModelPh: 'ej. Por unidad, Suscripción',
    prRangeLabel: 'Rango mostrado a compradores', prRangePh: 'ej. $15k-$40k — o deja vacío para "Solicitar cotización"',
    prNotesLabel: 'Notas', prNotesPh: 'Financiamiento, descuentos por volumen…',
    fieldNameLabel: 'Nombre del campo', fieldValueLabel: 'Valor', addField: '+ Agregar campo',
    photosLabel: 'Fotos:', addPhoto: 'Agregar foto (PNG/JPG/WebP)',
    saving: 'Guardando…', saveDraft: 'Guardar borrador',
    reviewBeforePublishing: 'Revisar antes de publicar',
    reviewHint: 'Esto es exactamente lo que verán los compradores. Revisa cada línea — eres responsable de su exactitud.',
    photoAttached: 'Foto adjunta', noPhoto: 'Sin foto', bestForPrefix: 'Ideal para:',
    prevDescription: 'Descripción', prevIndustries: 'Industrias', prevSpecs: 'Especificaciones', listedSuffix: 'agregadas',
    prevAvailability: 'Disponibilidad', prevLeadTime: 'Plazo de entrega', prevServiceAreas: 'Áreas de servicio',
    prevResponseTime: 'Tiempo de respuesta', prevCertifications: 'Certificaciones', prevPilotDemo: 'Piloto / demo',
    pilotAvailableFallback: 'Disponible', pilotsListedSuffix: 'pilotos / demos registrados',
    prevWarranty: 'Garantía', prevPricing: 'Precios', requestQuoteFallback: 'Solicitar cotización',
    prevPhotos: 'Fotos', prevDocuments: 'Documentos', checking: 'verificando…', prevCaseStudies: 'Casos de éxito',
    reviewFooterHint: 'Los campos vacíos simplemente no se mostrarán. El contenido redactado por IA solo usó lo que había en tu documento — lo que faltaba se dejó vacío a propósito.',
    accuracyConfirm: 'Confirmo que esta información es precisa, está actualizada y está aprobada para mostrarse en NXT LINK.',
    keepEditing: 'Seguir editando', publishing: 'Publicando…', publishToMarketplace: 'Publicar en el marketplace',
    previewEmptyNote: 'vacío — no se mostrará',
    stDraft: 'Borrador', stPublished: 'Publicado', stNeedsReview: 'Necesita revisión', stReady: 'Listo', stUnpublished: 'Sin publicar',
    kindProduct: 'producto', kindService: 'servicio',
    // Split-view manager (2026-07-30) — new strings for the list/editor rebuild.
    searchPh: 'Buscar por nombre o categoría…', searchLabel: 'Buscar publicaciones',
    filterLabel: 'Filtrar publicaciones', filterAll: 'Todo', filterLive: 'En vivo', filterDrafts: 'Borradores',
    newListing: '+ Nueva publicación',
    noMatches: 'Ninguna publicación coincide con tu búsqueda o filtros.',
    emptyTitle: 'Aún no tienes publicaciones',
    emptyBody: 'Crea tu primera publicación de producto o servicio para que los compradores puedan encontrarte.',
    chooseKindTitle: '¿Qué vas a publicar?',
    pickListingHint: 'Selecciona una publicación a la izquierda para editarla, o crea una nueva.',
    tagsAudienceSummary: 'Etiquetas y audiencia',
    specsLogisticsSummary: 'Especificaciones y plazo de entrega',
    serviceDetailsSummary: 'Detalles del servicio',
    photosSectionLabel: 'Fotos',
    draftSavedLocally: 'Borrador guardado',
    // Listing-creation wizard v1 (2026-07-30) — new strings for the 3-step +
    // review "+ New listing" flow. All flagged in the delivery report.
    wizStepPrefix: 'Paso', wizStepOfSuffix: 'de 4',
    wizDotCategory: 'Categoría', wizDotDetails: 'Detalles', wizDotPricing: 'Precio', wizDotReview: 'Revisar',
    wizBack: 'Atrás',
    wizCreatingDraft: 'Preparando tu borrador…',
    wizStep1Title: '¿Qué categoría es esta?',
    wizStep1Why: 'Los compradores filtran por categoría para encontrarte.',
    wizPickCategoryToContinue: 'Elige una categoría para continuar.',
    wizChooseCategory: 'Elegir categoría',
    wizStep2Title: 'Agrega fotos y detalles',
    wizPhotosHint: 'Arrastra fotos aquí o toca para subir — las publicaciones con fotos reciben más cotizaciones.',
    wizShortDescLabel: 'Descripción breve *',
    wizShortDescPh: 'Una o dos oraciones que los compradores ven primero.',
    wizShortDescHint: 'Los compradores leen esto primero — procura menos de ~200 caracteres.',
    wizCharsCounted: 'caracteres',
    wizFillRequiredToContinue: 'Agrega un nombre y una descripción breve para continuar.',
    wizAddDetails: 'Agregar detalles',
    wizStep3Title: '¿Cómo quieres vender esto?',
    wizStep3Why: 'Esto define el precio que ven los compradores y qué campos llenas.',
    wizAvailabilityLabel: 'Disponibilidad',
    wizInStock: 'En existencia',
    wizMadeToOrder: 'Sobre pedido',
    wizAvailableForService: 'Disponible para servicio',
    wizCardFixed: 'Precio fijo',
    wizCardQuote: 'Solicitar cotización',
    wizCardRentLease: 'Rentar o arrendar',
    wizCardSubscription: 'Suscripción',
    wizPriceLabel: 'Precio', wizPricePh: 'ej. $1,200 o $15,000–$40,000',
    wizRateLabel: 'Tarifa', wizRatePh: 'ej. $500/semana',
    wizWhatBuyersKnowLabel: 'Lo que deben saber los compradores (opcional)',
    wizWhatBuyersKnowPh: 'Financiamiento, pedido mínimo, tiempo típico…',
    wizRentAvailable: 'Disponible para rentar', wizLeaseAvailable: 'Disponible para arrendar',
    wizRentLeaseServiceNote: 'Rentar/arrendar aún no aplica a servicios — esto solo etiqueta tu modelo de precios.',
    wizSubscriptionNote: 'El ciclo de facturación y el precio recurrente aún no están configurados — por ahora solo se etiqueta como suscripción.',
    wizChoosePricingToContinue: 'Elige cómo vendes esto para continuar.',
    wizSetPricing: 'Configurar precio',
    wizPreviewTitle: 'Vista previa',
    wizPreviewNoCategory: 'Aún sin categoría',
  },
};

function toBody(kind: Kind, f: Form): Record<string, unknown> {
  const specsObj: Record<string, string> = {};
  for (const ln of lines(f.specs)) {
    const i = ln.indexOf(':');
    if (i > 0) specsObj[ln.slice(0, i).trim()] = ln.slice(i + 1).trim();
  }
  // Repeatable pilots: entry 0 always mirrors onto the legacy top-level
  // duration/cost/scope fields (so anything reading the OLD single-object
  // shape still sees a value); `entries` is only added when there are 2+, so
  // a single-pilot save round-trips as the exact same shape as before this
  // feature — nothing new is written to the 23 existing listings' shape
  // unless a vendor actually adds a second pilot.
  const pilots = f.pilots
    .map((p) => ({ duration: p.duration.trim(), cost: p.cost.trim(), scope: p.scope.trim() }))
    .filter((p) => p.duration || p.cost || p.scope)
    .slice(0, PILOT_MAX);
  const cleanCustom = (list: CustomField[]): CustomField[] => list
    .map((c) => ({ label: c.label.trim(), value: c.value.trim() }))
    .filter((c) => c.label && c.value)
    .slice(0, CUSTOM_MAX);
  const implCustom = cleanCustom(f.impl_custom);
  const wsCustom = cleanCustom(f.ws_custom);
  const prCustom = cleanCustom(f.pr_custom);

  const base: Record<string, unknown> = {
    name: f.name, category: f.category, overview: f.overview,
    best_for: f.best_for, industries: f.industries,
    pilot: {
      available: f.pilot_available,
      duration: pilots[0]?.duration || '', cost: pilots[0]?.cost || '', scope: pilots[0]?.scope || '',
      ...(pilots.length > 1 ? { entries: pilots } : {}),
    },
    implementation: {
      requirements: csv(f.impl_requirements), typical_timeline: f.impl_timeline, training: f.impl_training,
      ...(implCustom.length ? { custom: implCustom } : {}),
    },
    warranty_support: {
      warranty: f.ws_warranty, support_channels: csv(f.ws_channels), sla: f.ws_sla,
      ...(wsCustom.length ? { custom: wsCustom } : {}),
    },
    pricing: {
      model: f.pr_model, range: f.pr_range, buy: f.buy, rent: f.rent, lease: f.lease, notes: f.pr_notes,
      ...(prCustom.length ? { custom: prCustom } : {}),
    },
  };
  if (kind === 'product') {
    return { ...base, use_cases: f.use_cases, specs: specsObj, availability: ['buy', 'rent', 'lease', 'quote'].filter((o) => f[o as 'buy']), lead_time: f.lead_time };
  }
  return { ...base, service_areas: csv(f.service_areas), response_time: f.response_time, process: lines(f.process), certifications: csv(f.certifications), pricing_model: f.pricing_model, emergency_available: f.emergency_available };
}

function fromListing(l: Listing): Form {
  return {
    ...EMPTY,
    name: l.name || '', category: l.category || '', overview: l.overview || '',
    best_for: l.best_for || [], industries: l.industries || [],
    use_cases: l.use_cases || [],
    specs: l.specs ? Object.entries(l.specs).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
    buy: !!l.availability?.includes('buy'), rent: !!l.availability?.includes('rent'), lease: !!l.availability?.includes('lease'),
    quote: !!l.availability?.includes('quote'),
    lead_time: l.lead_time || '',
    service_areas: join(l.service_areas), response_time: l.response_time || '',
    process: joinL(l.process), certifications: join(l.certifications),
    pricing_model: l.pricing_model || '', emergency_available: !!l.emergency_available,
    // Back-compat: pilotEntriesOf/customFieldsOf read BOTH the old
    // single-object shape (the 23 existing listings) and the new
    // entries/custom arrays — the form never needs to know which one it got.
    pilot_available: Boolean(l.pilot?.available), pilots: pilotEntriesOf(l.pilot).slice(0, PILOT_MAX),
    impl_requirements: join(l.implementation?.requirements), impl_timeline: gs(l.implementation, 'typical_timeline'), impl_training: gs(l.implementation, 'training'),
    impl_custom: customFieldsOf(l.implementation),
    ws_warranty: gs(l.warranty_support, 'warranty'), ws_channels: join(l.warranty_support?.support_channels), ws_sla: gs(l.warranty_support, 'sla'),
    ws_custom: customFieldsOf(l.warranty_support),
    pr_model: gs(l.pricing, 'model'), pr_range: gs(l.pricing, 'range'), pr_notes: gs(l.pricing, 'notes'),
    pr_custom: customFieldsOf(l.pricing),
  };
}

export default function VendorListingsPage() {
  const [lang, setLang] = useLang(); // stored `nxt_lang` — shared across marketplace pages
  const t = T[lang];
  const STATUS_LABEL: Record<string, string> = { draft: t.stDraft, published: t.stPublished, needs_review: t.stNeedsReview, ready: t.stReady, unpublished: t.stUnpublished };
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [products, setProducts] = useState<Listing[]>([]);
  const [services, setServices] = useState<Listing[]>([]);
  const [msg, setMsg] = useState('');

  // Editor
  const [editing, setEditing] = useState<{ kind: Kind; id: string | null } | null>(null);
  const [f, setF] = useState<Form>(EMPTY);
  const [docId, setDocId] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [saving, setSaving] = useState(false);

  // Autosave (localStorage only — never sent to the server): protects
  // against losing unsaved work on tab close/refresh. Scoped by the signed-in
  // vendor's own auth id so a shared browser never mixes up two vendors'
  // drafts. See src/lib/vendor/listing-autosave.ts for the serialize/parse
  // logic (unit tested there).
  const [authId, setAuthId] = useState<string | null>(null);
  const [resumeOffer, setResumeOffer] = useState<{ key: string; form: Record<string, unknown> } | null>(null);

  // Review-before-publish
  const [reviewFor, setReviewFor] = useState<{ kind: Kind; listing: Listing } | null>(null);
  const [accOk, setAccOk] = useState(false);
  const [pubBusy, setPubBusy] = useState(false);
  const [pubErr, setPubErr] = useState('');
  const [emailVerified, setEmailVerified] = useState(true);
  const [extras, setExtras] = useState<{ documents: Array<{ id: string; title: string | null; file_name: string }>; case_studies: Array<{ id: string; title: string }> } | null>(null);

  // Split-view manager (2026-07-30): left-list search + filter chips, and the
  // "which kind am I creating" prompt shown in the right panel before a brand
  // new listing has a kind (and therefore an editor) yet. Purely client-side
  // presentation state — none of it is sent to the server or persisted.
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'product' | 'service' | 'live' | 'draft'>('all');
  const [newKindPrompt, setNewKindPrompt] = useState(false);

  // Listing-creation wizard v1 (2026-07-30): "+ New listing" opens this
  // 3-step + review flow instead of the full form below. `wizardStep` is
  // null whenever the wizard isn't active (nothing open, or an EXISTING
  // listing opened via openEdit — that path renders the unchanged full form
  // further down, gated on `!wizardStep`). `pricingChoice` is UI-only state
  // (which of the 4 "how do you want to sell this" cards is selected) — it
  // never gets persisted directly; Step 3 translates it into the existing
  // pricing.model / availability / pricing_model fields on save.
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | null>(null);
  const [pricingChoice, setPricingChoice] = useState<'fixed' | 'quote' | 'rent_lease' | 'subscription' | null>(null);
  const [wizAvailability, setWizAvailability] = useState<'in_stock' | 'made_to_order'>('in_stock');
  const [wizBusy, setWizBusy] = useState(false);

  function openReview(kind: Kind, listing: Listing) {
    setReviewFor({ kind, listing }); setAccOk(false); setPubErr(''); setExtras(null);
    fetch(`/api/vendor/listings/extras?kind=${kind}&id=${listing.id}`)
      .then((r) => r.json()).then((d) => { if (d.ok) setExtras({ documents: d.documents, case_studies: d.case_studies }); })
      .catch(() => {});
  }

  // Review-before-publish modal: dialog semantics + Escape-to-close, mirroring
  // the one reference implementation sitewide (src/app/admin/invites/page.tsx
  // QROverlay) — focus a safe control on open, restore on Escape.
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!reviewFor) return;
    modalCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setReviewFor(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reviewFor]);

  const load = useCallback(async () => {
    const res = await fetch('/api/vendor/listings');
    if (res.status === 401) { setSignedIn(false); setChecking(false); return; }
    const data = await res.json();
    setProducts(data.products || []); setServices(data.services || []);
    setSignedIn(true); setChecking(false);
    fetch('/api/auth/me').then((r) => r.json()).then((me) => {
      if (me?.signed_in) setEmailVerified(Boolean(me.email_verified));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    sb.auth.getSession().then(({ data }) => {
      if (data.session) { setAuthId(data.session.user.id); load(); }
      else setChecking(false);
    });
  }, [load]);

  // Debounced (~1s) autosave of the open editor's form into localStorage.
  // Paused while a resume offer is unanswered so it never overwrites the
  // stashed draft with the blank/loaded form before the vendor decides.
  const [autosaveFlash, setAutosaveFlash] = useState(false);
  useEffect(() => {
    if (!editing || resumeOffer || !authId) return;
    const key = autosaveKey(authId, editing.kind, editing.id);
    const timer = setTimeout(() => {
      try {
        if (isAutosaveWorthKeeping(f as unknown as Record<string, unknown>)) {
          window.localStorage.setItem(key, serializeAutosave(f));
          // UI Standards Addendum (2026-07-30) §2: visible "Saved" flash on
          // autosave. Purely a presentation add-on — the write above, its
          // key, and its timing are exactly what they were before.
          setAutosaveFlash(true);
        }
      } catch { /* storage full/blocked (e.g. private browsing) — best effort only */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [f, editing, authId, resumeOffer]);
  useEffect(() => {
    if (!autosaveFlash) return;
    const timer = setTimeout(() => setAutosaveFlash(false), 1800);
    return () => clearTimeout(timer);
  }, [autosaveFlash]);

  // Suggested chips for Category / Industries come from REAL data: the
  // canonical taxonomy (same source as the public marketplace's category
  // filters) plus whatever this vendor has already typed on their own other
  // listings — never a hardcoded list, and typing a custom value is always
  // allowed on top of these.
  const [taxonomy, setTaxonomy] = useState<{ categories: string[]; industries: string[] } | null>(null);
  // Raw departments (2026-07-30, listing wizard v1) — same response as the
  // flattened `taxonomy` fetch above, just also keeping the department/family
  // structure so the wizard's category step can show a breadcrumb ("Material
  // Handling › Forklifts") for the selected category. Zero extra requests.
  type CatDept = { fg: string; label_en: string; label_es: string; items: Array<{ label_en?: string; label_es?: string; family?: string }> };
  const [catDepartments, setCatDepartments] = useState<CatDept[]>([]);
  useEffect(() => {
    fetch('/api/marketplace/categories').then((r) => r.json()).then((d) => {
      if (!d?.ok) return;
      const categories: string[] = (d.departments || []).flatMap((dep: { items?: Array<{ label_en?: string }> }) => (dep.items || []).map((it) => it.label_en || '')).filter(Boolean);
      setTaxonomy({ categories, industries: d.industries || [] });
      setCatDepartments(d.departments || []);
    }).catch(() => {});
  }, []);
  // Breadcrumb for the wizard's selected category: "Department › Family",
  // falling back gracefully piece by piece when the taxonomy doesn't carry
  // that much structure for a given item (e.g. no family on the row).
  const categoryBreadcrumb = useCallback((label: string, lang2: Lang): string => {
    for (const dep of catDepartments) {
      const item = dep.items.find((it) => it.label_en === label);
      if (!item) continue;
      const depLabel = lang2 === 'es' ? dep.label_es : dep.label_en;
      const family = item.family && item.family !== label ? item.family : '';
      return family ? `${depLabel} › ${family}` : depLabel;
    }
    return '';
  }, [catDepartments]);

  const suggestedCategories = useMemo(() => {
    const mine = [...products, ...services].map((l) => l.category).filter(Boolean) as string[];
    return Array.from(new Set([...(taxonomy?.categories || []), ...mine])).sort((a, b) => a.localeCompare(b));
  }, [taxonomy, products, services]);
  const suggestedIndustries = useMemo(() => {
    const mine = [...products, ...services].flatMap((l) => l.industries || []);
    return Array.from(new Set([...(taxonomy?.industries || []), ...mine])).sort((a, b) => a.localeCompare(b));
  }, [taxonomy, products, services]);
  const suggestedBestFor = useMemo(() => {
    const mine = [...products, ...services].flatMap((l) => l.best_for || []);
    return Array.from(new Set(mine)).sort((a, b) => a.localeCompare(b));
  }, [products, services]);
  const suggestedUseCases = useMemo(() => {
    const mine = [...products, ...services].flatMap((l) => l.use_cases || []);
    return Array.from(new Set(mine)).sort((a, b) => a.localeCompare(b));
  }, [products, services]);

  // Split-view left list: products + services merged into one scannable list.
  // `products`/`services` themselves are untouched (still the two arrays the
  // save/reorder/publish logic reads and writes) — this just tags each row
  // with its kind for combined display, search, and filter-chip purposes.
  const allRows = useMemo(
    () => [
      ...products.map((l) => ({ ...l, kind: 'product' as Kind })),
      ...services.map((l) => ({ ...l, kind: 'service' as Kind })),
    ],
    [products, services],
  );
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((l) => {
      if (filter === 'product' && l.kind !== 'product') return false;
      if (filter === 'service' && l.kind !== 'service') return false;
      if (filter === 'live' && l.status !== 'published') return false;
      if (filter === 'draft' && l.status === 'published') return false;
      if (q && !(l.name.toLowerCase().includes(q) || (l.category || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [allRows, filter, query]);
  // Reorder (move up/down) is always relative to a row's OWN kind array
  // (products or services) — that's the array whose order actually persists
  // via sort_order — never the combined/filtered display list.
  function kindIndexOf(kind: Kind, id: string) {
    return (kind === 'product' ? products : services).findIndex((x) => x.id === id);
  }
  const currentListing = editing?.id ? allRows.find((l) => l.id === editing.id) || null : null;

  // Checks localStorage for a stashed draft matching this exact editor slot
  // (vendor + kind + listing id/'new') and, if one is worth keeping, offers
  // to resume it instead of silently applying it — the vendor chooses.
  function checkResumeOffer(kind: Kind, id: string | null) {
    if (!authId) { setResumeOffer(null); return; }
    try {
      const key = autosaveKey(authId, kind, id);
      const snap = parseAutosave<Record<string, unknown>>(window.localStorage.getItem(key));
      if (snap && isAutosaveWorthKeeping(snap.form)) { setResumeOffer({ key, form: snap.form }); return; }
    } catch { /* localStorage unavailable (private browsing, etc.) */ }
    setResumeOffer(null);
  }
  function applyResumeOffer() {
    if (!resumeOffer) return;
    // Form has no index signature, so it isn't structurally a
    // Record<string, unknown> as far as TS's generic constraint checking is
    // concerned — the cast is safe because mergeWithDefaults only ever reads
    // `defaults`' own keys off `stored` and returns the same shape as
    // `defaults` (never adds/removes keys).
    const merged = mergeWithDefaults(EMPTY as unknown as Record<string, unknown>, resumeOffer.form) as unknown as Form;
    // mergeWithDefaults only checks Array.isArray at the field level — a
    // crafted/corrupt localStorage entry like `pilots:[null]` would sail
    // straight through and crash the render (p.duration on null). Route the
    // four vendor-extensible array fields through the same element-level
    // sanitizers fromListing() already trusts for untrusted DB data.
    const restored = sanitizeRestoredListingArrays(merged, PILOT_MAX, CUSTOM_MAX);
    setF(restored);
    setResumeOffer(null);
  }
  function discardResumeOffer() {
    if (!resumeOffer) return;
    try { window.localStorage.removeItem(resumeOffer.key); } catch { /* best effort */ }
    setResumeOffer(null);
  }

  function openNew(kind: Kind) { setNewKindPrompt(false); setEditing({ kind, id: null }); setF(EMPTY); setDocId(null); setAiSummary(''); setPasteText(''); setShowPaste(false); setMsg(''); checkResumeOffer(kind, null); }
  function openEdit(kind: Kind, l: Listing) { setNewKindPrompt(false); setWizardStep(null); setEditing({ kind, id: l.id }); setF(fromListing(l)); setDocId(null); setAiSummary(''); setPasteText(''); setShowPaste(false); setMsg(''); checkResumeOffer(kind, l.id); }

  // Listing-creation wizard v1 (2026-07-30): what the "+ New product" /
  // "+ New service" buttons call now, instead of openNew() directly. Reuses
  // openNew for all the existing reset/resume-offer plumbing, then layers
  // the wizard's own step/pricing-choice state on top.
  function openWizard(kind: Kind) {
    openNew(kind);
    setWizardStep(1);
    setPricingChoice(null);
    setWizAvailability('in_stock');
  }
  function wizExit() { setEditing(null); setWizardStep(null); setMsg(''); }
  function wizBackStep() {
    if (wizardStep === 1 || wizardStep === null) { wizExit(); setNewKindPrompt(true); return; }
    if (wizardStep === 4) setReviewFor(null);
    setWizardStep((wizardStep - 1) as 1 | 2 | 3);
  }
  // Step 1 → 2: category is picked, but nothing is saved to the server yet
  // (no id => photo upload, which needs one, isn't possible). Silently
  // create the draft here using the category as a placeholder name — the
  // vendor's own selection, never invented text — so Step 2's photo zone is
  // usable immediately. The Title field in Step 2 pre-fills with the same
  // value and the vendor is expected to overwrite it with the real name.
  async function wizContinueFromCategory() {
    if (!f.category || !editing) return;
    if (editing.id) { setWizardStep(2); return; }
    setWizBusy(true);
    const placeholderName = f.name.trim() || f.category;
    const saved = await save({ name: placeholderName });
    setWizBusy(false);
    if (!saved) return;
    setF((prev) => ({ ...prev, name: placeholderName }));
    setWizardStep(2);
  }
  async function wizContinueFromDetails() {
    if (!f.name.trim() || !f.overview.trim() || !editing) return;
    setWizBusy(true);
    const saved = await save();
    setWizBusy(false);
    if (saved) setWizardStep(3);
  }
  // Step 3 → 4: translate the selected pricing card into the existing
  // pricing.model / availability / pricing_model fields (never a new
  // column), save, then reuse the EXACT existing review-before-publish
  // state (reviewFor/accOk/pubBusy/pubErr/publishNow) the old panel already
  // uses — Step 4 just renders it inline instead of as a modal.
  async function wizContinueFromPricing() {
    if (!pricingChoice || !editing) return;
    const cardLabel = {
      fixed: t.wizCardFixed, quote: t.wizCardQuote, rent_lease: t.wizCardRentLease, subscription: t.wizCardSubscription,
    }[pricingChoice];
    const overrides: Partial<Form> = { pr_model: cardLabel };
    if (editing.kind === 'product') {
      overrides.buy = pricingChoice === 'fixed';
      overrides.quote = pricingChoice === 'quote';
      overrides.rent = pricingChoice === 'rent_lease' ? f.rent : false;
      overrides.lease = pricingChoice === 'rent_lease' ? f.lease : false;
    } else {
      overrides.pricing_model = cardLabel;
    }
    setWizBusy(true);
    const saved = await save(overrides);
    setWizBusy(false);
    if (saved && editing) { setF((prev) => ({ ...prev, ...overrides })); openReview(editing.kind, saved); setWizardStep(4); }
  }

  function mergeDraft(draft: Record<string, unknown>) {
    const d = draft as Partial<Listing> & Record<string, unknown>;
    const m = fromListing({ ...(d as unknown as Listing), id: '', public_ref: '', image_paths: [], status: 'draft' });
    setF((prev) => {
      const next = { ...prev };
      (Object.keys(m) as Array<keyof Form>).forEach((k) => {
        const v = m[k];
        if (typeof v === 'boolean') { if (v) (next[k] as boolean) = true; }
        else if (Array.isArray(v)) {
          // Chip lists (best_for/industries/use_cases) and the pilots/custom
          // field arrays: only fill in from the AI draft when the vendor
          // hasn't already put something there.
          const prevV = prev[k];
          if (v.length > 0 && Array.isArray(prevV) && prevV.length === 0) (next[k] as unknown[]) = v;
        }
        else if (v && !prev[k]) (next[k] as string) = v;
      });
      return next;
    });
  }

  // Repeatable pilot / demo entries.
  function addPilot() {
    setF((prev) => (prev.pilots.length >= PILOT_MAX ? prev : { ...prev, pilots: [...prev.pilots, { duration: '', cost: '', scope: '' }] }));
  }
  function updatePilot(i: number, key: keyof PilotEntry, v: string) {
    setF((prev) => ({ ...prev, pilots: prev.pilots.map((p, j) => (j === i ? { ...p, [key]: v } : p)) }));
  }
  function removePilot(i: number) {
    setF((prev) => ({ ...prev, pilots: prev.pilots.filter((_, j) => j !== i) }));
  }

  // Vendor-defined {label, value} rows on implementation / warranty_support /
  // pricing — one shared set of handlers for all three "custom" arrays.
  type CustomKey = 'impl_custom' | 'ws_custom' | 'pr_custom';
  function addCustom(key: CustomKey) {
    setF((prev) => (prev[key].length >= CUSTOM_MAX ? prev : { ...prev, [key]: [...prev[key], { label: '', value: '' }] }));
  }
  function updateCustom(key: CustomKey, i: number, field: keyof CustomField, v: string) {
    setF((prev) => ({ ...prev, [key]: prev[key].map((c, j) => (j === i ? { ...c, [field]: v } : c)) }));
  }
  function removeCustom(key: CustomKey, i: number) {
    setF((prev) => ({ ...prev, [key]: prev[key].filter((_, j) => j !== i) }));
  }

  // AI-fill entry UI removed 2026-07-28 per Cesar ("normal product upload") —
  // the /api/vendor/listings/extract endpoint and mergeDraft/resize helpers
  // remain server/dormant-side in case the assist returns later.

  // `overrides` (2026-07-30, listing wizard v1): lets a caller save a form
  // value that hasn't landed in `f` state yet in THIS tick (React state
  // updates are async, so `setF(...)` immediately followed by `save()` in
  // the same handler would otherwise read the stale `f` via closure). Used
  // once — the wizard's Step 1→2 transition, which needs to create the
  // draft (to get an id for photo upload) using a placeholder name before
  // the vendor has typed a real one. Every existing call site keeps calling
  // save() with no args, so behavior there is byte-identical.
  async function save(overrides?: Partial<Form>): Promise<Listing | null> {
    if (!editing) return null;
    const ff = overrides ? { ...f, ...overrides } : f;
    if (!ff.name.trim()) { setMsg(t.giveNameFirst); return null; }
    setSaving(true); setMsg('');
    const body: Record<string, unknown> = { ...toBody(editing.kind, ff), kind: editing.kind };
    if (editing.id) body.id = editing.id;
    else { body.ai_extracted = Boolean(docId); if (docId) body.attach_document_id = docId; }
    const res = await fetch('/api/vendor/listings', {
      method: editing.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.ok) { setMsg(data.message || t.couldNotSave); return null; }
    // Real save succeeded — the stashed local draft for this slot has served
    // its purpose and is cleared (matches editing.id as it was BEFORE the
    // id gets assigned below, i.e. the exact key autosave was writing to).
    if (authId) {
      try { window.localStorage.removeItem(autosaveKey(authId, editing.kind, editing.id)); } catch { /* best effort */ }
    }
    if (!editing.id) setEditing({ kind: editing.kind, id: data.listing.id });
    setMsg(t.savedMsg);
    load();
    return data.listing as Listing;
  }

  async function reviewAndPublish() {
    const saved = await save();
    if (saved && editing) openReview(editing.kind, saved);
  }

  async function publishNow() {
    if (!reviewFor || !accOk) return;
    setPubBusy(true); setPubErr('');
    const res = await fetch('/api/vendor/listings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: reviewFor.kind, id: reviewFor.listing.id, status: 'published', accuracy_confirmed: true }),
    });
    const data = await res.json();
    setPubBusy(false);
    if (!data.ok) { setPubErr(data.message || t.couldNotPublish); return; }
    setReviewFor(null); setAccOk(false); setEditing(null); setWizardStep(null);
    setMsg(t.publishedMsg);
    load();
  }

  async function setStatus(kind: Kind, id: string, status: 'unpublished' | 'draft' | 'ready') {
    await fetch('/api/vendor/listings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id, status }) });
    load();
  }
  async function archive(kind: Kind, id: string) {
    if (!confirm(t.archiveConfirm)) return;
    await fetch(`/api/vendor/listings?kind=${kind}&id=${id}`, { method: 'DELETE' });
    // If the archived listing was open in the split-view editor, close the
    // panel too — it no longer exists to edit. (Split-view manager, 2026-07-30;
    // the archive call itself is unchanged.)
    setEditing((cur) => (cur && cur.id === id ? null : cur));
    load();
  }
  // Reorder within a kind (up/down — reliable on mobile, unlike drag). Persists
  // a sequential sort_order so both this page and the public storefront match.
  async function move(kind: Kind, idx: number, dir: 'up' | 'down') {
    const cur = kind === 'product' ? products : services;
    const j = dir === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= cur.length) return;
    const rows = [...cur];
    [rows[idx], rows[j]] = [rows[j], rows[idx]];
    if (kind === 'product') setProducts(rows); else setServices(rows);
    await Promise.all(rows.map((l, i) => fetch('/api/vendor/listings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id: l.id, sort_order: i }),
    })));
  }
  async function uploadImage(file: File) {
    if (!editing?.id) { setMsg(t.saveListingFirst); return; }
    const fd = new FormData(); fd.append('kind', editing.kind); fd.append('id', editing.id); fd.append('file', file);
    const res = await fetch('/api/vendor/listings/media', { method: 'POST', body: fd });
    const data = await res.json();
    setMsg(data.ok ? t.photoAdded : (data.message || t.uploadFailed));
    load();
  }

  if (checking) return <Shell lang={lang} setLang={setLang}><div className="sc-empty">{t.loading}</div></Shell>;
  if (!signedIn) {
    return <Shell lang={lang} setLang={setLang}><div className="sc-gate"><h1>{t.signInTitle}</h1><a className="sc-btn" href="/vendor-login">{t.goToSignIn}</a></div></Shell>;
  }

  // Renamed from the generic `T` to avoid colliding with the `T` translation
  // dictionary above — this one renders a labeled text/textarea form field.
  const Field = (k: keyof Form, label: string, ph = '', rows = 0) => (
    <label className="sc-field"><span>{label}</span>
      {rows
        ? <textarea rows={rows} placeholder={ph} value={f[k] as string} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        : <input placeholder={ph} value={f[k] as string} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
    </label>
  );
  const C = (k: keyof Form, label: string) => (
    <label className="sc-cb"><input type="checkbox" checked={f[k] as boolean} onChange={(e) => setF({ ...f, [k]: e.target.checked })} /> {label}</label>
  );
  // Chip/tag field: suggested chips from real data + type-your-own, never
  // restricted to the suggestion list. `max=1` makes it act as a single-value
  // picker (used for category, which persists as one string).
  const Chip = (label: string, value: string[], onChange: (v: string[]) => void, opts: { suggestions?: string[]; max?: number; placeholder?: string } = {}) => (
    <label className="sc-field"><span>{label}</span>
      <ChipTagInput value={value} onChange={onChange} suggestions={opts.suggestions} max={opts.max} placeholder={opts.placeholder} />
    </label>
  );
  // Shared "+ Add field" UI for the implementation / warranty_support /
  // pricing custom {label, value} rows.
  const CustomFields = (key: CustomKey) => (
    <div className="sc-custom">
      {f[key].map((c, i) => (
        <div className="sc-customrow" key={i}>
          <input placeholder={t.fieldNameLabel} maxLength={60} value={c.label} onChange={(e) => updateCustom(key, i, 'label', e.target.value)} aria-label={t.fieldNameLabel} />
          <input placeholder={t.fieldValueLabel} maxLength={300} value={c.value} onChange={(e) => updateCustom(key, i, 'value', e.target.value)} aria-label={t.fieldValueLabel} />
          <button type="button" className="sc-link" onClick={() => removeCustom(key, i)}>{t.remove}</button>
        </div>
      ))}
      <button type="button" className="sc-btn sm ghost" disabled={f[key].length >= CUSTOM_MAX} onClick={() => addCustom(key)}>{t.addField}</button>
    </div>
  );

  const Pv = (label: string, v: string) => <Prev label={label} v={v} emptyText={t.previewEmptyNote} />;
  const KIND_LABEL: Record<Kind, string> = { product: t.kindProduct, service: t.kindService };

  return (
    <Shell lang={lang} setLang={setLang}>
      <div className="sc-head">
        <div>
          <h1>{t.pageTitle}</h1>
          <p className="sc-sub">{t.pageSub}</p>
        </div>
        <div className="sc-headr">
          <a className="sc-link" href="/vendor/leads">{t.leadsInboxLink}</a>
          <a className="sc-link" href="/vendor/portal">{t.companyProfileLink}</a>
        </div>
      </div>
      {!emailVerified && (
        <div className="sc-warn">
          {t.emailWarn}
        </div>
      )}
      {msg && <div className="sc-msg">{msg}</div>}

      <div className="sc-split">
        <div className="sc-listcol">
          <div className="sc-listtoolbar">
            <label className="sc-search">
              <Search size={16} aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPh} aria-label={t.searchLabel} />
            </label>
            <button type="button" className="sc-btn" onClick={() => { setEditing(null); setNewKindPrompt(true); }}>
              <Plus size={16} /> {t.newListing}
            </button>
          </div>
          <div className="sc-filterchips" role="group" aria-label={t.filterLabel}>
            {([
              ['all', t.filterAll], ['product', t.products], ['service', t.services], ['live', t.filterLive], ['draft', t.filterDrafts],
            ] as Array<[typeof filter, string]>).map(([key, label]) => (
              <button key={key} type="button" className={'sc-chip' + (filter === key ? ' active' : '')} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {/* Selected state is never color-only (UI Standards Addendum §3) — the check mark is the non-color cue. */}
                {filter === key && <Check size={13} />}
                {label}
              </button>
            ))}
          </div>

          {allRows.length === 0 ? (
            <div className="sc-emptystate">
              <span className="sc-emptyicon"><Package size={22} /></span>
              <b>{t.emptyTitle}</b>
              <p>{t.emptyBody}</p>
              <button type="button" className="sc-btn" onClick={() => { setEditing(null); setNewKindPrompt(true); }}>{t.newListing}</button>
            </div>
          ) : filteredRows.length === 0 ? (
            <p className="sc-hint sc-nomatch">{t.noMatches}</p>
          ) : (
            <ul className="sc-list">
              {filteredRows.map((l, rowIndex) => {
                const score = scoreListing(l.kind, l as unknown as Record<string, unknown>, lang);
                const kindArr = l.kind === 'product' ? products : services;
                const idx = kindIndexOf(l.kind, l.id);
                const img = (l.image_paths || [])[0];
                const isActive = editing?.id === l.id;
                // Entrance stagger (UI Standards Addendum §4): capped so a long
                // list doesn't leave the last rows waiting to fade in.
                const rowStyle = { animationDelay: `${Math.min(rowIndex, 10) * 35}ms` };
                return (
                  <li key={l.id} className={'sc-row' + (isActive ? ' is-active' : '')} style={rowStyle}>
                    <div className="sc-rowtop">
                      {kindArr.length > 1 && (
                        <span className="sc-reorder">
                          <button type="button" aria-label={t.moveUp} disabled={idx === 0} onClick={(e) => { e.stopPropagation(); move(l.kind, idx, 'up'); }}>▲</button>
                          <button type="button" aria-label={t.moveDown} disabled={idx === kindArr.length - 1} onClick={(e) => { e.stopPropagation(); move(l.kind, idx, 'down'); }}>▼</button>
                        </span>
                      )}
                      <button type="button" className="sc-rowmain" onClick={() => openEdit(l.kind, l)} aria-current={isActive || undefined}>
                        <span className={'sc-thumb ' + l.kind}>
                          {img && /^https?:/.test(img) ? <img src={img} alt="" /> : (l.kind === 'product' ? <Package size={18} /> : <Wrench size={18} />)}
                        </span>
                        <span className="sc-rowtext">
                          <span className="sc-rowname">{l.name}</span>
                          <span className="sc-rowmeta">{(l.category || t.noCategory)} · {KIND_LABEL[l.kind]}</span>
                        </span>
                        <span className={'sc-status ' + l.status}>{STATUS_LABEL[l.status] || l.status}</span>
                      </button>
                      {l.status === 'published' && (
                        <a className="sc-rowlive" href={`/marketplace/${l.kind}/${l.id}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label={t.viewLive} title={t.viewLive}>
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>
                    {/* Completeness meter — complete listings rank higher & win more quotes */}
                    <div className="sc-meter" title={score.missing.join(' · ')}>
                      <div className="sc-meterbar"><div className={'sc-meterfill' + (score.percent >= 80 ? ' good' : score.percent >= 50 ? ' mid' : ' low')} style={{ width: `${score.percent}%` }} /></div>
                      <span className="sc-meterpct">{score.percent}{t.completeSuffix}</span>
                      {score.missing.length > 0 && score.percent < 100 && (
                        <span className="sc-meterhint">{t.nextPrefix} {score.missing.slice(0, 2).join(' · ')}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={'sc-editcol' + ((editing || newKindPrompt) ? ' is-open' : '')}>
          {newKindPrompt && !editing && (
            <div className="sc-kindpick">
              <div className="sc-edithead">
                <button type="button" className="sc-backbtn" onClick={() => setNewKindPrompt(false)}><ArrowLeft size={18} /> {t.backToListings}</button>
              </div>
              <div className="sc-kindpickbody">
                <b>{t.chooseKindTitle}</b>
                <div className="sc-kindopts">
                  <button type="button" className="sc-kindopt" onClick={() => openWizard('product')}><Package size={22} /><span>{t.newProduct}</span></button>
                  <button type="button" className="sc-kindopt" onClick={() => openWizard('service')}><Wrench size={22} /><span>{t.newService}</span></button>
                </div>
              </div>
            </div>
          )}

          {!editing && !newKindPrompt && (
            <div className="sc-editplaceholder">
              <span className="sc-emptyicon"><ImageOff size={20} /></span>
              <p>{t.pickListingHint}</p>
            </div>
          )}

          {/* Listing-creation wizard v1 (2026-07-30): what "+ New listing" opens
              now. Separate render path from the untouched full-form editor
              below (`!wizardStep`) — an EXISTING listing (openEdit) always
              clears wizardStep, so editing one always renders the old panel. */}
          {editing && wizardStep && (
            <div className="sc-wiz">
              <div className="sc-edithead">
                <button type="button" className="sc-backbtn" onClick={wizBackStep}><ArrowLeft size={18} /> {t.wizBack}</button>
                <div className="sc-editheadmain">
                  <span className="sc-lbl">{editing.kind === 'product' ? t.formNewProduct : t.formNewService}</span>
                </div>
              </div>

              <div className="sc-wizdots" role="group" aria-label={`${t.wizStepPrefix} ${wizardStep} ${t.wizStepOfSuffix}`}>
                {([t.wizDotCategory, t.wizDotDetails, t.wizDotPricing, t.wizDotReview]).map((label, i) => (
                  <span key={label} className={'sc-wizdot' + (wizardStep === i + 1 ? ' active' : '') + (wizardStep > i + 1 ? ' done' : '')} aria-current={wizardStep === i + 1 ? 'step' : undefined}>
                    <span className="sc-wizdotmark" aria-hidden="true">{wizardStep > i + 1 ? <Check size={11} strokeWidth={2.5} /> : null}</span>
                    <span className="sc-wizdotlabel">{label}</span>
                  </span>
                ))}
              </div>

              <div className="sc-editbody">
                <div className="sc-wizstep" key={wizardStep}>
                  {wizardStep === 1 && (
                    <>
                      <h2 className="sc-wiztitle">{t.wizStep1Title}</h2>
                      <p className="sc-wizwhy">{t.wizStep1Why}</p>
                      <CategoryChipPicker
                        selected={f.category ? [f.category] : []}
                        onToggle={(label) => setF((prev) => ({ ...prev, category: prev.category === label ? '' : label }))}
                        lang={lang}
                      />
                      {f.category && categoryBreadcrumb(f.category, lang) && (
                        <p className="sc-wizbreadcrumb">{categoryBreadcrumb(f.category, lang)}</p>
                      )}
                      {!f.category && <p className="sc-wizhint">{t.wizPickCategoryToContinue}</p>}
                    </>
                  )}

                  {wizardStep === 2 && (
                    <>
                      <h2 className="sc-wiztitle">{t.wizStep2Title}</h2>

                      <div
                        className="sc-wizphotozone"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          Array.from(e.dataTransfer.files || [])
                            .filter((file) => file.type.startsWith('image/'))
                            .forEach((file) => uploadImage(file));
                        }}
                      >
                        <span className="sc-lblsm">{t.photosSectionLabel}</span>
                        <p className="sc-wizhint">{t.wizPhotosHint}</p>
                        <div className="sc-photostripimgs">
                          {(currentListing?.image_paths || []).filter((p) => /^https?:/.test(p)).map((p, i) => (
                            <span className="sc-photothumb" key={i}><img src={p} alt="" /></span>
                          ))}
                          <label className="sc-photoadd" title={t.addPhoto}>
                            <ImagePlus size={18} />
                            <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); e.target.value = ''; }} aria-label={t.addPhoto} />
                          </label>
                        </div>
                      </div>

                      {Field('name', editing.kind === 'product' ? t.nameLabelProduct : t.nameLabelService)}

                      <label className="sc-field">
                        <span>{t.wizShortDescLabel}</span>
                        <textarea rows={3} placeholder={t.wizShortDescPh} value={f.overview} onChange={(e) => setF({ ...f, overview: e.target.value })} />
                      </label>
                      <p className="sc-wizcharcount">{f.overview.length} {t.wizCharsCounted}</p>
                      <p className="sc-wizhint">{t.wizShortDescHint}</p>

                      {editing.kind === 'product' && Field('specs', t.specsLabel, t.specsPh, 4)}
                    </>
                  )}

                  {wizardStep === 3 && (
                    <>
                      {editing.kind === 'product' ? (
                        <div className="sc-wizavail">
                          <span className="sc-lblsm">{t.wizAvailabilityLabel}</span>
                          <div className="sc-wizavailtoggle" role="radiogroup" aria-label={t.wizAvailabilityLabel}>
                            <button type="button" role="radio" aria-checked={wizAvailability === 'in_stock'} className={'sc-wizavailbtn' + (wizAvailability === 'in_stock' ? ' active' : '')} onClick={() => { setWizAvailability('in_stock'); setF((p) => ({ ...p, lead_time: '' })); }}>
                              {wizAvailability === 'in_stock' && <Check size={13} strokeWidth={2.5} />} {t.wizInStock}
                            </button>
                            <button type="button" role="radio" aria-checked={wizAvailability === 'made_to_order'} className={'sc-wizavailbtn' + (wizAvailability === 'made_to_order' ? ' active' : '')} onClick={() => setWizAvailability('made_to_order')}>
                              {wizAvailability === 'made_to_order' && <Check size={13} strokeWidth={2.5} />} {t.wizMadeToOrder}
                            </button>
                          </div>
                          {wizAvailability === 'made_to_order' && Field('lead_time', t.leadTimeLabel, t.leadTimePh)}
                        </div>
                      ) : (
                        <div className="sc-wizavail">
                          <span className="sc-lblsm">{t.wizAvailabilityLabel}</span>
                          <p className="sc-wizstatic">{t.wizAvailableForService}</p>
                        </div>
                      )}

                      <h2 className="sc-wiztitle">{t.wizStep3Title}</h2>
                      <p className="sc-wizwhy">{t.wizStep3Why}</p>

                      <div className="sc-wizcards" role="group" aria-label={t.wizStep3Title}>
                        <button type="button" className={'sc-wizcard' + (pricingChoice === 'fixed' ? ' on' : '')} aria-pressed={pricingChoice === 'fixed'} onClick={() => setPricingChoice('fixed')}>
                          <span className="sc-wizcardicon"><Tag size={20} strokeWidth={1.75} /></span>
                          <span>{t.wizCardFixed}</span>
                          {pricingChoice === 'fixed' && <span className="sc-wizcardcheck"><Check size={14} strokeWidth={2.5} /></span>}
                        </button>
                        <button type="button" className={'sc-wizcard' + (pricingChoice === 'quote' ? ' on' : '')} aria-pressed={pricingChoice === 'quote'} onClick={() => setPricingChoice('quote')}>
                          <span className="sc-wizcardicon sc-wizcardicon-pair"><FileText size={20} strokeWidth={1.75} /><Pen size={12} strokeWidth={2.25} className="sc-wizcardicon2" /></span>
                          <span>{t.wizCardQuote}</span>
                          {pricingChoice === 'quote' && <span className="sc-wizcardcheck"><Check size={14} strokeWidth={2.5} /></span>}
                        </button>
                        <button type="button" className={'sc-wizcard' + (pricingChoice === 'rent_lease' ? ' on' : '')} aria-pressed={pricingChoice === 'rent_lease'} onClick={() => setPricingChoice('rent_lease')}>
                          <span className="sc-wizcardicon"><CalendarClock size={20} strokeWidth={1.75} /></span>
                          <span>{t.wizCardRentLease}</span>
                          {pricingChoice === 'rent_lease' && <span className="sc-wizcardcheck"><Check size={14} strokeWidth={2.5} /></span>}
                        </button>
                        <button type="button" className={'sc-wizcard' + (pricingChoice === 'subscription' ? ' on' : '')} aria-pressed={pricingChoice === 'subscription'} onClick={() => setPricingChoice('subscription')}>
                          <span className="sc-wizcardicon"><RefreshCw size={20} strokeWidth={1.75} /></span>
                          <span>{t.wizCardSubscription}</span>
                          {pricingChoice === 'subscription' && <span className="sc-wizcardcheck"><Check size={14} strokeWidth={2.5} /></span>}
                        </button>
                      </div>

                      {pricingChoice === 'fixed' && (
                        <div className="sc-wizdynamic">{Field('pr_range', t.wizPriceLabel, t.wizPricePh)}</div>
                      )}
                      {pricingChoice === 'quote' && (
                        <div className="sc-wizdynamic">
                          <label className="sc-field"><span>{t.wizWhatBuyersKnowLabel}</span><textarea rows={3} placeholder={t.wizWhatBuyersKnowPh} value={f.pr_notes} onChange={(e) => setF({ ...f, pr_notes: e.target.value })} /></label>
                        </div>
                      )}
                      {pricingChoice === 'rent_lease' && (
                        <div className="sc-wizdynamic">
                          {editing.kind === 'product' ? (
                            <div className="sc-cbrow">
                              <label className="sc-cb"><input type="checkbox" checked={f.rent} onChange={(e) => setF({ ...f, rent: e.target.checked })} /> {t.wizRentAvailable}</label>
                              <label className="sc-cb"><input type="checkbox" checked={f.lease} onChange={(e) => setF({ ...f, lease: e.target.checked })} /> {t.wizLeaseAvailable}</label>
                            </div>
                          ) : (
                            <p className="sc-wizhint">{t.wizRentLeaseServiceNote}</p>
                          )}
                          {Field('pr_range', t.wizRateLabel, t.wizRatePh)}
                        </div>
                      )}
                      {pricingChoice === 'subscription' && (
                        <p className="sc-wizhint">{t.wizSubscriptionNote}</p>
                      )}
                      {!pricingChoice && <p className="sc-wizhint">{t.wizChoosePricingToContinue}</p>}
                    </>
                  )}

                  {wizardStep === 4 && (
                    <>
                      <h2 className="sc-wiztitle">{t.reviewBeforePublishing}</h2>
                      <p className="sc-hint">{t.reviewHint}</p>
                      {!emailVerified && <div className="sc-warn">{t.emailWarn}</div>}

                      <div className="sc-prev-card sc-wiz-previewcard">
                        {(() => {
                          const l = currentListing;
                          const img = (l?.image_paths || [])[0];
                          const priceLine = pricingChoice === 'quote' ? t.requestQuoteFallback
                            : pricingChoice === 'subscription' ? t.wizCardSubscription
                            : (f.pr_range || (pricingChoice === 'rent_lease' ? t.wizCardRentLease : t.requestQuoteFallback));
                          return (
                            <>
                              <div className="sc-prev-img">{img && /^https?:/.test(img) ? <img src={img} alt="" /> : <span>{img ? t.photoAttached : t.noPhoto}</span>}</div>
                              <div className="sc-prev-body">
                                <b>{l?.name || f.name}</b>
                                <small>{l?.category || f.category || t.wizPreviewNoCategory} · {editing.kind === 'product' ? t.kindProduct : t.kindService}</small>
                                <em>{priceLine}</em>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <label className="sc-cb sc-acc">
                        <input type="checkbox" checked={accOk} onChange={(e) => setAccOk(e.target.checked)} />
                        {t.accuracyConfirm}
                      </label>
                      {pubErr && <div className="sc-warn">{pubErr}</div>}
                    </>
                  )}
                </div>
              </div>

              <div className="sc-savebar">
                {autosaveFlash && <span className="sc-autosaveflash" role="status">{t.draftSavedLocally}</span>}
                {wizardStep >= 2 && (
                  <button type="button" className="sc-btn ghost" disabled={saving} onClick={() => save()}>{saving ? t.saving : t.saveDraft}</button>
                )}
                {wizardStep === 1 && <button type="button" className="sc-btn" disabled={!f.category || wizBusy} onClick={wizContinueFromCategory}>{wizBusy ? t.wizCreatingDraft : t.wizChooseCategory}</button>}
                {wizardStep === 2 && <button type="button" className="sc-btn" disabled={!f.name.trim() || !f.overview.trim() || wizBusy} onClick={wizContinueFromDetails}>{wizBusy ? t.saving : t.wizAddDetails}</button>}
                {wizardStep === 3 && <button type="button" className="sc-btn" disabled={!pricingChoice || wizBusy} onClick={wizContinueFromPricing}>{wizBusy ? t.saving : t.wizSetPricing}</button>}
                {wizardStep === 4 && <button type="button" className="sc-btn" disabled={!accOk || pubBusy} onClick={publishNow}>{pubBusy ? t.publishing : t.publishToMarketplace}</button>}
              </div>
              {wizardStep === 2 && (!f.name.trim() || !f.overview.trim()) && <p className="sc-wizfootnote">{t.wizFillRequiredToContinue}</p>}
            </div>
          )}

          {editing && !wizardStep && (
            <>
              <div className="sc-edithead">
                <button type="button" className="sc-backbtn" onClick={() => { setEditing(null); setMsg(''); }}><ArrowLeft size={18} /> {t.backToListings}</button>
                <div className="sc-editheadmain">
                  <span className="sc-lbl">{editing.id ? (editing.kind === 'product' ? t.formEditProduct : t.formEditService) : (editing.kind === 'product' ? t.formNewProduct : t.formNewService)}</span>
                  {currentListing && <span className={'sc-status ' + currentListing.status}>{STATUS_LABEL[currentListing.status] || currentListing.status}</span>}
                </div>
                {currentListing && (
                  <div className="sc-editheadactions">
                    {currentListing.status === 'published' && (
                      <a className="sc-link" href={`/marketplace/${editing.kind}/${editing.id}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> {t.viewLive}</a>
                    )}
                    {currentListing.status === 'published' && (
                      <button type="button" className="sc-link" onClick={() => setStatus(editing.kind, editing.id as string, 'unpublished')}>{t.unpublish}</button>
                    )}
                    <button type="button" className="sc-link sc-danger" onClick={() => archive(editing.kind, editing.id as string)}>{t.archive}</button>
                  </div>
                )}
              </div>

              <div className="sc-editbody">
                {resumeOffer && (
                  <div className="sc-resume">
                    <span>{t.resumeTitle}</span>
                    <div className="sc-resume-actions">
                      <button type="button" className="sc-btn sm" onClick={applyResumeOffer}>{t.resumeRestore}</button>
                      <button type="button" className="sc-btn sm ghost" onClick={discardResumeOffer}>{t.resumeDiscard}</button>
                    </div>
                  </div>
                )}

                {/* Photos strip — top of the panel, like the reference layout.
                    Existing photos (read-only display; removal is out of scope
                    for this re-layout) plus the same upload control as before,
                    still gated on the listing having an id (save first). */}
                <div className="sc-photostrip">
                  <span className="sc-lblsm">{t.photosSectionLabel}</span>
                  <div className="sc-photostripimgs">
                    {editing.id ? (
                      <>
                        {(currentListing?.image_paths || []).filter((p) => /^https?:/.test(p)).map((p, i) => (
                          <span className="sc-photothumb" key={i}><img src={p} alt="" /></span>
                        ))}
                        <label className="sc-photoadd" title={t.addPhoto}>
                          <Plus size={18} />
                          <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); e.target.value = ''; }} aria-label={t.addPhoto} />
                        </label>
                      </>
                    ) : (
                      <span className="sc-photoplaceholder">{t.saveListingFirst}</span>
                    )}
                  </div>
                </div>

                <div className="sc-grid">
                  {Field('name', editing.kind === 'product' ? t.nameLabelProduct : t.nameLabelService)}
                  {Chip(t.categoryLabel, f.category ? [f.category] : [], (next) => setF({ ...f, category: next[next.length - 1] || '' }), {
                    suggestions: suggestedCategories, max: 1,
                    placeholder: t.categoryHint,
                  })}
                </div>
                {Field('overview', t.descriptionLabel, t.descriptionPh, 4)}

                {/* Pricing stays always-visible (with name/description/category) —
                    the rest of the fields live in collapsible groups below. */}
                <div className="sc-block sc-pricingblock">
                  <span className="sc-blocklabel">{t.pricingSummary}</span>
                  {editing.kind === 'product' ? (
                    <div className="sc-cbrow"><span className="sc-lblsm">{t.availabilityLabel}</span>{C('buy', t.buy)}{C('rent', t.rent)}{C('lease', t.lease)}</div>
                  ) : (
                    <>
                      {Field('pricing_model', t.pricingModelLabel, t.pricingModelPh)}
                      <div className="sc-cbrow">{C('emergency_available', t.emergencyLabel)}</div>
                    </>
                  )}
                  <div className="sc-grid3">{Field('pr_model', t.prModelLabel, t.prModelPh)}{Field('pr_range', t.prRangeLabel, t.prRangePh)}{Field('pr_notes', t.prNotesLabel, t.prNotesPh)}</div>
                  {CustomFields('pr_custom')}
                </div>

                <details className="sc-block"><summary>{t.tagsAudienceSummary}</summary>
                  <div className="sc-grid">
                    {Chip(t.bestForLabel, f.best_for, (next) => setF({ ...f, best_for: next }), {
                      suggestions: suggestedBestFor, max: 10, placeholder: t.chipHint,
                    })}
                    {Chip(t.industriesLabel, f.industries, (next) => setF({ ...f, industries: next }), {
                      suggestions: suggestedIndustries, max: 15, placeholder: t.chipHint,
                    })}
                  </div>
                  {editing.kind === 'product' && Chip(t.useCasesLabel, f.use_cases, (next) => setF({ ...f, use_cases: next }), {
                    suggestions: suggestedUseCases, max: 12, placeholder: t.chipHint,
                  })}
                </details>

                {editing.kind === 'product' ? (
                  <details className="sc-block"><summary>{t.specsLogisticsSummary}</summary>
                    {Field('specs', t.specsLabel, t.specsPh, 4)}
                    {Field('lead_time', t.leadTimeLabel, t.leadTimePh)}
                  </details>
                ) : (
                  <details className="sc-block"><summary>{t.serviceDetailsSummary}</summary>
                    <div className="sc-grid">
                      {Field('service_areas', t.serviceAreasLabel, t.serviceAreasPh)}
                      {Field('response_time', t.responseTimeLabel, t.responseTimePh)}
                    </div>
                    {Field('process', t.processLabel, t.processPh, 4)}
                    {Field('certifications', t.certificationsLabel)}
                  </details>
                )}

                <details className="sc-block"><summary>{t.pilotDemoSummary}</summary>
                  <div className="sc-cbrow">{C('pilot_available', t.pilotAvailableLabel)}</div>
                  {f.pilots.map((p, i) => (
                    <div className="sc-pilot-entry" key={i}>
                      <div className="sc-grid3">
                        <label className="sc-field"><span>{t.durationLabel}</span><input placeholder={t.durationPh} value={p.duration} onChange={(e) => updatePilot(i, 'duration', e.target.value)} /></label>
                        <label className="sc-field"><span>{t.costLabel}</span><input placeholder={t.costPh} value={p.cost} onChange={(e) => updatePilot(i, 'cost', e.target.value)} /></label>
                        <label className="sc-field"><span>{t.scopeLabel}</span><input placeholder={t.scopePh} value={p.scope} onChange={(e) => updatePilot(i, 'scope', e.target.value)} /></label>
                      </div>
                      <button type="button" className="sc-link" onClick={() => removePilot(i)}>{t.remove}</button>
                    </div>
                  ))}
                  <button type="button" className="sc-btn sm ghost" disabled={f.pilots.length >= PILOT_MAX} onClick={addPilot}>{t.addAnotherPilot}</button>
                </details>
                <details className="sc-block"><summary>{t.implementationSummary}</summary>
                  <div className="sc-grid3">{Field('impl_requirements', t.implRequirementsLabel, t.implRequirementsPh)}{Field('impl_timeline', t.implTimelineLabel, t.implTimelinePh)}{Field('impl_training', t.implTrainingLabel, t.implTrainingPh)}</div>
                  {CustomFields('impl_custom')}
                </details>
                <details className="sc-block"><summary>{t.warrantySummary}</summary>
                  <div className="sc-grid3">{Field('ws_warranty', t.wsWarrantyLabel, t.wsWarrantyPh)}{Field('ws_channels', t.wsChannelsLabel, t.wsChannelsPh)}{Field('ws_sla', t.wsSlaLabel, t.wsSlaPh)}</div>
                  {CustomFields('ws_custom')}
                </details>
              </div>

              <div className="sc-savebar">
                {autosaveFlash && <span className="sc-autosaveflash" role="status">{t.draftSavedLocally}</span>}
                <button className="sc-btn ghost" disabled={saving} onClick={() => save()}>{saving ? t.saving : t.saveDraft}</button>
                <button className="sc-btn" disabled={saving} onClick={reviewAndPublish}>{saving ? t.saving : t.reviewPublish}</button>
              </div>
            </>
          )}
        </div>
      </div>

      {reviewFor && (
        <div className="sc-modal" role="dialog" aria-modal="true" aria-labelledby="sc-modal-title" onClick={() => setReviewFor(null)}>
          <div className="sc-modal-in" onClick={(e) => e.stopPropagation()}>
            <div className="sc-lbl" id="sc-modal-title">{t.reviewBeforePublishing}</div>
            <p className="sc-hint">{t.reviewHint}</p>

            <div className="sc-prev-card">
              {(() => {
                const l = reviewFor.listing;
                const img = (l.image_paths || [])[0];
                return (
                  <>
                    <div className="sc-prev-img">{img && /^https?:/.test(img) ? <img src={img} alt="" /> : <span>{img ? t.photoAttached : t.noPhoto}</span>}</div>
                    <div className="sc-prev-body">
                      <b>{l.name}</b>
                      <small>{l.category || t.noCategory} · {KIND_LABEL[reviewFor.kind]}</small>
                      {(l.best_for || []).length > 0 && <em>{t.bestForPrefix} {(l.best_for || []).join(', ')}</em>}
                    </div>
                  </>
                );
              })()}
            </div>

            <ul className="sc-prev-list">
              {Pv(t.prevDescription, reviewFor.listing.overview || '')}
              {Pv(t.prevIndustries, (reviewFor.listing.industries || []).join(', '))}
              {reviewFor.kind === 'product' ? (
                <>
                  {Pv(t.prevSpecs, reviewFor.listing.specs ? `${Object.keys(reviewFor.listing.specs).length} ${t.listedSuffix}` : '')}
                  {Pv(t.prevAvailability, (reviewFor.listing.availability || []).join(', '))}
                  {Pv(t.prevLeadTime, reviewFor.listing.lead_time || '')}
                </>
              ) : (
                <>
                  {Pv(t.prevServiceAreas, (reviewFor.listing.service_areas || []).join(', '))}
                  {Pv(t.prevResponseTime, reviewFor.listing.response_time || '')}
                  {Pv(t.prevCertifications, (reviewFor.listing.certifications || []).join(', '))}
                </>
              )}
              {Pv(t.prevPilotDemo, (() => {
                const entries = pilotEntriesOf(reviewFor.listing.pilot);
                if (!entries.length) return '';
                if (entries.length === 1) return [entries[0].duration, entries[0].cost, entries[0].scope].filter(Boolean).join(' · ') || t.pilotAvailableFallback;
                return `${entries.length} ${t.pilotsListedSuffix}`;
              })())}
              {Pv(t.prevWarranty, String(reviewFor.listing.warranty_support?.warranty || ''))}
              {Pv(t.prevPricing, String(reviewFor.listing.pricing?.range || reviewFor.listing.pricing?.model || reviewFor.listing.pricing_model || t.requestQuoteFallback))}
              {/* Vendor-added custom fields — same generic {label, value} rows
                  buyers will see on the listing page, so review shows exactly
                  what will publish. Labels here are the vendor's own text, not
                  dictionary keys — only the empty-state note is localized. */}
              {[
                ...customFieldsOf(reviewFor.listing.implementation),
                ...customFieldsOf(reviewFor.listing.warranty_support),
                ...customFieldsOf(reviewFor.listing.pricing),
              ].map((c, i) => <Prev key={`custom-${i}`} label={c.label} v={c.value} emptyText={t.previewEmptyNote} />)}
              {Pv(t.prevPhotos, `${(reviewFor.listing.image_paths || []).length}`)}
              {Pv(t.prevDocuments, extras ? (extras.documents.length ? extras.documents.map((doc) => doc.title || doc.file_name).join(' · ') : '') : t.checking)}
              {Pv(t.prevCaseStudies, extras ? (extras.case_studies.length ? extras.case_studies.map((c) => c.title).join(' · ') : '') : t.checking)}
            </ul>
            <p className="sc-hint">{t.reviewFooterHint}</p>

            <label className="sc-cb sc-acc">
              <input type="checkbox" checked={accOk} onChange={(e) => setAccOk(e.target.checked)} />
              {t.accuracyConfirm}
            </label>
            {pubErr && <div className="sc-warn">{pubErr}</div>}
            <div className="sc-actions">
              <button ref={modalCloseRef} className="sc-btn ghost" onClick={() => setReviewFor(null)}>{t.keepEditing}</button>
              <button className="sc-btn" disabled={!accOk || pubBusy} onClick={publishNow}>{pubBusy ? t.publishing : t.publishToMarketplace}</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Prev({ label, v, emptyText }: { label: string; v: string; emptyText: string }) {
  return <li><span>{label}</span><div>{v || <i>{emptyText}</i>}</div></li>;
}

function Shell({ children, lang, setLang }: { children: React.ReactNode; lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className={`sc ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <VendorNav active="listings" extra={<LanguageToggle lang={lang} onChange={setLang} variant="light" />} />
      <main className="sc-wrap">{children}</main>
    </div>
  );
}

const CSS = `
.sc{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-vlistings),'IBM Plex Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.sc *{box-sizing:border-box;}
.sc a:focus-visible,.sc button:focus-visible,.sc input:focus-visible,.sc textarea:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.sc-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:20;}
.sc-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.sc-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;}.sc-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.sc-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.sc-wrap{max-width:1180px;margin:0 auto;padding:36px 20px 100px;}
.sc-empty{text-align:center;color:var(--spec-text-2nd,#615F72);padding:80px 0;}
.sc-gate{max-width:420px;margin:14vh auto;text-align:center;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:20px;padding:36px;}
.sc-gate h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:20px;margin-bottom:18px;}
.sc-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:18px;}
.sc-head h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:28px;font-weight:700;letter-spacing:-.01em;}
.sc-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;margin-top:6px;}
.sc-headr{display:flex;gap:14px;}
.sc-link{font-family:inherit;background:none;border:none;color:var(--spec-violet-deep,#4A3DB0);font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:none;padding:0;transition:color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-link:hover{color:var(--spec-violet,#6C5CE0);}
.sc-msg{background:rgba(108,92,224,.08);border:1px solid rgba(108,92,224,.25);color:var(--spec-violet-deep,#4A3DB0);padding:11px 15px;border-radius:12px;font-size:13.5px;margin-bottom:16px;}
.sc-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:18px;padding:24px;margin-bottom:20px;}
.sc-cardhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.sc-lbl{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--spec-violet-deep,#4A3DB0);}
.sc-lblsm{font-size:12.5px;color:var(--spec-text-2nd,#615F72);}
.sc-hint{color:var(--spec-text-2nd,#615F72);font-size:13.5px;line-height:1.5;margin:0 0 10px;}
.sc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.sc-list li{display:flex;flex-direction:column;gap:9px;padding:12px 14px;border:1px solid var(--spec-border,#E2DFEC);border-radius:11px;background:var(--spec-surface,#EFEDF5);font-size:14px;}
.sc-rowtop{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.sc-reorder{display:inline-flex;flex-direction:column;gap:2px;margin-right:2px;}
.sc-reorder button{font-family:inherit;font-size:9px;line-height:1;padding:3px 6px;border-radius:6px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-reorder button:hover:not(:disabled){border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.sc-reorder button:disabled{opacity:.3;cursor:default;}
.sc-meter{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.sc-meterbar{width:130px;height:7px;border-radius:99px;background:var(--spec-border,#E2DFEC);overflow:hidden;flex-shrink:0;}
.sc-meterfill{height:100%;border-radius:99px;transition:width .3s;}
.sc-meterfill.good{background:var(--spec-success,#2F9E6A);}
.sc-meterfill.mid{background:var(--spec-warning,#C68A28);}
.sc-meterfill.low{background:var(--spec-error,#CE4B43);}
.sc-meterpct{font-size:11.5px;font-weight:700;color:var(--spec-ink,#141320);}
.sc-meterhint{font-size:11.5px;color:var(--spec-text-2nd,#615F72);}
.sc-list b{font-size:14.5px;}
.sc-list small{color:var(--spec-text-2nd,#615F72);}
.sc-spacer{flex:1;}
.sc-list a{color:var(--spec-violet-deep,#4A3DB0);font-size:12.5px;text-decoration:none;}
.sc-list button{font-family:inherit;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);font-size:12.5px;border-radius:8px;padding:6px 11px;cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-list button:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.sc-list button.sc-pub{border-color:rgba(47,158,106,.4);color:#1F7A54;}
.sc-list button.sc-del{color:var(--spec-text-2nd,#615F72);}
.sc-list button.sc-del:hover{color:var(--spec-error,#CE4B43);border-color:rgba(206,75,67,.4);}
.sc-status{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;border-radius:99px;white-space:nowrap;flex-shrink:0;}
.sc-status.published{background:var(--spec-success-bg,#E7F5EE);color:var(--spec-success,#2F9E6A);}
.sc-status.draft{background:var(--spec-warning-bg,#FBF2E1);color:var(--spec-warning,#C68A28);}
.sc-status.needs_review{background:var(--spec-warning-bg,#FBF2E1);color:#B5651D;}
.sc-status.ready{background:var(--spec-info-bg,#E9EFFB);color:var(--spec-info,#3E6FD0);}
.sc-status.unpublished{background:var(--spec-surface,#EFEDF5);color:var(--spec-text-2nd,#615F72);}
.sc-btn{font-family:inherit;font-size:14px;font-weight:700;padding:12px 20px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-btn:hover{background:var(--spec-violet-deep,#4A3DB0);}.sc-btn:disabled{opacity:.55;}
.sc-btn:active:not(:disabled){transform:scale(.98);transition:transform .1s ease;}
.sc-btn.sm{padding:9px 14px;font-size:13px;}
.sc-btn.ghost{background:#fff;border:1px solid rgba(108,92,224,.4);color:var(--spec-violet-deep,#4A3DB0);}
.sc-ai{border:1.5px dashed rgba(108,92,224,.35);background:rgba(108,92,224,.05);border-radius:14px;padding:16px;margin-bottom:20px;}
.sc-entryrow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:4px;align-items:start;}
@media(max-width:640px){.sc-entryrow{grid-template-columns:1fr;}}
.sc-entrycell{display:flex;flex-direction:column;gap:6px;}
.sc-entrybtn{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-family:inherit;font-size:13px;font-weight:600;line-height:1.3;text-align:center;padding:14px 10px;border-radius:12px;border:1.5px solid rgba(108,92,224,.35);background:#fff;color:var(--spec-violet-deep,#4A3DB0);cursor:pointer;width:100%;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-entrybtn:hover{border-color:var(--spec-violet,#6C5CE0);background:rgba(108,92,224,.06);}
.sc-entrybtn:focus-within,.sc-entrybtn:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.sc-entrybtn.disabled{opacity:.55;pointer-events:none;}
.sc-entryicon{font-size:20px;line-height:1;}
.sc-entrynote{margin:0;padding:0 4px;font-size:11px;line-height:1.4;color:var(--spec-text-2nd,#615F72);text-align:center;}
.sc-hiddeninput{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
.sc-airow{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start;margin-top:12px;}
@media(max-width:640px){.sc-airow{grid-template-columns:1fr;}}
.sc-airow textarea{font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;resize:vertical;}
.sc-aisum{margin-top:12px;font-size:13px;color:var(--spec-violet-deep,#4A3DB0);line-height:1.5;}
.sc-resume{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#EFF4FE;border:1px solid rgba(62,111,208,.3);color:#2B4E96;padding:12px 15px;border-radius:12px;margin-bottom:16px;font-size:13.5px;}
.sc-resume-actions{display:flex;gap:10px;flex-shrink:0;}
.sc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
.sc-grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:12px;}
@media(max-width:560px){.sc-grid{grid-template-columns:1fr;}}
.sc-field{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:500;color:var(--spec-ink,#141320);margin-bottom:2px;}
.sc-field input,.sc-field textarea{font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;resize:vertical;width:100%;}
.sc-field input:focus,.sc-field textarea:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.sc-cbrow{display:flex;gap:18px;align-items:center;margin:10px 0 14px;flex-wrap:wrap;}
.sc-cb{display:flex;align-items:center;gap:7px;font-size:13.5px;color:var(--spec-ink,#141320);cursor:pointer;}
.sc-block{border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:14px 16px;margin-bottom:12px;background:var(--spec-surface,#EFEDF5);}
.sc-block summary{cursor:pointer;font-size:13.5px;font-weight:600;color:var(--spec-ink,#141320);}
.sc-pilot-entry{border:1px dashed var(--spec-border,#E2DFEC);border-radius:10px;padding:12px 12px 6px;margin-top:12px;background:#fff;}
.sc-custom{margin-top:12px;}
.sc-customrow{display:grid;grid-template-columns:1fr 1.6fr auto;gap:10px;align-items:center;margin-bottom:8px;}
.sc-customrow input{font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:9px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;width:100%;box-sizing:border-box;}
.sc-customrow input:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
@media(max-width:560px){.sc-customrow{grid-template-columns:1fr;}}
.sc-photos{display:flex;align-items:center;gap:12px;margin:16px 0;}
.sc-actions{display:flex;gap:12px;margin-top:20px;}
.sc-warn{background:#FBF3E7;border:1px solid #EFD9AE;color:#8A5D14;padding:11px 15px;border-radius:12px;font-size:13.5px;margin-bottom:16px;line-height:1.5;}
.sc-modal{position:fixed;inset:0;background:rgba(20,19,32,.55);display:grid;place-items:center;z-index:60;padding:20px;}
.sc-modal-in{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:18px;max-width:560px;width:100%;max-height:85vh;overflow:auto;padding:24px;box-shadow:0 20px 60px rgba(20,19,32,.25);}
.sc-prev-card{display:flex;gap:14px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:13px;padding:12px;margin:14px 0;}
.sc-prev-img{width:110px;height:74px;border-radius:9px;overflow:hidden;background:#E2DFEC;display:grid;place-items:center;color:#8A87A0;font-size:11px;flex-shrink:0;}
.sc-prev-img img{width:100%;height:100%;object-fit:cover;}
.sc-prev-body{display:flex;flex-direction:column;gap:4px;}
.sc-prev-body b{font-size:15px;}
.sc-prev-body small{color:var(--spec-text-2nd,#615F72);font-size:12.5px;}
.sc-prev-body em{font-style:normal;font-size:12px;color:var(--spec-violet-deep,#4A3DB0);}
.sc-prev-list{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;}
.sc-prev-list li{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--spec-border,#E2DFEC);font-size:13.5px;}
.sc-prev-list li span{color:var(--spec-text-2nd,#615F72);min-width:120px;flex-shrink:0;}
.sc-prev-list li i{color:#8A87A0;font-style:italic;}
.sc-acc{margin:14px 0 4px;font-size:13.5px;line-height:1.5;align-items:flex-start;}
.sc-acc input{margin-top:3px;}

/* Split-view product manager (2026-07-30) — list column + pinned editor
   column. Layout/workflow only; every field/handler above is unchanged. */
.sc-split{display:grid;grid-template-columns:minmax(280px,380px) 1fr;gap:22px;align-items:start;}
.sc-listcol{min-width:0;}
.sc-listtoolbar{display:flex;gap:12px;align-items:center;margin-bottom:12px;}
.sc-search{display:flex;align-items:center;gap:8px;flex:1;min-width:0;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:0 12px;height:42px;color:var(--spec-text-2nd,#615F72);transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),box-shadow var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-search:focus-within{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.sc-search input{flex:1;min-width:0;border:none;outline:none;background:transparent;font:inherit;font-size:14px;color:var(--spec-ink,#141320);height:100%;}
.sc-filterchips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
.sc-chip{display:inline-flex;align-items:center;gap:5px;min-height:38px;font-family:inherit;font-size:12.5px;font-weight:600;padding:9px 15px;border-radius:99px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-text-2nd,#615F72);cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-chip:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.sc-chip.active{background:var(--spec-violet,#6C5CE0);border-color:var(--spec-violet,#6C5CE0);color:#fff;}
.sc-nomatch{padding:20px 4px;text-align:center;}
.sc-emptystate{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:44px 24px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;}
.sc-emptyicon{width:44px;height:44px;border-radius:12px;background:var(--spec-violet-bg,#EDEAFB);color:var(--spec-violet-deep,#4A3DB0);display:grid;place-items:center;flex-shrink:0;}
.sc-emptystate b{font-size:16px;color:var(--spec-ink,#141320);}
.sc-emptystate p{margin:0;font-size:13.5px;color:var(--spec-text-2nd,#615F72);max-width:280px;}
.sc-row{position:relative;transition:transform var(--spec-duration-fast,150ms) var(--spec-ease,ease),box-shadow var(--spec-duration-fast,150ms) var(--spec-ease,ease),border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-row.is-active{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 1px var(--spec-violet,#6C5CE0);background:#fff;}
.sc-rowmain{display:flex;align-items:center;gap:12px;flex:1;min-width:0;background:none;border:none;padding:4px;text-align:left;cursor:pointer;border-radius:8px;font-family:inherit;color:inherit;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-rowmain:hover{background:rgba(108,92,224,.06);}
.sc-thumb{width:40px;height:40px;border-radius:9px;overflow:hidden;flex-shrink:0;display:grid;place-items:center;background:var(--spec-violet-bg,#EDEAFB);color:var(--spec-violet-deep,#4A3DB0);}
.sc-thumb.service{background:var(--spec-info-bg,#E9EFFB);color:var(--spec-info,#3E6FD0);}
.sc-thumb img{width:100%;height:100%;object-fit:cover;}
.sc-rowtext{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;}
.sc-rowname{font-size:14.5px;font-weight:700;color:var(--spec-ink,#141320);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sc-rowmeta{font-size:12px;color:var(--spec-text-2nd,#615F72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sc-rowlive{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;color:var(--spec-violet-deep,#4A3DB0);flex-shrink:0;}
.sc-rowlive:hover{background:rgba(108,92,224,.08);}
.sc-editcol{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:18px;position:sticky;top:104px;max-height:calc(100vh - 124px);display:flex;flex-direction:column;overflow:hidden;}
.sc-kindpick{display:flex;flex-direction:column;flex:1;min-height:0;}
.sc-editplaceholder,.sc-kindpickbody{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;flex:1;padding:40px 28px;color:var(--spec-text-2nd,#615F72);}
.sc-editplaceholder p{margin:0;font-size:14px;max-width:260px;}
.sc-kindpickbody b{font-size:16px;color:var(--spec-ink,#141320);}
.sc-kindopts{display:flex;gap:14px;margin-top:4px;flex-wrap:wrap;justify-content:center;}
.sc-kindopt{display:flex;flex-direction:column;align-items:center;gap:8px;font-family:inherit;font-size:13.5px;font-weight:600;padding:20px 26px;border-radius:14px;border:1.5px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-violet-deep,#4A3DB0);cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-kindopt:hover{border-color:var(--spec-violet,#6C5CE0);background:rgba(108,92,224,.05);}
.sc-edithead{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--spec-border,#E2DFEC);}
.sc-backbtn{display:inline-flex;align-items:center;gap:6px;font-family:inherit;background:none;border:none;color:var(--spec-violet-deep,#4A3DB0);font-size:13px;font-weight:600;cursor:pointer;padding:4px 2px;}
.sc-backbtn:hover{color:var(--spec-violet,#6C5CE0);}
.sc-editheadmain{display:flex;align-items:center;gap:10px;flex:1;min-width:0;}
.sc-editheadmain .sc-lbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sc-editheadactions{display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:12.5px;}
.sc-editheadactions a{display:inline-flex;align-items:center;gap:4px;}
.sc-danger{color:var(--spec-text-2nd,#615F72);}
.sc-danger:hover{color:var(--spec-error,#CE4B43);}
.sc-editbody{padding:18px;overflow-y:auto;flex:1;min-height:0;}
.sc-savebar{display:flex;gap:12px;padding:14px 18px;border-top:1px solid var(--spec-border,#E2DFEC);background:#fff;}
.sc-savebar .sc-btn{flex:1;}
.sc-photostrip{margin-bottom:16px;}
.sc-photostripimgs{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;}
.sc-photothumb{width:64px;height:64px;border-radius:10px;overflow:hidden;border:1px solid var(--spec-border,#E2DFEC);flex-shrink:0;}
.sc-photothumb img{width:100%;height:100%;object-fit:cover;}
.sc-photoadd{width:64px;height:64px;border-radius:10px;border:1.5px dashed rgba(108,92,224,.4);display:grid;place-items:center;color:var(--spec-violet,#6C5CE0);cursor:pointer;background:rgba(108,92,224,.04);flex-shrink:0;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-photoadd:hover{background:rgba(108,92,224,.09);}
.sc-photoplaceholder{display:inline-block;font-size:13px;color:var(--spec-text-2nd,#615F72);padding:14px 16px;border:1px dashed var(--spec-border,#E2DFEC);border-radius:10px;background:var(--spec-surface,#EFEDF5);}
.sc-blocklabel{display:block;font-size:13.5px;font-weight:600;color:var(--spec-ink,#141320);margin-bottom:4px;}
@media(max-width:1020px){.sc-split{grid-template-columns:minmax(240px,320px) 1fr;}}
@media(max-width:768px){
  .sc-wrap{padding-left:16px;padding-right:16px;}
  .sc-split{display:block;}
  .sc-editcol{position:fixed;inset:0;z-index:50;border-radius:0;border:none;max-height:none;transform:translateX(100%);transition:transform var(--spec-duration-reveal,220ms) var(--spec-ease,ease);}
  .sc-editcol.is-open{transform:translateX(0);}
  .sc-editcol:not(.is-open){visibility:hidden;}
  .sc-savebar{padding-bottom:calc(14px + env(safe-area-inset-bottom));}
}

/* Motion (UI Standards Addendum §4) — restrained, local to this page. Fade+
   translateY entrances with a short stagger in the list, -2px hover lift,
   press scale(.98) on the new tappable rows/chips/cards, and the
   review-before-publish overlay gets a slide-up+fade entrance with a
   fading backdrop. Everything collapses to instant/opacity-only under
   prefers-reduced-motion, per the same rule. */
@keyframes sc-fade-up{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
@keyframes sc-modal-backdrop-in{from{opacity:0;}to{opacity:1;}}
@keyframes sc-modal-in{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
.sc-list li{animation:sc-fade-up 280ms var(--spec-ease,ease-out) backwards;}
.sc-row:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(20,19,32,.08);}
.sc-row.is-active:hover{transform:none;}
.sc-chip:active,.sc-kindopt:active,.sc-rowmain:active{transform:scale(.98);transition:transform 100ms ease;}
.sc-autosaveflash{align-self:center;font-size:12.5px;color:var(--spec-success,#2F9E6A);animation:sc-fade-up 200ms var(--spec-ease,ease-out);margin-right:auto;}
.sc-modal{animation:sc-modal-backdrop-in 200ms var(--spec-ease,ease-out);}
.sc-modal-in{animation:sc-modal-in 280ms var(--spec-ease,ease-out);}
@media(prefers-reduced-motion:reduce){
  .sc-editcol{transition:none;}
  .sc-list li,.sc-modal,.sc-modal-in{animation:none;}
  .sc-row:hover,.sc-chip:active,.sc-kindopt:active,.sc-rowmain:active{transform:none;}
  .sc-autosaveflash{animation:none;}
}

/* Listing-creation wizard v1 (2026-07-30) — "+ New listing" now opens this
   category/details/pricing/review flow instead of the full form directly.
   Reuses .sc-edithead/.sc-editbody/.sc-savebar/.sc-field/.sc-cb/.sc-btn/
   .sc-prev-card chrome from the editor above; only new step content and
   controls are styled here.

   CategoryChipPicker (src/components/vendor/CategoryChipPicker.tsx, shared
   with vendor onboarding) renders its own vo-cat*/vo-chip* classnames with
   no styles of its own — this page has no other stylesheet reaching it, so
   those are styled below using this page's own --spec-* tokens (NOT the
   onboarding page's --p/--line/--surf aliases — same colors, same values,
   just this page's existing token names). */
.vo-catpicker{width:100%;}
.vo-catchips{margin-bottom:4px;}
.vo-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
.vo-chip{font-family:inherit;display:inline-flex;align-items:center;gap:6px;padding:11px 16px;min-height:44px;border-radius:99px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);font-size:14px;font-weight:400;cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vo-chip:hover{border-color:var(--spec-violet,#6C5CE0);}
.vo-chip:active{transform:scale(.96);transition:transform 100ms ease;}
.vo-chip.on{background:rgba(108,92,224,.1);border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);font-weight:600;}
.vo-catsearch-row{position:relative;display:flex;align-items:center;margin-top:8px;}
.vo-catsearch-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#8A87A0;pointer-events:none;}
.vo-catsearch-input{width:100%;box-sizing:border-box;font-family:inherit;padding:13px 16px 13px 40px;min-height:48px;border-radius:12px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);font-size:15px;outline:none;}
.vo-catsearch-input:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.vo-catsuggest{margin-top:8px;}
.vo-catsuglist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;overflow:hidden;background:#fff;}
.vo-catsugbtn{width:100%;display:flex;align-items:center;gap:8px;font-family:inherit;font-size:14px;color:var(--spec-ink,#141320);background:none;border:none;text-align:left;padding:12px 14px;min-height:44px;cursor:pointer;}
.vo-catsugbtn:hover{background:var(--spec-surface,#EFEDF5);}
.vo-catsugbtn svg{color:var(--spec-violet,#6C5CE0);flex-shrink:0;}
.vo-catnoresults{font-size:13.5px;color:var(--spec-text-2nd,#615F72);padding:10px 2px;margin:0;}
.vo-catpopular{margin-top:20px;}
.vo-catpopular-h{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#8A87A0;margin:0 0 8px;}

.sc-wiz{display:flex;flex-direction:column;flex:1;min-height:0;}
.sc-wizdots{display:flex;align-items:center;gap:6px;padding:12px 18px 0;flex-wrap:wrap;}
.sc-wizdot{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--spec-text-2nd,#615F72);}
.sc-wizdot:not(:last-child)::after{content:'';width:16px;height:1px;background:var(--spec-border,#E2DFEC);margin:0 2px;}
.sc-wizdotmark{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--spec-border,#E2DFEC);display:grid;place-items:center;flex-shrink:0;color:#fff;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease),border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-wizdot.active .sc-wizdotmark,.sc-wizdot.done .sc-wizdotmark{border-color:var(--spec-violet,#6C5CE0);background:var(--spec-violet,#6C5CE0);}
.sc-wizdot.active .sc-wizdotmark::before{content:'';width:6px;height:6px;border-radius:50%;background:#fff;}
.sc-wizdot.active .sc-wizdotlabel{color:var(--spec-violet-deep,#4A3DB0);}
.sc-wizdotlabel{white-space:nowrap;}
@media(max-width:560px){.sc-wizdotlabel{display:none;}.sc-wizdot:not(:last-child)::after{width:10px;}}

.sc-wizstep{animation:sc-fade-up 280ms var(--spec-ease,ease-out);}
.sc-wiztitle{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:19px;font-weight:700;margin:4px 0 4px;color:var(--spec-ink,#141320);}
.sc-wizwhy{font-size:13px;color:var(--spec-text-2nd,#615F72);margin:0 0 16px;}
.sc-wizhint{font-size:12.5px;color:var(--spec-text-2nd,#615F72);margin:8px 0 0;}
.sc-wizfootnote{font-size:12.5px;color:var(--spec-text-2nd,#615F72);margin:8px 18px 0;text-align:right;}
.sc-wizbreadcrumb{font-size:12px;color:var(--spec-violet-deep,#4A3DB0);margin:10px 0 0;}
.sc-wizcharcount{font-size:11.5px;color:var(--spec-text-2nd,#615F72);margin:4px 0 0;text-align:right;}
.sc-wizstatic{font-size:13.5px;color:var(--spec-ink,#141320);margin:6px 0 0;}

.sc-wizphotozone{border:1.5px dashed rgba(108,92,224,.4);border-radius:14px;padding:16px;margin-bottom:18px;background:rgba(108,92,224,.03);}

.sc-wizavail{margin-bottom:20px;}
.sc-wizavailtoggle{display:inline-flex;gap:8px;margin-top:8px;flex-wrap:wrap;}
.sc-wizavailbtn{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:13px;font-weight:600;min-height:40px;padding:8px 16px;border-radius:99px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-text-2nd,#615F72);cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease),color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-wizavailbtn:hover{border-color:var(--spec-violet,#6C5CE0);}
.sc-wizavailbtn.active{background:var(--spec-violet,#6C5CE0);border-color:var(--spec-violet,#6C5CE0);color:#fff;}

.sc-wizcards{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:6px;}
@media(max-width:480px){.sc-wizcards{grid-template-columns:1fr;}}
.sc-wizcard{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:10px;min-height:44px;padding:16px;border-radius:14px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);font-family:inherit;font-size:13.5px;font-weight:600;text-align:left;cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.sc-wizcard:hover{border-color:var(--spec-violet,#6C5CE0);}
.sc-wizcard:active{transform:scale(.98);transition:transform 100ms ease;}
.sc-wizcard.on{background:rgba(108,92,224,.08);border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.sc-wizcardicon{width:36px;height:36px;border-radius:10px;background:var(--spec-surface,#EFEDF5);color:var(--spec-ink,#141320);display:grid;place-items:center;position:relative;}
.sc-wizcard.on .sc-wizcardicon{background:#fff;color:var(--spec-violet,#6C5CE0);}
.sc-wizcardicon2{position:absolute;bottom:-3px;right:-4px;background:#fff;border-radius:4px;color:inherit;}
.sc-wizcardcheck{position:absolute;top:10px;right:10px;width:18px;height:18px;color:var(--spec-violet,#6C5CE0);display:grid;place-items:center;}
.sc-wizdynamic{margin-top:14px;padding-top:14px;border-top:1px dashed var(--spec-border,#E2DFEC);}

.sc-wiz-previewcard em{font-style:normal;font-size:13.5px;font-weight:700;color:var(--spec-violet-deep,#4A3DB0);margin-top:4px;}

/* Wizard footer has 3 buttons (Back to listings is in the header instead;
   this is Save draft + the step's primary action) on steps 2-4, one more
   than the old panel's savebar ever has — at phone widths give it a second
   row instead of squeezing three equal-flex buttons into 2-line labels. */
@media(max-width:480px){
  .sc-wiz .sc-savebar{flex-wrap:wrap;}
  .sc-wiz .sc-savebar .sc-btn{flex:1 1 auto;min-width:112px;}
}

@media(prefers-reduced-motion:reduce){
  .sc-wizstep{animation:none;}
  .vo-chip:active,.sc-wizcard:active{transform:none;}
}
`;
