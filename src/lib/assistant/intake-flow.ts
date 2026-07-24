// Deterministic client-intake question engine.
// Encodes the NXT//LINK question logic so the Client Intake Assistant works
// with OR without an LLM. The LLM (when available) only rephrases; this engine
// guarantees the right follow-ups, one at a time, and a final summary.

export type Category =
  | 'forklift' | 'staffing' | 'warehouse_tech' | 'transportation' | 'facility' | 'unsure';

export interface Question {
  id: string;
  en: string;
  es: string;
  why_en?: string;
  why_es?: string;
}

export interface IntakeAnswer { q: string; a: string; id?: string }

// ── Category detection from free text ──────────────────────────────────────
const KEYWORDS: Record<Exclude<Category, 'unsure'>, string[]> = {
  forklift: ['forklift', 'montacarga', 'lift truck', 'pallet jack', 'reach truck'],
  staffing: ['staff', 'worker', 'labor', 'labour', 'hire', 'personal', 'temp', 'shift', 'operator', 'picker'],
  warehouse_tech: ['wms', 'inventory', 'software', 'barcode', 'rfid', 'dashboard', 'sensor', 'automation', 'system', 'tech', 'scanner', 'integration', 'tecnolog'],
  transportation: ['freight', 'ftl', 'ltl', 'shipping', 'delivery', 'transport', 'logistics', 'lane', 'cross-border', 'carrier', 'truck', 'envio'],
  facility: ['facility', 'maintenance', 'hvac', 'dock door', 'roof', 'electrical', 'plumbing', 'building', 'install', 'inspection', 'mantenimiento'],
};

const CATEGORY_ORDER: Exclude<Category, 'unsure'>[] =
  ['forklift', 'staffing', 'warehouse_tech', 'transportation', 'facility'];

export function detectCategory(
  text: string,
  excluded?: Set<Exclude<Category, 'unsure'>>,
): Category {
  const lower = text.toLowerCase();
  // forklift maintenance is the most specific signal; check it first
  for (const cat of CATEGORY_ORDER) {
    if (excluded?.has(cat)) continue;
    if (KEYWORDS[cat].some((k) => lower.includes(k))) return cat;
  }
  return 'unsure';
}

// ── Self-correction: has the buyer rejected a category? ─────────────────────
// A buyer's later reply can explicitly contradict the category the engine
// locked onto ("1 pallet jack, not a forklift" / "no es un montacarga") —
// that must reopen classification instead of railroading them through the
// wrong branch's questions (audit 2026-07-23). We only look for a negation
// word immediately before one of THAT category's own keywords, and only
// within a single message at a time (never across the whole transcript) —
// so an unrelated "No" answered to a later yes/no question can't retroactively
// "negate" an unrelated keyword from an earlier message.
const NEGATION_WORD = /^(not|no|isn'?t|aren'?t|don'?t|doesn'?t|wasn'?t|weren'?t)$/i;
// How many words immediately before the keyword we treat as "negating" it.
// Word-based (not a character count): a fixed char window would either miss
// longer negations ("isn't really a forklift") or false-positive on a short
// unrelated word (a "No, just the north dock door" answer to a yes/no
// question shouldn't count as negating "dock door").
const NEGATION_LOOKBACK_WORDS = 3;

function isNegatedMatch(lowerText: string, keyword: string): boolean {
  let idx = lowerText.indexOf(keyword);
  while (idx !== -1) {
    const before = lowerText.slice(0, idx);
    const words = before.split(/[^a-zà-ÿñ']+/i).filter(Boolean);
    const nearby = words.slice(-NEGATION_LOOKBACK_WORDS);
    if (nearby.some((w) => NEGATION_WORD.test(w))) return true;
    idx = lowerText.indexOf(keyword, idx + 1);
  }
  return false;
}

export function categoryIsNegated(text: string, category: Exclude<Category, 'unsure'>): boolean {
  const lower = text.toLowerCase();
  return KEYWORDS[category].some((kw) => isNegatedMatch(lower, kw));
}

function categoryRejectedAnywhere(units: string[], category: Exclude<Category, 'unsure'>): boolean {
  return units.some((u) => u && categoryIsNegated(u, category));
}

// ── Per-category follow-up questions (exactly from the spec) ────────────────
const FLOWS: Record<Category, Question[]> = {
  forklift: [
    { id: 'qty', en: 'To help vendors quote accurately, how many forklifts are involved?', es: 'Para ayudar a los proveedores a cotizar con precisión, ¿cuántos montacargas están involucrados?', why_en: 'Vendors price by unit count.', why_es: 'Los proveedores cotizan por número de unidades.' },
    { id: 'brand', en: 'What brand and model are they?', es: '¿Qué marca y modelo son?' },
    { id: 'power', en: 'Are they electric, propane, diesel, or gas?', es: '¿Son eléctricos, de propano, diésel o gas?' },
    { id: 'type', en: 'Is this a repair or preventive maintenance?', es: '¿Es una reparación o mantenimiento preventivo?' },
    { id: 'down', en: 'Is any forklift currently down?', es: '¿Hay algún montacargas fuera de servicio ahora?' },
    { id: 'urgency', en: 'How urgent is it?', es: '¿Qué tan urgente es?' },
    { id: 'recurring', en: 'Do you need recurring preventive maintenance?', es: '¿Necesita mantenimiento preventivo recurrente?' },
    { id: 'photos', en: 'Can you upload forklift photos or data plates?', es: '¿Puede subir fotos de los montacargas o sus placas de datos?' },
  ],
  staffing: [
    { id: 'count', en: 'How many workers do you need?', es: '¿Cuántos trabajadores necesita?' },
    { id: 'positions', en: 'What positions?', es: '¿Qué puestos?' },
    { id: 'shift', en: 'What shift?', es: '¿Qué turno?' },
    { id: 'term', en: 'Temporary or permanent?', es: '¿Temporal o permanente?' },
    { id: 'start', en: 'What start date?', es: '¿Fecha de inicio?' },
    { id: 'experience', en: 'What experience is required?', es: '¿Qué experiencia se requiere?' },
    { id: 'certs', en: 'Any required certifications?', es: '¿Certificaciones requeridas?' },
    { id: 'bilingual', en: 'Is bilingual required?', es: '¿Se requiere personal bilingüe?' },
    { id: 'checks', en: 'Background check or drug test required?', es: '¿Se requiere verificación de antecedentes o prueba de drogas?' },
  ],
  warehouse_tech: [
    { id: 'process', en: 'What process are you trying to improve?', es: '¿Qué proceso intenta mejorar?' },
    { id: 'current', en: 'What system are you using now?', es: '¿Qué sistema usa actualmente?' },
    { id: 'track', en: 'What do you want to track better?', es: '¿Qué quiere rastrear mejor?' },
    { id: 'capabilities', en: 'Do you need WMS, inventory software, barcode, RFID, AI, dashboards, sensors, automation, or integrations?', es: '¿Necesita WMS, software de inventario, código de barras, RFID, AI, tableros, sensores, automatización o integraciones?' },
    { id: 'users', en: 'How many users?', es: '¿Cuántos usuarios?' },
    { id: 'locations', en: 'How many locations?', es: '¿Cuántas ubicaciones?' },
    { id: 'training', en: 'Do you need training or onboarding?', es: '¿Necesita capacitación o incorporación?' },
    { id: 'access', en: 'Do you need cloud or mobile access?', es: '¿Necesita acceso en la nube o móvil?' },
  ],
  transportation: [
    { id: 'origin', en: 'What is the origin?', es: '¿Cuál es el origen?' },
    { id: 'destination', en: 'What is the destination?', es: '¿Cuál es el destino?' },
    { id: 'mode', en: 'Is it FTL, LTL, local delivery, regional, national, or cross-border?', es: '¿Es FTL, LTL, entrega local, regional, nacional o transfronterizo?' },
    { id: 'weight', en: 'What is the weight and dimensions?', es: '¿Cuál es el peso y las dimensiones?' },
    { id: 'pickup', en: 'What is the pickup deadline?', es: '¿Cuál es la fecha límite de recolección?' },
    { id: 'delivery', en: 'What is the delivery deadline?', es: '¿Cuál es la fecha límite de entrega?' },
    { id: 'recurring', en: 'Is this a recurring lane or a one-time shipment?', es: '¿Es una ruta recurrente o un envío único?' },
    { id: 'customs', en: 'Is customs or a border crossing involved?', es: '¿Involucra aduanas o cruce fronterizo?' },
  ],
  facility: [
    { id: 'type', en: 'What type of maintenance?', es: '¿Qué tipo de mantenimiento?' },
    { id: 'area', en: 'What area of the facility?', es: '¿Qué área de la instalación?' },
    { id: 'urgent', en: 'Is it urgent?', es: '¿Es urgente?' },
    { id: 'work', en: 'Is it repair, inspection, installation, or recurring service?', es: '¿Es reparación, inspección, instalación o servicio recurrente?' },
    { id: 'compliance', en: 'Are permits, compliance documents, or insurance required?', es: '¿Se requieren permisos, documentos de cumplimiento o seguros?' },
    { id: 'photos', en: 'Can you upload photos?', es: '¿Puede subir fotos?' },
  ],
  unsure: [
    { id: 'problem', en: 'What is the main problem?', es: '¿Cuál es el problema principal?' },
    { id: 'slowing', en: 'What is slowing down your operation?', es: '¿Qué está retrasando su operación?' },
    { id: 'related', en: 'Is this related to equipment, people, technology, transportation, safety, maintenance, or inventory?', es: '¿Está relacionado con equipo, personas, tecnología, transporte, seguridad, mantenimiento o inventario?' },
    { id: 'improve', en: 'What would you like to improve?', es: '¿Qué le gustaría mejorar?' },
    { id: 'result', en: 'What result do you want?', es: '¿Qué resultado desea?' },
  ],
};

// Shared closing questions asked for every category (logistics + permissions)
const COMMON: Question[] = [
  { id: 'location', en: 'Where is this located (city/site)?', es: '¿Dónde se ubica (ciudad/sitio)?' },
  { id: 'deadline', en: 'What is your deadline?', es: '¿Cuál es su fecha límite?' },
  { id: 'budget', en: 'What is your budget range, if any?', es: '¿Cuál es su rango de presupuesto, si lo hay?', why_en: 'A range helps us match the right vendors; it stays hidden unless you allow sharing.', why_es: 'Un rango ayuda a encontrar proveedores; permanece oculto a menos que permita compartirlo.' },
  { id: 'nda', en: 'Do you require an NDA or MNDA before sharing details?', es: '¿Requiere un NDA o MNDA antes de compartir detalles?' },
  { id: 'scope', en: 'Do you want local vendors, global technology, or both?', es: '¿Desea proveedores locales, tecnología global o ambos?' },
  { id: 'share', en: 'May we share an anonymous summary of your request with vendors?', es: '¿Podemos compartir un resumen anónimo de su solicitud con proveedores?' },
];

export function buildQuestionPlan(category: Category): Question[] {
  return [...FLOWS[category], ...COMMON];
}

// ── Engine step ────────────────────────────────────────────────────────────
export interface IntakeState {
  category: Category;
  answers: IntakeAnswer[];
  done: boolean;
}

export interface IntakeStep {
  category: Category;
  question: Question | null;   // next question, or null when complete
  index: number;
  total: number;
  done: boolean;
  summary?: RequestSummary;
  // True when this step just re-opened classification because the buyer's
  // latest answer contradicted the previously locked category — lets the
  // client acknowledge the switch instead of silently changing the script.
  corrected?: boolean;
}

export interface RequestSummary {
  problem: string;
  category: string;
  quantity: string;
  location: string;
  deadline: string;
  budget_range: string;
  urgency: string;
  nda_required: boolean;
  permissions: string[];
  missing_info: string[];
  recommended_categories: string[];
  answers: IntakeAnswer[];
}

const CATEGORY_LABELS: Record<Category, string> = {
  forklift: 'Forklift & Material Handling',
  staffing: 'Staffing & Labor',
  warehouse_tech: 'Warehouse Technology',
  transportation: 'Transportation & Logistics',
  facility: 'Facility Maintenance',
  unsure: 'General (to be classified)',
};

const RECOMMENDED: Record<Category, string[]> = {
  forklift: ['Forklifts & Material Handling', 'Field Service & Maintenance'],
  staffing: ['Industrial Staffing', 'Workforce Solutions'],
  warehouse_tech: ['Warehouse Management', 'Automation & Robotics', 'IoT & Sensors'],
  transportation: ['Transportation Management', 'Cross-Border & Customs', 'Freight'],
  facility: ['Facility Maintenance', 'MEP & Compliance'],
  unsure: ['NXT//LINK Discovery'],
};

function findAnswer(answers: IntakeAnswer[], id: string): string {
  return answers.find((a) => a.id === id)?.a || '';
}

export function nextStep(initialText: string, state: IntakeState): IntakeStep {
  // Categories the buyer has explicitly rejected somewhere in the
  // conversation so far ("not a forklift") — excluded from detection below
  // even if one of their OTHER keywords (e.g. "pallet jack" is also a
  // forklift keyword) still appears in the text. Recomputed fresh from the
  // transcript every call, so a rejection sticks for the rest of the
  // conversation without needing extra state on the wire.
  const units = [initialText, ...state.answers.map((a) => a.a)];
  const rejected = new Set(CATEGORY_ORDER.filter((cat) => categoryRejectedAnywhere(units, cat)));

  const locked = state.category;
  const needsDetection = !locked || locked === 'unsure' || rejected.has(locked as Exclude<Category, 'unsure'>);
  // While no category is confidently locked, consider everything said so
  // far — not just the opening message — so a clarifying answer (including
  // the 'unsure' flow's own "is this related to equipment, people,
  // technology…" question) can move the buyer into the right branch.
  const category = needsDetection ? detectCategory(units.join(' '), rejected) : locked;
  const corrected = Boolean(needsDetection && locked && locked !== 'unsure' && locked !== category);

  const plan = buildQuestionPlan(category);
  // Count leading plan questions already answered, matched BY ID rather than
  // raw position — so a mid-conversation category switch (above) restarts
  // that category's own question set instead of skipping ahead using stale
  // positions left over from the category the buyer just corrected away from.
  // On a switch, also drop answers keyed to the OLD category's own question
  // ids (a couple of ids, e.g. 'type'/'photos', are reused by more than one
  // category with different wording) so a stale answer can't be mistaken for
  // an answer to the new category's differently-worded question of the same id.
  const staleIds = corrected && locked && locked !== 'unsure'
    ? new Set(FLOWS[locked].map((q) => q.id))
    : null;
  const answeredIds = new Set(
    state.answers
      .filter((a) => a.id && a.id !== 'opening' && !(staleIds && staleIds.has(a.id)))
      .map((a) => a.id),
  );
  let index = 0;
  while (index < plan.length && answeredIds.has(plan[index].id)) index++;

  if (index >= plan.length) {
    return {
      category,
      question: null,
      index: plan.length,
      total: plan.length,
      done: true,
      summary: buildSummary(category, initialText, state.answers),
      corrected,
    };
  }
  return { category, question: plan[index], index, total: plan.length, done: false, corrected };
}

export function buildSummary(category: Category, problemText: string, answers: IntakeAnswer[]): RequestSummary {
  const nda = /yes|si|sí|require|necesito|nda|mnda/i.test(findAnswer(answers, 'nda'));
  const shareOk = /yes|si|sí|ok|sure|allow|permito/i.test(findAnswer(answers, 'share'));
  const quantity = findAnswer(answers, 'qty') || findAnswer(answers, 'count') || findAnswer(answers, 'users') || '';
  const permissions: string[] = [];
  if (shareOk) permissions.push('Share anonymous summary');
  if (!nda) permissions.push('No NDA required');
  else permissions.push('NDA/MNDA required before details');

  const fields: [string, string][] = [
    ['Location', findAnswer(answers, 'location')],
    ['Deadline', findAnswer(answers, 'deadline')],
    ['Budget range', findAnswer(answers, 'budget')],
  ];
  const missing = fields.filter(([, v]) => !v.trim()).map(([k]) => k);

  return {
    problem: problemText || findAnswer(answers, 'problem') || answers[0]?.a || '',
    category: CATEGORY_LABELS[category],
    quantity,
    location: findAnswer(answers, 'location'),
    deadline: findAnswer(answers, 'deadline'),
    budget_range: findAnswer(answers, 'budget'),
    urgency: findAnswer(answers, 'urgency') || findAnswer(answers, 'urgent') || '',
    nda_required: nda,
    permissions,
    missing_info: missing,
    recommended_categories: RECOMMENDED[category],
    answers,
  };
}

export { CATEGORY_LABELS };
