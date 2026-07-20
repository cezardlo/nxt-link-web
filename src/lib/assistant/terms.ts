// NXT//LINK quote terms + agreement language library.
// Generates DRAFT template language for vendor quotes — terms & conditions,
// warranty, payment, exclusions, lead time, emergency service, confidentiality,
// and the NXT//LINK introduction/commission agreement acknowledgement.
//
// IMPORTANT: This is template language for review, NOT legal advice. The
// disclaimer is always included so the assistant never crosses the
// "no legal advice" guardrail.

import type { Locale } from './branding';

export interface TermsBlock {
  quote_validity: string;
  payment_terms: string;
  warranty: string;
  exclusions: string;
  lead_time: string;
  emergency_service: string;
  liability_insurance: string;
  confidentiality: string;
  introduction_agreement: string;
  terms_and_conditions: string;
  disclaimer: string;
}

export interface TermsOptions {
  vendorName?: string;
  category?: string;
  validityDays?: number;
  nda?: boolean;
  emergency?: boolean;
  warrantyMonths?: number;
}

const DISCLAIMER_EN =
  'DRAFT template language for review only — this is not legal advice. Have your own attorney review and adapt these terms before use.';
const DISCLAIMER_ES =
  'Lenguaje de plantilla en BORRADOR solo para revisión — esto no es asesoría legal. Haga que su propio abogado revise y adapte estos términos antes de usarlos.';

export function generateTerms(locale: Locale, opts: TermsOptions = {}): TermsBlock {
  const es = locale === 'es';
  const v = opts.validityDays ?? 30;
  const wm = opts.warrantyMonths ?? 12;
  const vendor = opts.vendorName?.trim() || (es ? 'el Proveedor' : 'the Vendor');
  const cat = (opts.category || '').toLowerCase();

  // Category-aware lead time / warranty flavor
  const leadFlavorEn =
    cat.includes('forklift') || cat.includes('facility') || cat.includes('maintenance')
      ? 'Standard service is scheduled within 3–5 business days of a signed quote; parts subject to supplier availability.'
      : cat.includes('staff')
        ? 'Qualified candidates are typically presented within 3–7 business days of an approved order.'
        : cat.includes('transport') || cat.includes('logist')
          ? 'Pickup is scheduled per the agreed lane; transit times are estimates and exclude carrier or customs delays.'
          : 'Lead times are estimates from the date of a signed quote and approved access to the site/systems.';
  const leadFlavorEs =
    cat.includes('forklift') || cat.includes('facility') || cat.includes('maintenance')
      ? 'El servicio estándar se programa dentro de 3–5 días hábiles tras una cotización firmada; las partes están sujetas a disponibilidad del proveedor.'
      : cat.includes('staff')
        ? 'Los candidatos calificados se presentan normalmente dentro de 3–7 días hábiles tras una orden aprobada.'
        : cat.includes('transport') || cat.includes('logist')
          ? 'La recolección se programa según la ruta acordada; los tiempos de tránsito son estimados y excluyen demoras del transportista o aduana.'
          : 'Los tiempos de entrega son estimados desde la fecha de una cotización firmada y el acceso aprobado al sitio/sistemas.';

  if (es) {
    return {
      quote_validity: `Esta cotización es válida por ${v} días a partir de su fecha de emisión. Después de ese periodo, los precios y la disponibilidad pueden cambiar y requieren reconfirmación.`,
      payment_terms: `Términos de pago: Neto 30 desde la fecha de factura, salvo acuerdo por escrito. Puede requerirse un depósito para partes especiales o trabajos mayores. Los pagos atrasados pueden generar un cargo del 1.5% mensual.`,
      warranty: `Garantía: La mano de obra de ${vendor} está garantizada por ${wm} meses contra defectos de ejecución. Las garantías de partes siguen las del fabricante. La garantía no cubre mal uso, alteraciones ni desgaste normal.`,
      exclusions: `Exclusiones: impuestos, permisos, partes mayores no listadas, trabajo fuera de horario, condiciones imprevistas del sitio y cualquier alcance no descrito explícitamente en esta cotización.`,
      lead_time: leadFlavorEs,
      emergency_service: opts.emergency
        ? `Servicio de emergencia: disponible 24/7 con tarifa premium. El tiempo de respuesta objetivo es de 2–4 horas dentro del área de servicio; las llamadas fuera de horario se facturan a la tarifa de emergencia vigente.`
        : `Servicio de emergencia disponible bajo solicitud a tarifas premium; confirme cobertura y tiempos de respuesta por escrito.`,
      liability_insurance: `Seguro y responsabilidad: ${vendor} mantiene seguro de responsabilidad civil general y compensación laboral, y proporcionará certificados a solicitud. La responsabilidad se limita al valor de los servicios prestados.`,
      confidentiality: opts.nda
        ? `Confidencialidad: este intercambio está sujeto al NDA/MNDA vigente. La información del cliente, archivos y precios se tratan como confidenciales y no se divulgan a terceros sin aprobación de NXT//LINK.`
        : `Confidencialidad: la información compartida en esta oportunidad se trata como confidencial y se usa solo para preparar y entregar esta cotización.`,
      introduction_agreement: `Acuerdo de introducción NXT//LINK: el Proveedor reconoce que esta oportunidad fue presentada por NXT//LINK. El Proveedor acepta no eludir a NXT//LINK con el cliente presentado y reconoce los términos de comisión de NXT//LINK vigentes. Esta introducción queda registrada como Prueba de Introducción.`,
      terms_and_conditions: `Términos generales: La aceptación de esta cotización constituye un acuerdo con los términos aquí establecidos. El alcance del trabajo se limita a lo descrito; los cambios requieren una orden de cambio por escrito. Cualquier controversia se resolverá de buena fe; la ley aplicable es la del estado de Texas.`,
      disclaimer: DISCLAIMER_ES,
    };
  }

  return {
    quote_validity: `This quote is valid for ${v} days from its issue date. After that period, pricing and availability may change and require reconfirmation.`,
    payment_terms: `Payment terms: Net 30 from invoice date unless otherwise agreed in writing. A deposit may be required for special-order parts or major work. Late payments may accrue a 1.5% monthly service charge.`,
    warranty: `Warranty: ${vendor}'s labor is warranted for ${wm} months against defects in workmanship. Parts warranties follow the manufacturer's terms. Warranty excludes misuse, alterations, and normal wear.`,
    exclusions: `Exclusions: taxes, permits, major parts not itemized, after-hours work, unforeseen site conditions, and any scope not explicitly described in this quote.`,
    lead_time: leadFlavorEn,
    emergency_service: opts.emergency
      ? `Emergency service: available 24/7 at a premium rate. Target response time is 2–4 hours within the service area; after-hours calls are billed at the prevailing emergency rate.`
      : `Emergency service available on request at premium rates; confirm coverage and response times in writing.`,
    liability_insurance: `Insurance & liability: ${vendor} carries general liability and workers' compensation coverage and will provide certificates on request. Liability is limited to the value of services rendered.`,
    confidentiality: opts.nda
      ? `Confidentiality: this exchange is subject to the active NDA/MNDA. Client information, files, and pricing are treated as confidential and not disclosed to third parties without NXT//LINK approval.`
      : `Confidentiality: information shared in this opportunity is treated as confidential and used only to prepare and deliver this quote.`,
    introduction_agreement: `NXT//LINK introduction agreement: Vendor acknowledges this opportunity was introduced by NXT//LINK. Vendor agrees not to circumvent NXT//LINK with the introduced client and acknowledges NXT//LINK's prevailing commission terms. This introduction is recorded as a Proof of Introduction.`,
    terms_and_conditions: `General terms: Acceptance of this quote constitutes agreement to the terms herein. Scope of work is limited to what is described; changes require a written change order. Disputes are resolved in good faith; governing law is the State of Texas.`,
    disclaimer: DISCLAIMER_EN,
  };
}

// Field labels for rendering (EN/ES)
export const TERMS_LABELS: Record<keyof TermsBlock, { en: string; es: string }> = {
  quote_validity:         { en: 'Quote validity',          es: 'Validez de la cotización' },
  payment_terms:          { en: 'Payment terms',           es: 'Términos de pago' },
  warranty:               { en: 'Warranty',                es: 'Garantía' },
  exclusions:             { en: 'Exclusions',              es: 'Exclusiones' },
  lead_time:              { en: 'Lead time',               es: 'Tiempo de entrega' },
  emergency_service:      { en: 'Emergency service',       es: 'Servicio de emergencia' },
  liability_insurance:    { en: 'Insurance & liability',   es: 'Seguro y responsabilidad' },
  confidentiality:        { en: 'Confidentiality',         es: 'Confidencialidad' },
  introduction_agreement: { en: 'NXT//LINK introduction agreement', es: 'Acuerdo de introducción NXT//LINK' },
  terms_and_conditions:   { en: 'Terms & conditions',      es: 'Términos y condiciones' },
  disclaimer:             { en: 'Disclaimer',              es: 'Aviso' },
};
