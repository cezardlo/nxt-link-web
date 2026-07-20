// NXT//LINK Assistant — shared branding strings (EN / ES)

export const ASSISTANT = {
  name: 'NXT//LINK Assistant',
  name_es: 'Asistente NXT//LINK',
  subtitle: 'AI assistant · a human follows up',
  subtitle_es: 'Asistente de AI · un humano dará seguimiento',
} as const;

export type Locale = 'en' | 'es';

export function t(locale: Locale, en: string, es: string): string {
  return locale === 'es' ? es : en;
}

// Client-facing progress statuses (ordered)
export const CLIENT_STATUSES: { key: string; en: string; es: string }[] = [
  { key: 'request_received',  en: 'Request received',    es: 'Solicitud recibida' },
  { key: 'reviewing_details', en: 'Reviewing details',   es: 'Revisando detalles' },
  { key: 'searching_vendors', en: 'Searching vendors',   es: 'Buscando proveedores' },
  { key: 'contacting_vendors',en: 'Contacting vendors',  es: 'Contactando proveedores' },
  { key: 'collecting_quotes', en: 'Collecting quotes',   es: 'Recolectando cotizaciones' },
  { key: 'comparing_options', en: 'Comparing options',   es: 'Comparando opciones' },
  { key: 'options_ready',     en: 'Options ready',       es: 'Opciones listas' },
  { key: 'next_step_pending', en: 'Next step pending',   es: 'Próximo paso pendiente' },
  { key: 'vendor_selected',   en: 'Vendor selected',     es: 'Proveedor seleccionado' },
  { key: 'closed',            en: 'Closed',              es: 'Cerrado' },
];

// Admin kanban columns
export const REQUEST_PIPELINE = [
  'new_request','needs_more_info','ready_for_vendor_search','vendor_search',
  'quote_packets_sent','waiting_for_quotes','quotes_received','comparing_options',
  'sent_to_client','client_selected','closed','lost',
] as const;

// Vendor opportunity statuses
export const VENDOR_OPP_STATUSES = [
  'new_opportunity','viewed','interested','needs_more_info','quote_in_progress',
  'quote_submitted','declined','selected','not_selected','expired',
] as const;
