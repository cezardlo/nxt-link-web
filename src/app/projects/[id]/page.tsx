'use client';

// /projects/[id] — the project workspace. One screen answers "where is
// everything?": stage + next action up top, then Overview, Vendors (shortlist),
// Documents, and an append-only History timeline. Buyer edits inline; every
// change is saved and logged.
// Fully EN/ES via the shared LanguageToggle/useLang pattern (see /buyer).

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { IBM_Plex_Sans } from 'next/font/google';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';
import {
  ClipboardList, CheckCircle2, Search, Send, Inbox, Scale, HelpCircle,
  UserCheck, Wrench, Trophy, Archive, Users, ClipboardCheck, Truck, FileText,
  Clock, XCircle, SkipForward, Star, type LucideIcon,
} from 'lucide-react';
import { StageTracker, STAGE_TRACKER_CSS } from '@/components/marketplace/StageTracker';
import { EmptyAction, EMPTY_ACTION_CSS } from '@/components/marketplace/EmptyAction';
import { QuoteCompareTable, QUOTE_COMPARE_TABLE_CSS, type CompareTableRow, DEFAULT_COMPARE_LABELS } from '@/components/marketplace/QuoteCompareTable';
import { MOTION_CSS, staggerStyle } from '@/components/motion/Motion';
import type { QuoteExtras } from '@/lib/requests/structured';

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): visual/CSS
// only — every handler and state above is unchanged. The soft-blue best-value
// fill-bar color (#3B6EA5, per vault/Decisions.md) is intentionally preserved.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-pd',
  display: 'swap',
});

interface Project {
  id: string; name: string; company_name: string | null; problem: string | null;
  desired_outcome: string | null; location: string | null; budget_range: string | null;
  timeline: string | null; priority: string; stage: string; next_action: string | null;
  opportunity_ref: string | null; requirements: Record<string, unknown>; updated_at: string;
}
interface Vendor { id: string; vendor_id: string | null; listing_kind: string | null; listing_id: string | null; source: string; status: string; fit_note: string | null; private_note: string | null }
interface Doc { id: string; kind: string; title: string; external_url: string | null; vendor_id: string | null; note: string | null; created_at: string }
interface Task { id: string; title: string; detail: string | null; due_date: string | null; status: string }
interface Decision { id: string; decision: string; reason: string | null; decided_at: string }
interface Ev { id: string; actor_name: string | null; event: string; detail: Record<string, unknown>; created_at: string }
interface Commission { commission_amount: number | null; effective_rate: number | null; status: string | null }
interface Quote {
  id: string; public_ref: string; opportunity_ref: string | null; kind: string; company: string | null;
  quote_amount: number | null; quote_currency: string | null; quote_timeline: string | null;
  quote_valid_until: string | null; quoted_at: string | null; status: string; buyer_decision: string | null;
  commission: Commission | null; quote_payment_terms?: string | null; quote_warranty?: string | null;
  quote_extras?: QuoteExtras | null;
}
interface Approval { id: string; kind: string; status: string; approver_name: string | null; note: string | null; due_date: string | null; decided_at: string | null }
interface Milestone { id: string; kind: string; title: string | null; status: string; due_date: string | null; note: string | null }

const STAGES = ['organizing', 'requirements_ready', 'matching', 'vendors_invited', 'collecting_quotes', 'comparing', 'decision', 'vendor_selected', 'implementation', 'completed'];

const T: Record<Lang, Record<string, string>> = {
  en: {
    loading: 'Loading your project…',
    accessDenied: 'You don’t have access to this project.',
    backToWorkspace: 'Back to workspace',
    projectNotFound: 'Project not found.',
    workspaceTag: 'Workspace',
    allProjects: '← All projects',
    nextAction: 'Next action',
    nextActionPlaceholder: 'What should happen next?',
    advanceTo: 'Advance to “{label}” →',
    priorityLow: 'Low priority',
    priorityMedium: 'Medium priority',
    priorityHigh: 'High priority',
    priorityUrgent: 'Urgent',
    tabOverview: 'Overview',
    tabQuotes: 'Quotes',
    tabVendors: 'Vendors',
    tabApprovals: 'Approvals',
    tabDelivery: 'Delivery',
    tabDocuments: 'Documents',
    tabHistory: 'History',
    problemLabel: 'The problem',
    desiredOutcomeLabel: 'Desired outcome',
    locationLabel: 'Location',
    budgetLabel: 'Budget',
    budgetPlaceholder: 'e.g. $10k–$25k',
    timelineLabel: 'Timeline',
    timelinePlaceholder: 'e.g. within 30 days',
    categoriesLabel: 'Categories',
    collectBetterQuotesLabel: 'To collect for better quotes',
    nextStepsLabel: 'Next steps',
    openCount: '{n} open',
    markAsOpen: 'Mark “{title}” as open',
    markAsDone: 'Mark “{title}” as done',
    dueDate: 'due {date}',
    addNextStepPlaceholder: 'Add a next step…',
    add: 'Add',
    notesDecisionsLabel: 'Notes & decisions',
    recordNotePlaceholder: 'Record a note or decision…',
    save: 'Save',
    noVendorsTitle: 'No vendors shortlisted yet',
    browseMarketplace: 'Browse the marketplace',
    vendorsHint: 'Add vendors from the Marketplace — open a listing and “Save to project”. Inviting a vendor creates a quote request linked to this project.',
    sourceInvited: 'Invited',
    sourceRecommended: 'Recommended',
    vendorFallback: 'Vendor',
    noQuotesTitle: 'No quotes yet',
    noQuotesHint: 'Invite vendors from your shortlist and their proposals land here — with versions and expiry.',
    inviteVendors: 'Invite vendors',
    browseMarketplaceSecondary: 'Browse marketplace',
    accepted: 'Accepted',
    quoteReceived: 'Quote received',
    awaitingQuote: 'Awaiting quote',
    validTo: 'valid to {date}',
    feeIfWon: 'NXT//LINK fee if won: {amount} ({rate}%) · {status}',
    noApprovalsTitle: 'No approvals requested yet',
    noApprovalsHint: 'Add the sign-offs your purchase needs — budget, safety, engineering, final decision.',
    approve: 'Approve',
    reject: 'Reject',
    requestApproval: 'Request approval',
    statusPending: 'pending',
    statusApproved: 'approved',
    statusRejected: 'rejected',
    statusSkipped: 'skipped',
    statusDone: 'done',
    noDeliveryTitle: 'No delivery steps yet',
    noDeliveryHint: 'Track the after-sale steps here once a vendor is selected: PO, delivery, installation, training, testing, acceptance, warranty.',
    markAsPending: 'Mark “{title}” as pending',
    markMilestoneAsDone: 'Mark “{title}” as done',
    addStep: 'Add step',
    noDocumentsTitle: 'No documents yet',
    noDocumentsHint: 'Add quotes, drawings, contracts, or warranties so nothing lives in email.',
    docTitlePlaceholder: 'Document title (e.g. Vendor A quote v1)',
    docLinkPlaceholder: 'Link (optional)',
    addDocument: 'Add document',
    someone: 'Someone',
    stageOrganizing: 'Organizing',
    stageRequirementsReady: 'Requirements ready',
    stageMatching: 'Matching vendors',
    stageVendorsInvited: 'Vendors invited',
    stageCollectingQuotes: 'Collecting quotes',
    stageComparing: 'Comparing',
    stageDecision: 'Decision needed',
    stageVendorSelected: 'Vendor selected',
    stageImplementation: 'Implementation',
    stageCompleted: 'Completed',
    stageArchived: 'Archived',
    eventCreated: 'Project created',
    eventUpdated: 'Details updated',
    eventStageChanged: 'Stage changed',
    eventVendorSaved: 'Vendor shortlisted',
    eventTaskAdded: 'Task added',
    eventTaskDone: 'Task completed',
    eventTaskSkipped: 'Task skipped',
    eventTaskOpen: 'Task reopened',
    eventNoteAdded: 'Note added',
    eventDecisionRecorded: 'Decision recorded',
    eventDocumentAdded: 'Document added',
    approvalBudget: 'Budget approval',
    approvalSafety: 'Safety review',
    approvalEngineering: 'Engineering review',
    approvalOperations: 'Operations review',
    approvalFinalDecision: 'Final decision',
    approvalPurchaseOrder: 'Purchase order',
    approvalContract: 'Contract',
    milestonePurchaseOrder: 'Purchase order',
    milestoneProduction: 'Production',
    milestoneShipping: 'Shipping',
    milestoneDelivery: 'Delivery',
    milestoneInstallation: 'Installation',
    milestoneIntegration: 'Integration',
    milestoneTraining: 'Training',
    milestoneTesting: 'Testing',
    milestoneAcceptance: 'Customer acceptance',
    milestoneWarrantyStart: 'Warranty start',
    milestoneMaintenance: 'Maintenance',
    milestoneIssue: 'Issue',
  },
  es: {
    loading: 'Cargando tu proyecto…',
    accessDenied: 'No tienes acceso a este proyecto.',
    backToWorkspace: 'Volver al workspace',
    projectNotFound: 'Proyecto no encontrado.',
    workspaceTag: 'Workspace',
    allProjects: '← Todos los proyectos',
    nextAction: 'Siguiente acción',
    nextActionPlaceholder: '¿Qué debe pasar después?',
    advanceTo: 'Avanzar a “{label}” →',
    priorityLow: 'Prioridad baja',
    priorityMedium: 'Prioridad media',
    priorityHigh: 'Prioridad alta',
    priorityUrgent: 'Urgente',
    tabOverview: 'Resumen',
    tabQuotes: 'Cotizaciones',
    tabVendors: 'Proveedores',
    tabApprovals: 'Aprobaciones',
    tabDelivery: 'Entrega',
    tabDocuments: 'Documentos',
    tabHistory: 'Historial',
    problemLabel: 'El problema',
    desiredOutcomeLabel: 'Resultado deseado',
    locationLabel: 'Ubicación',
    budgetLabel: 'Presupuesto',
    budgetPlaceholder: 'p. ej. $10k–$25k',
    timelineLabel: 'Plazo',
    timelinePlaceholder: 'p. ej. dentro de 30 días',
    categoriesLabel: 'Categorías',
    collectBetterQuotesLabel: 'Para recopilar mejores cotizaciones',
    nextStepsLabel: 'Próximos pasos',
    openCount: '{n} abiertas',
    markAsOpen: 'Marcar “{title}” como abierto',
    markAsDone: 'Marcar “{title}” como hecho',
    dueDate: 'vence {date}',
    addNextStepPlaceholder: 'Agregar un siguiente paso…',
    add: 'Agregar',
    notesDecisionsLabel: 'Notas y decisiones',
    recordNotePlaceholder: 'Registrar una nota o decisión…',
    save: 'Guardar',
    noVendorsTitle: 'Aún no hay proveedores seleccionados',
    browseMarketplace: 'Explorar el marketplace',
    vendorsHint: 'Agrega proveedores desde Marketplace — abre una publicación y “Guardar en proyecto”. Invitar a un proveedor crea una solicitud de cotización vinculada a este proyecto.',
    sourceInvited: 'Invitado',
    sourceRecommended: 'Recomendado',
    vendorFallback: 'Proveedor',
    noQuotesTitle: 'Aún no hay cotizaciones',
    noQuotesHint: 'Invita a proveedores de tu lista y sus propuestas llegarán aquí — con versiones y vencimiento.',
    inviteVendors: 'Invitar proveedores',
    browseMarketplaceSecondary: 'Explorar marketplace',
    accepted: 'Aceptada',
    quoteReceived: 'Cotización recibida',
    awaitingQuote: 'Esperando cotización',
    validTo: 'válida hasta {date}',
    feeIfWon: 'Tarifa de NXT//LINK si ganas: {amount} ({rate}%) · {status}',
    noApprovalsTitle: 'Aún no hay aprobaciones solicitadas',
    noApprovalsHint: 'Agrega las aprobaciones que necesita tu compra — presupuesto, seguridad, ingeniería, decisión final.',
    approve: 'Aprobar',
    reject: 'Rechazar',
    requestApproval: 'Solicitar aprobación',
    statusPending: 'pendiente',
    statusApproved: 'aprobada',
    statusRejected: 'rechazada',
    statusSkipped: 'omitida',
    statusDone: 'hecho',
    noDeliveryTitle: 'Aún no hay pasos de entrega',
    noDeliveryHint: 'Da seguimiento a los pasos post-venta aquí una vez seleccionado un proveedor: OC, entrega, instalación, capacitación, pruebas, aceptación, garantía.',
    markAsPending: 'Marcar “{title}” como pendiente',
    markMilestoneAsDone: 'Marcar “{title}” como hecho',
    addStep: 'Agregar paso',
    noDocumentsTitle: 'Aún no hay documentos',
    noDocumentsHint: 'Agrega cotizaciones, planos, contratos o garantías para que nada quede en el correo.',
    docTitlePlaceholder: 'Título del documento (p. ej. Cotización proveedor A v1)',
    docLinkPlaceholder: 'Enlace (opcional)',
    addDocument: 'Agregar documento',
    someone: 'Alguien',
    stageOrganizing: 'Organizando',
    stageRequirementsReady: 'Requisitos listos',
    stageMatching: 'Buscando proveedores',
    stageVendorsInvited: 'Proveedores invitados',
    stageCollectingQuotes: 'Recopilando cotizaciones',
    stageComparing: 'Comparando',
    stageDecision: 'Decisión pendiente',
    stageVendorSelected: 'Proveedor seleccionado',
    stageImplementation: 'Implementación',
    stageCompleted: 'Completado',
    stageArchived: 'Archivado',
    eventCreated: 'Proyecto creado',
    eventUpdated: 'Detalles actualizados',
    eventStageChanged: 'Etapa cambiada',
    eventVendorSaved: 'Proveedor guardado',
    eventTaskAdded: 'Tarea añadida',
    eventTaskDone: 'Tarea completada',
    eventTaskSkipped: 'Tarea omitida',
    eventTaskOpen: 'Tarea reabierta',
    eventNoteAdded: 'Nota añadida',
    eventDecisionRecorded: 'Decisión registrada',
    eventDocumentAdded: 'Documento añadido',
    approvalBudget: 'Aprobación de presupuesto',
    approvalSafety: 'Revisión de seguridad',
    approvalEngineering: 'Revisión de ingeniería',
    approvalOperations: 'Revisión de operaciones',
    approvalFinalDecision: 'Decisión final',
    approvalPurchaseOrder: 'Orden de compra',
    approvalContract: 'Contrato',
    milestonePurchaseOrder: 'Orden de compra',
    milestoneProduction: 'Producción',
    milestoneShipping: 'Envío',
    milestoneDelivery: 'Entrega',
    milestoneInstallation: 'Instalación',
    milestoneIntegration: 'Integración',
    milestoneTraining: 'Capacitación',
    milestoneTesting: 'Pruebas',
    milestoneAcceptance: 'Aceptación del cliente',
    milestoneWarrantyStart: 'Inicio de garantía',
    milestoneMaintenance: 'Mantenimiento',
    milestoneIssue: 'Incidencia',
  },
};

const money = (n: number, c = 'USD') => n.toLocaleString('en-US', { style: 'currency', currency: c || 'USD', maximumFractionDigits: 0 });

// Icons+colors sweep (2026-07-30) — visual only, every status VALUE below is
// untouched. Same vocabulary as /projects' STAGE_ICON (kept as a sibling map
// here rather than a shared import, matching this file's existing pattern of
// its own STAGE_LABEL sibling copy).
const STAGE_ICON: Record<string, LucideIcon> = {
  organizing: ClipboardList, requirements_ready: CheckCircle2, matching: Search,
  vendors_invited: Send, collecting_quotes: Inbox, comparing: Scale,
  decision: HelpCircle, vendor_selected: UserCheck, implementation: Wrench,
  completed: Trophy, archived: Archive,
};
const VSRC_ICON: Record<string, LucideIcon> = { invited: Send, recommended: Star };
const QSTAT_ICON: Record<string, LucideIcon> = { accepted: CheckCircle2, quoted: FileText, await: Clock };
const APPROVAL_ICON: Record<string, LucideIcon> = { approved: CheckCircle2, rejected: XCircle, skipped: SkipForward };

const COMPARE_LABELS_ES = {
  title: 'Comparar cotizaciones',
  vendor: 'Proveedor',
  quote: 'Cotización',
  timeline: 'Tiempo',
  validUntil: 'Válido hasta',
  feeIfWon: 'Tarifa si gana',
  paymentTerms: 'Términos de pago',
  warranty: 'Garantía',
  status: 'Estado',
  lowest: 'Más baja',
  awaiting: 'Pendiente',
  received: 'Recibida',
  accepted: 'Aceptada',
  sort: 'Ordenar',
  priceAsc: 'Precio ↑',
  priceDesc: 'Precio ↓',
  az: 'A–Z',
  note: 'El precio más bajo no siempre es la mejor opción — considera el tiempo, la garantía y la compatibilidad. La tarifa de NXT//LINK se muestra para que veas tu costo total.',
  extras: {
    unitPrice: 'Precio unitario', shippingCost: 'Costo de envío',
    installation: 'Instalación', installationIncluded: 'Incluida', installationExtra: 'Costo adicional', installationNone: 'No disponible',
    training: 'Capacitación', trainingIncluded: 'Incluida', trainingExtra: 'Costo adicional',
    scopeSummary: 'Resumen del alcance (incluido / excluido)', duration: 'Duración', teamSize: 'Tamaño del equipo',
    emergencyResponse: 'Tiempo de respuesta de emergencia (si aplica)',
    licenseModel: 'Modelo de licencia', licenseSubscription: 'Suscripción', licensePerpetual: 'Perpetua', licenseTiered: 'Por niveles',
    implementationCost: 'Costo de implementación', annualSupport: 'Cuota anual de soporte / mantenimiento',
    slaSummary: 'Resumen del SLA', pricingDetails: 'Detalles de precios',
  },
};

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [lang, setLang] = useLang();
  const t = T[lang];
  const dateLocale = lang === 'es' ? 'es-MX' : 'en-US';
  const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(dateLocale); } catch { return ''; } };
  const fmtDT = (s: string) => { try { return new Date(s).toLocaleString(dateLocale); } catch { return ''; } };

  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<'overview' | 'quotes' | 'vendors' | 'approvals' | 'delivery' | 'documents' | 'history'>('overview');

  const [project, setProject] = useState<Project | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newApproval, setNewApproval] = useState('budget');
  const [newMilestone, setNewMilestone] = useState('delivery');

  const [newTask, setNewTask] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const STAGE_LABEL: Record<string, string> = {
    organizing: t.stageOrganizing, requirements_ready: t.stageRequirementsReady, matching: t.stageMatching,
    vendors_invited: t.stageVendorsInvited, collecting_quotes: t.stageCollectingQuotes, comparing: t.stageComparing,
    decision: t.stageDecision, vendor_selected: t.stageVendorSelected, implementation: t.stageImplementation,
    completed: t.stageCompleted, archived: t.stageArchived,
  };
  const EVENT_LABEL: Record<string, string> = {
    created: t.eventCreated, updated: t.eventUpdated, stage_changed: t.eventStageChanged,
    vendor_saved: t.eventVendorSaved, task_added: t.eventTaskAdded, task_done: t.eventTaskDone,
    task_skipped: t.eventTaskSkipped, task_open: t.eventTaskOpen, note_added: t.eventNoteAdded,
    decision_recorded: t.eventDecisionRecorded, document_added: t.eventDocumentAdded,
  };
  const APPROVAL_LABEL: Record<string, string> = {
    budget: t.approvalBudget, safety: t.approvalSafety, engineering: t.approvalEngineering,
    operations: t.approvalOperations, final_decision: t.approvalFinalDecision,
    purchase_order: t.approvalPurchaseOrder, contract: t.approvalContract,
  };
  const MILESTONE_LABEL: Record<string, string> = {
    purchase_order: t.milestonePurchaseOrder, production: t.milestoneProduction, shipping: t.milestoneShipping,
    delivery: t.milestoneDelivery, installation: t.milestoneInstallation, integration: t.milestoneIntegration,
    training: t.milestoneTraining, testing: t.milestoneTesting, acceptance: t.milestoneAcceptance,
    warranty_start: t.milestoneWarrantyStart, maintenance: t.milestoneMaintenance, issue: t.milestoneIssue,
  };
  const APPROVAL_STATUS_LABEL: Record<string, string> = {
    pending: t.statusPending, approved: t.statusApproved, rejected: t.statusRejected, skipped: t.statusSkipped,
  };
  const MILESTONE_STATUS_LABEL: Record<string, string> = { done: t.statusDone, pending: t.statusPending };
  const SOURCE_LABEL: Record<string, string> = { invited: t.sourceInvited, recommended: t.sourceRecommended };

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/${id}`);
      if (r.status === 403) { setDenied(true); setLoading(false); return; }
      const j = await r.json();
      if (j.ok) {
        setProject(j.project); setVendors(j.vendors); setDocs(j.documents);
        setTasks(j.tasks); setDecisions(j.decisions); setEvents(j.events);
        setQuotes(j.quotes || []); setApprovals(j.approvals || []); setMilestones(j.milestones || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function patch(fields: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      const j = await r.json();
      if (j.ok) { setProject(j.project); load(); }
    } catch { /* ignore */ }
    setBusy(false);
  }
  async function addItem(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/projects/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await load();
    } catch { /* ignore */ }
    setBusy(false);
  }

  if (loading) return <div className={`pd ${ibmPlexSans.variable}`}><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="pd-load">{t.loading}</div></div>;
  if (denied) return <div className={`pd ${ibmPlexSans.variable}`}><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="pd-load">{t.accessDenied} <a href="/projects">{t.backToWorkspace}</a></div></div>;
  if (!project) return <div className={`pd ${ibmPlexSans.variable}`}><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="pd-load">{t.projectNotFound} <a href="/projects">{t.backToWorkspace}</a></div></div>;

  const stageIdx = STAGES.indexOf(project.stage);
  const reqCats = Array.isArray(project.requirements?.category_slugs) ? project.requirements.category_slugs as string[] : [];
  const reqInfo = Array.isArray(project.requirements?.suggested_info) ? project.requirements.suggested_info as string[] : [];
  const openTasks = tasks.filter((task) => task.status === 'open');

  return (
    <div className={`pd ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: MOTION_CSS + CSS + STAGE_TRACKER_CSS + EMPTY_ACTION_CSS + QUOTE_COMPARE_TABLE_CSS }} />
      <nav className="pd-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <a className="pd-brand" href="/projects"><b>NXT<i>//</i>LINK</b><span>{t.workspaceTag}</span></a>
          <a className="pd-pill" href="/projects">{t.allProjects}</a>
        </div>
        <LanguageToggle lang={lang} onChange={setLang} variant="light" />
      </nav>

      <div className="pd-wrap">
        {/* Header */}
        <header className="pd-head">
          <div className="pd-htop">
            {(() => { const SIcon = STAGE_ICON[project.stage]; return (
              <span className={`pd-stage s-${project.stage}`}>{SIcon && <SIcon size={12} strokeWidth={2.25} aria-hidden="true" />}{STAGE_LABEL[project.stage] || project.stage}</span>
            ); })()}
            {project.opportunity_ref && <span className="pd-ref">{project.opportunity_ref}</span>}
          </div>
          <h1>{project.name}</h1>
          {project.company_name && <div className="pd-co">{project.company_name}</div>}

          {/* Stage pipeline */}
          <div className="pd-pipe">
            <StageTracker stages={STAGES.map((s) => ({ key: s, label: STAGE_LABEL[s] || s }))} current={project.stage} />
          </div>

          {/* Next action — always shown */}
          <div className="pd-next">
            <div className="pd-nextlab">{t.nextAction}</div>
            <input className="pd-nextinput" defaultValue={project.next_action || ''}
              onBlur={(e) => { if (e.target.value !== (project.next_action || '')) patch({ next_action: e.target.value }); }}
              placeholder={t.nextActionPlaceholder} />
            <div className="pd-stagerow">
              {stageIdx < STAGES.length - 1 && (
                <button className="pd-advance" disabled={busy}
                  onClick={() => patch({ stage: STAGES[stageIdx + 1], next_action: '' })}>
                  {t.advanceTo.replace('{label}', STAGE_LABEL[STAGES[stageIdx + 1]])}
                </button>
              )}
              <select className="pd-select" value={project.priority} onChange={(e) => patch({ priority: e.target.value })}>
                <option value="low">{t.priorityLow}</option><option value="medium">{t.priorityMedium}</option>
                <option value="high">{t.priorityHigh}</option><option value="urgent">{t.priorityUrgent}</option>
              </select>
            </div>
          </div>
        </header>

        {/* Tabs — the unified Deal Room */}
        <div className="pd-tabs">
          {(['overview', 'quotes', 'vendors', 'approvals', 'delivery', 'documents', 'history'] as const).map((tabKey) => (
            <button key={tabKey} className={`pd-tab ${tab === tabKey ? 'on' : ''}`} onClick={() => setTab(tabKey)}>
              {tabKey === 'overview' ? t.tabOverview
                : tabKey === 'quotes' ? `${t.tabQuotes} (${quotes.length})`
                : tabKey === 'vendors' ? `${t.tabVendors} (${vendors.length})`
                : tabKey === 'approvals' ? `${t.tabApprovals} (${approvals.length})`
                : tabKey === 'delivery' ? t.tabDelivery
                : tabKey === 'documents' ? `${t.tabDocuments} (${docs.length})` : t.tabHistory}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="pd-panel">
            <div className="pd-cols">
              <div className="pd-field"><label>{t.problemLabel}</label>
                <textarea defaultValue={project.problem || ''} rows={3} onBlur={(e) => patch({ problem: e.target.value })} /></div>
              <div className="pd-field"><label>{t.desiredOutcomeLabel}</label>
                <textarea defaultValue={project.desired_outcome || ''} rows={3} onBlur={(e) => patch({ desired_outcome: e.target.value })} /></div>
            </div>
            <div className="pd-cols3">
              <div className="pd-field"><label>{t.locationLabel}</label><input defaultValue={project.location || ''} onBlur={(e) => patch({ location: e.target.value })} /></div>
              <div className="pd-field"><label>{t.budgetLabel}</label><input defaultValue={project.budget_range || ''} onBlur={(e) => patch({ budget_range: e.target.value })} placeholder={t.budgetPlaceholder} /></div>
              <div className="pd-field"><label>{t.timelineLabel}</label><input defaultValue={project.timeline || ''} onBlur={(e) => patch({ timeline: e.target.value })} placeholder={t.timelinePlaceholder} /></div>
            </div>

            {(reqCats.length > 0 || reqInfo.length > 0) && (
              <div className="pd-req">
                {reqCats.length > 0 && <><div className="pd-sublab">{t.categoriesLabel}</div><div className="pd-chips">{reqCats.map((c) => <span key={c} className="pd-chip">{c.replace(/_/g, ' ')}</span>)}</div></>}
                {reqInfo.length > 0 && <><div className="pd-sublab">{t.collectBetterQuotesLabel}</div><ul className="pd-ul">{reqInfo.map((s, i) => <li key={i}>{s}</li>)}</ul></>}
              </div>
            )}

            {/* Tasks */}
            <div className="pd-sec">
              <div className="pd-sechead">{t.nextStepsLabel} {openTasks.length > 0 && <span className="pd-count">{t.openCount.replace('{n}', String(openTasks.length))}</span>}</div>
              <div className="pd-tasks">
                {tasks.map((task, ti) => (
                  <div key={task.id} className={`pd-task nxm-in ${task.status === 'done' ? 'done' : ''}`} style={staggerStyle(ti)}>
                    <button
                      className="pd-check"
                      aria-label={task.status === 'done' ? t.markAsOpen.replace('{title}', task.title) : t.markAsDone.replace('{title}', task.title)}
                      aria-pressed={task.status === 'done'}
                      onClick={() => addItem({ kind: 'task_status', task_id: task.id, status: task.status === 'done' ? 'open' : 'done' })}
                    >
                      {task.status === 'done' && <CheckCircle2 size={13} strokeWidth={2.5} aria-hidden="true" />}
                    </button>
                    <div className="pd-tasktext"><span>{task.title}</span>{task.due_date && <small>{t.dueDate.replace('{date}', fmtDate(task.due_date))}</small>}</div>
                  </div>
                ))}
              </div>
              <div className="pd-addrow">
                <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder={t.addNextStepPlaceholder}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newTask.trim()) { addItem({ kind: 'task', title: newTask }); setNewTask(''); } }} />
                <button className="pd-mini" disabled={!newTask.trim() || busy} onClick={() => { addItem({ kind: 'task', title: newTask }); setNewTask(''); }}>{t.add}</button>
              </div>
            </div>

            {/* Decisions / notes */}
            <div className="pd-sec">
              <div className="pd-sechead">{t.notesDecisionsLabel}</div>
              {decisions.map((d) => (
                <div key={d.id} className="pd-decision"><b>{d.decision}</b>{d.reason && <p>{d.reason}</p>}<small>{fmtDT(d.decided_at)}</small></div>
              ))}
              <div className="pd-addrow">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.recordNotePlaceholder}
                  onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) { addItem({ kind: 'note', body: note }); setNote(''); } }} />
                <button className="pd-mini" disabled={!note.trim() || busy} onClick={() => { addItem({ kind: 'note', body: note }); setNote(''); }}>{t.save}</button>
              </div>
            </div>
          </div>
        )}

        {/* VENDORS */}
        {tab === 'vendors' && (
          <div className="pd-panel">
            {vendors.length === 0 ? (
              <EmptyAction
                icon={<Users size={20} strokeWidth={1.75} aria-hidden="true" />}
                title={t.noVendorsTitle}
                actionLabel={t.browseMarketplace}
                actionHref="/marketplace"
              />
            ) : (
              <div className="pd-vgrid">
                {vendors.map((v, vi) => {
                  const VIcon = VSRC_ICON[v.source];
                  return (
                  <div key={v.id} className="pd-vcard nxm-in" style={staggerStyle(vi)}>
                    <div className="pd-vtop"><span className={`pd-vsrc ${v.source}`}>{VIcon && <VIcon size={10} strokeWidth={2.25} aria-hidden="true" />}{SOURCE_LABEL[v.source] || v.source}</span><span className="pd-vstatus">{v.status}</span></div>
                    <div className="pd-vname">{v.listing_kind ? v.listing_kind : t.vendorFallback} · {v.listing_id ? v.listing_id.slice(0, 8) : v.vendor_id?.slice(0, 8)}</div>
                    {v.fit_note && <div className="pd-fit"><CheckCircle2 size={12} strokeWidth={2.25} aria-hidden="true" /> {v.fit_note}</div>}
                    {v.private_note && <div className="pd-pnote">{v.private_note}</div>}
                  </div>
                  );
                })}
              </div>
            )}
            <p className="pd-hint">{t.vendorsHint}</p>
          </div>
        )}

        {/* QUOTES — the received proposals + NXT Link commission status */}
        {tab === 'quotes' && (
          <div className="pd-panel">
            {quotes.length === 0 ? (
              <EmptyAction
                icon={<Inbox size={20} strokeWidth={1.75} aria-hidden="true" />}
                title={t.noQuotesTitle}
                hint={t.noQuotesHint}
                actionLabel={t.inviteVendors}
                onAction={() => setTab('vendors')}
                secondaryLabel={t.browseMarketplaceSecondary}
                secondaryHref="/marketplace"
              />
            ) : (
              <>
              {quotes.filter((q) => q.quote_amount != null).length >= 2 && (
                <QuoteCompareTable
                  rows={quotes.map((q): CompareTableRow => ({
                    id: q.id,
                    vendor: q.company || t.vendorFallback,
                    amount: q.quote_amount,
                    currency: q.quote_currency,
                    timeline: q.quote_timeline,
                    validUntil: q.quote_valid_until,
                    paymentTerms: q.quote_payment_terms,
                    warranty: q.quote_warranty,
                    feeAmount: q.commission?.commission_amount ?? null,
                    status: q.buyer_decision === 'accepted' ? 'accepted' : q.quote_amount != null ? 'received' : 'awaiting',
                    ref: q.opportunity_ref || q.public_ref,
                    extras: q.quote_extras,
                  }))}
                  labels={lang === 'es' ? COMPARE_LABELS_ES : DEFAULT_COMPARE_LABELS}
                  locale={lang === 'es' ? 'es-MX' : 'en-US'}
                />
              )}
              <div className="pd-quotes">
                {quotes.map((q, qi) => {
                  const qstat = q.buyer_decision === 'accepted' ? 'accepted' : q.quote_amount ? 'quoted' : 'await';
                  const QIcon = QSTAT_ICON[qstat];
                  return (
                  <div key={q.id} className="pd-quote nxm-in" style={staggerStyle(qi)}>
                    <div className="pd-qtop">
                      <div><b>{q.company || t.vendorFallback}</b><span className="pd-ref">{q.opportunity_ref || q.public_ref}</span></div>
                      <span className={`pd-qstat ${qstat}`}>
                        {QIcon && <QIcon size={11} strokeWidth={2.25} aria-hidden="true" />}
                        {q.buyer_decision === 'accepted' ? t.accepted : q.quote_amount ? t.quoteReceived : t.awaitingQuote}
                      </span>
                    </div>
                    {q.quote_amount != null && (
                      <div className="pd-qamt">{money(q.quote_amount, q.quote_currency || 'USD')}
                        {q.quote_timeline && <small> · {q.quote_timeline}</small>}
                        {q.quote_valid_until && <small> · {t.validTo.replace('{date}', fmtDate(q.quote_valid_until))}</small>}
                      </div>
                    )}
                    {q.commission && q.commission.commission_amount != null && (
                      <div className="pd-comm">{t.feeIfWon.replace('{amount}', money(q.commission.commission_amount)).replace('{rate}', ((q.commission.effective_rate || 0) * 100).toFixed(1)).replace('{status}', q.commission.status || '')}</div>
                    )}
                  </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        )}

        {/* APPROVALS — team sign-offs */}
        {tab === 'approvals' && (
          <div className="pd-panel">
            {approvals.length === 0 ? (
              <EmptyAction
                icon={<ClipboardCheck size={20} strokeWidth={1.75} aria-hidden="true" />}
                title={t.noApprovalsTitle}
                hint={t.noApprovalsHint}
              />
            ) : (
              <div className="pd-apps">
                {approvals.map((a, ai) => {
                  const AIcon = APPROVAL_ICON[a.status];
                  return (
                  <div key={a.id} className={`pd-app ${a.status} nxm-in`} style={staggerStyle(ai)}>
                    <div className="pd-appmain">
                      <div className="pd-appname">{APPROVAL_LABEL[a.kind] || a.kind}</div>
                      <div className="pd-appmeta">{a.approver_name ? `${a.approver_name} · ` : ''}{APPROVAL_STATUS_LABEL[a.status] || a.status}{a.due_date ? ` · ${t.dueDate.replace('{date}', fmtDate(a.due_date))}` : ''}{a.decided_at ? ` · ${fmtDate(a.decided_at)}` : ''}</div>
                    </div>
                    {a.status === 'pending' ? (
                      <div className="pd-appacts">
                        <button className="pd-ok" onClick={() => addItem({ kind: 'approval_decision', approval_id: a.id, status: 'approved' })}>{t.approve}</button>
                        <button className="pd-no" onClick={() => addItem({ kind: 'approval_decision', approval_id: a.id, status: 'rejected' })}>{t.reject}</button>
                      </div>
                    ) : <span className={`pd-appbadge ${a.status}`}>{AIcon && <AIcon size={11} strokeWidth={2.25} aria-hidden="true" />}{APPROVAL_STATUS_LABEL[a.status] || a.status}</span>}
                  </div>
                  );
                })}
              </div>
            )}
            <div className="pd-addrow">
              <select value={newApproval} onChange={(e) => setNewApproval(e.target.value)} className="pd-selectfull">
                {Object.entries(APPROVAL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button className="pd-mini" disabled={busy} onClick={() => addItem({ kind: 'approval', approval_kind: newApproval })}>{t.requestApproval}</button>
            </div>
          </div>
        )}

        {/* DELIVERY — after-sale execution milestones */}
        {tab === 'delivery' && (
          <div className="pd-panel">
            {milestones.length === 0 ? (
              <EmptyAction
                icon={<Truck size={20} strokeWidth={1.75} aria-hidden="true" />}
                title={t.noDeliveryTitle}
                hint={t.noDeliveryHint}
              />
            ) : (
              <div className="pd-tasks">
                {milestones.map((m, mi) => (
                  <div key={m.id} className={`pd-task nxm-in ${m.status === 'done' ? 'done' : ''}`} style={staggerStyle(mi)}>
                    <button
                      className="pd-check"
                      aria-label={m.status === 'done' ? t.markAsPending.replace('{title}', MILESTONE_LABEL[m.kind] || m.kind) : t.markMilestoneAsDone.replace('{title}', MILESTONE_LABEL[m.kind] || m.kind)}
                      aria-pressed={m.status === 'done'}
                      onClick={() => addItem({ kind: 'milestone_status', milestone_id: m.id, status: m.status === 'done' ? 'pending' : 'done' })}
                    >
                      {m.status === 'done' && <CheckCircle2 size={13} strokeWidth={2.5} aria-hidden="true" />}
                    </button>
                    <div className="pd-tasktext"><span>{MILESTONE_LABEL[m.kind] || m.kind}{m.title ? ` — ${m.title}` : ''}</span>
                      <small>{MILESTONE_STATUS_LABEL[m.status] || m.status}{m.due_date ? ` · ${t.dueDate.replace('{date}', fmtDate(m.due_date))}` : ''}</small></div>
                  </div>
                ))}
              </div>
            )}
            <div className="pd-addrow">
              <select value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} className="pd-selectfull">
                {Object.entries(MILESTONE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button className="pd-mini" disabled={busy} onClick={() => addItem({ kind: 'milestone', milestone_kind: newMilestone })}>{t.addStep}</button>
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {tab === 'documents' && (
          <div className="pd-panel">
            {docs.length === 0 ? (
              <EmptyAction
                icon={<FileText size={20} strokeWidth={1.75} aria-hidden="true" />}
                title={t.noDocumentsTitle}
                hint={t.noDocumentsHint}
              />
            ) : (
              <div className="pd-docs">
                {docs.map((d, di) => (
                  <div key={d.id} className="pd-doc nxm-in" style={staggerStyle(di)}>
                    <span className="pd-dkind">{d.kind.replace(/_/g, ' ')}</span>
                    <div className="pd-dtitle">{d.external_url ? <a href={d.external_url} target="_blank" rel="noopener noreferrer">{d.title}</a> : d.title}</div>
                    <small>{fmtDate(d.created_at)}</small>
                  </div>
                ))}
              </div>
            )}
            <div className="pd-addrow col">
              <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder={t.docTitlePlaceholder} />
              <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder={t.docLinkPlaceholder} />
              <button className="pd-mini" disabled={!docTitle.trim() || busy} onClick={() => { addItem({ kind: 'document', title: docTitle, external_url: docUrl, doc_kind: 'other' }); setDocTitle(''); setDocUrl(''); }}>{t.addDocument}</button>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div className="pd-panel">
            <div className="pd-timeline">
              {events.map((e, ei) => (
                <div key={e.id} className="pd-ev nxm-in" style={staggerStyle(ei)}>
                  <div className="pd-evdot" />
                  <div className="pd-evbody">
                    <div className="pd-evtitle">{EVENT_LABEL[e.event] || e.event}</div>
                    {e.detail && Object.keys(e.detail).length > 0 && <div className="pd-evdetail">{Object.entries(e.detail).map(([k, val]) => `${k}: ${String(val)}`).join(' · ')}</div>}
                    <div className="pd-evmeta">{e.actor_name || t.someone} · {fmtDT(e.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.pd{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-pd),'IBM Plex Sans',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.pd *{box-sizing:border-box;}
.pd a:focus-visible,.pd button:focus-visible,.pd input:focus-visible,.pd select:focus-visible,.pd textarea:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.pd-load{max-width:600px;margin:80px auto;text-align:center;color:var(--spec-text-2nd,#615F72);padding:0 20px;}
.pd-load a{color:var(--spec-violet-deep,#4A3DB0);}
.pd-nav{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;row-gap:8px;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:30;}
.pd-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.pd-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;}.pd-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}.pd-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.pd-pill{font-size:13px;font-weight:500;color:var(--spec-ink,#141320);background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:99px;padding:8px 14px;text-decoration:none;}
.pd-wrap{max-width:900px;margin:0 auto;padding:28px 20px 100px;}
.pd-head{border-bottom:1px solid var(--spec-border,#E2DFEC);padding-bottom:22px;}
.pd-htop{display:flex;align-items:center;gap:10px;}
.pd-stage{font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.pd-stage.s-completed{background:#E9F7F0;color:#1F7A54;}
.pd-stage.s-decision{background:#FBF3E7;color:var(--spec-warning,#C68A28);}
.pd-ref{font-size:12px;color:var(--spec-text-2nd,#615F72);font-variant-numeric:tabular-nums;}
.pd-head h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:clamp(22px,3.5vw,30px);font-weight:700;letter-spacing:-.01em;margin:12px 0 0;}
.pd-co{color:var(--spec-text-2nd,#615F72);font-size:14px;margin-top:4px;}
.pd-pipe{margin:20px 0 0;}
.pd-next{background:var(--spec-surface,#EFEDF5);border:1px solid rgba(108,92,224,.22);border-radius:14px;padding:15px;margin-top:20px;}
.pd-nextlab{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--spec-violet-deep,#4A3DB0);margin-bottom:8px;}
.pd-nextinput{width:100%;font-family:inherit;font-size:15px;font-weight:600;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;}
.pd-nextinput:focus{border-color:var(--spec-violet,#6C5CE0);}
.pd-stagerow{display:flex;gap:10px;margin-top:11px;flex-wrap:wrap;}
.pd-advance{font-family:inherit;font-size:13px;font-weight:700;padding:10px 16px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;}
.pd-advance:hover{background:var(--spec-violet-deep,#4A3DB0);}.pd-advance:disabled{opacity:.5;}
.pd-select{font-family:inherit;font-size:13px;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;outline:none;}
.pd-tabs{display:flex;gap:4px;margin:22px 0 18px;border-bottom:1px solid var(--spec-border,#E2DFEC);overflow-x:auto;}
.pd-tab{font-family:inherit;font-size:13.5px;font-weight:600;padding:11px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--spec-text-2nd,#615F72);cursor:pointer;white-space:nowrap;}
.pd-tab.on{color:var(--spec-ink,#141320);border-bottom-color:var(--spec-violet,#6C5CE0);}
.pd-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.pd-cols3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:14px;}
@media(max-width:640px){.pd-cols,.pd-cols3{grid-template-columns:1fr;}}
.pd-field label{display:block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);margin-bottom:6px;}
.pd-field input,.pd-field textarea{width:100%;font-family:inherit;font-size:14px;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;resize:vertical;line-height:1.5;}
.pd-field input:focus,.pd-field textarea:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.pd-req{margin-top:18px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:14px;}
.pd-sublab{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);margin:0 0 8px;}
.pd-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.pd-chip{font-size:12px;font-weight:600;padding:5px 10px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);text-transform:capitalize;}
.pd-ul{margin:0;padding-left:18px;color:var(--spec-text-2nd,#615F72);font-size:13px;line-height:1.7;}
.pd-sec{margin-top:24px;}
.pd-sechead{font-size:14px;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:9px;}
.pd-count{font-size:11px;font-weight:600;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.1);padding:3px 9px;border-radius:99px;}
.pd-tasks{display:flex;flex-direction:column;gap:7px;}
.pd-task{display:flex;align-items:center;gap:10px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:10px 12px;}
.pd-task.done .pd-tasktext span{text-decoration:line-through;color:#706D88;}
.pd-check{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-success,#2F9E6A);font-size:12px;cursor:pointer;flex-shrink:0;display:grid;place-items:center;}
.pd-task.done .pd-check{background:#E9F7F0;border-color:transparent;}
.pd-tasktext{display:flex;flex-direction:column;gap:2px;font-size:13.5px;}
.pd-tasktext small{color:var(--spec-text-2nd,#615F72);font-size:11px;}
.pd-addrow{display:flex;gap:8px;margin-top:10px;}
.pd-addrow.col{flex-direction:column;}
.pd-addrow input{flex:1;font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;}
.pd-addrow input:focus{border-color:var(--spec-violet,#6C5CE0);}
.pd-mini{font-family:inherit;font-size:13px;font-weight:700;padding:10px 16px;border-radius:10px;border:none;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);cursor:pointer;white-space:nowrap;}
.pd-mini:hover:not(:disabled){background:rgba(108,92,224,.18);}.pd-mini:disabled{opacity:.4;}
.pd-decision{background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:11px 13px;margin-bottom:8px;}
.pd-decision b{font-size:13.5px;}.pd-decision p{margin:5px 0 0;font-size:12.5px;color:var(--spec-text-2nd,#615F72);line-height:1.5;}
.pd-decision small{display:block;margin-top:6px;font-size:11px;color:#8A87A0;}
.pd-vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}
.pd-vcard{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:13px;}
.pd-vtop{display:flex;justify-content:space-between;align-items:center;}
.pd-vsrc{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:99px;background:var(--spec-surface,#EFEDF5);color:var(--spec-text-2nd,#615F72);}
.pd-vsrc.invited{background:#EDEAFB;color:#4A3DB0;}
.pd-vsrc.recommended{background:#E7F5EE;color:#1F7A54;}
.pd-vstatus{font-size:11px;color:var(--spec-text-2nd,#615F72);text-transform:capitalize;}
.pd-vname{font-size:13.5px;font-weight:700;margin-top:9px;text-transform:capitalize;}
.pd-fit{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--spec-success,#2F9E6A);margin-top:7px;line-height:1.4;}
.pd-pnote{font-size:12px;color:var(--spec-text-2nd,#615F72);margin-top:6px;line-height:1.4;}
.pd-hint{font-size:12.5px;color:var(--spec-text-2nd,#615F72);margin-top:16px;line-height:1.6;}
.pd-hint a{color:var(--spec-violet-deep,#4A3DB0);}
.pd-docs{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
.pd-doc{display:flex;align-items:center;gap:12px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:11px 13px;}
.pd-dkind{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.1);padding:4px 9px;border-radius:6px;white-space:nowrap;}
.pd-dtitle{flex:1;font-size:13.5px;font-weight:600;}
.pd-dtitle a{color:var(--spec-violet-deep,#4A3DB0);text-decoration:none;}.pd-dtitle a:hover{text-decoration:underline;}
.pd-doc small{color:#8A87A0;font-size:11px;}
.pd-timeline{display:flex;flex-direction:column;gap:0;}
.pd-ev{display:flex;gap:12px;padding-bottom:16px;position:relative;}
.pd-ev:not(:last-child)::before{content:'';position:absolute;left:5px;top:14px;bottom:0;width:1px;background:var(--spec-border,#E2DFEC);}
.pd-evdot{width:11px;height:11px;border-radius:50%;background:var(--spec-violet,#6C5CE0);flex-shrink:0;margin-top:3px;box-shadow:0 0 0 3px rgba(108,92,224,.15);}
.pd-evtitle{font-size:13.5px;font-weight:700;}
.pd-evdetail{font-size:12px;color:var(--spec-text-2nd,#615F72);margin-top:2px;}
.pd-evmeta{font-size:11px;color:#706D88;margin-top:3px;}
.pd-cmpwrap{background:#fff;border:1px solid rgba(108,92,224,.25);border-radius:14px;padding:16px 18px;margin-bottom:16px;}
.pd-cmphead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;}
.pd-cmphead b{font-size:15px;font-weight:800;}
.pd-sort{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--spec-text-2nd,#615F72);}
.pd-sort button{font-family:inherit;font-size:11.5px;font-weight:600;color:var(--spec-ink,#141320);background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:8px;padding:5px 9px;cursor:pointer;}
.pd-sort button.on{background:rgba(108,92,224,.12);border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.pd-cmpscroll{overflow-x:auto;margin:0 -4px;}
.pd-cmp{width:100%;border-collapse:collapse;font-size:13px;min-width:560px;}
.pd-cmp th{text-align:left;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);padding:0 11px 9px;border-bottom:1px solid var(--spec-border,#E2DFEC);}
.pd-cmp td{padding:12px 11px;border-bottom:1px solid var(--spec-border,#E2DFEC);vertical-align:top;}
.pd-cmp tr:last-child td{border-bottom:none;}
.pd-cmp tr.accepted td{background:#F3FAF6;}
.pd-cmpref{display:block;font-size:11px;color:var(--spec-text-2nd,#615F72);font-variant-numeric:tabular-nums;margin-top:2px;}
.pd-cmpamt{font-weight:800;color:var(--spec-ink,#141320);font-variant-numeric:tabular-nums;white-space:nowrap;}
.pd-cmpval{display:flex;align-items:center;gap:6px;}
.pd-bar{height:6px;border-radius:99px;background:var(--spec-border,#E2DFEC);margin-top:6px;overflow:hidden;min-width:60px;}
.pd-bar i{display:block;height:100%;border-radius:99px;background:#6C5CE0;transition:width .3s ease;}
.pd-bar i.best{background:#3B6EA5;}
.pd-cmpfee{color:var(--spec-violet-deep,#4A3DB0);font-variant-numeric:tabular-nums;white-space:nowrap;}
.pd-cmpwait{color:var(--spec-text-2nd,#615F72);font-weight:600;}
.pd-lowest{display:inline-block;margin-left:7px;font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:#E9F7F0;color:#1F7A54;vertical-align:middle;}
.pd-cmpnote{font-size:11px;color:#706D88;margin:12px 0 0;line-height:1.5;}
.pd-quotes{display:flex;flex-direction:column;gap:11px;}
.pd-quote{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:14px;}
.pd-qtop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}
.pd-qtop b{font-size:14px;}
.pd-qtop .pd-ref{margin-left:8px;font-size:11px;color:var(--spec-text-2nd,#615F72);}
.pd-qstat{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;white-space:nowrap;}
.pd-qstat.accepted{background:#E7F5EE;color:#1F7A54;}
.pd-qstat.quoted{background:#EDEAFB;color:#4A3DB0;}
.pd-qstat.await{background:#FBF2E1;color:#8C5A15;}
.pd-qamt{font-size:17px;font-weight:800;margin-top:9px;font-variant-numeric:tabular-nums;}
.pd-qamt small{font-size:12px;font-weight:500;color:var(--spec-text-2nd,#615F72);}
.pd-comm{font-size:12px;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.06);border-radius:8px;padding:8px 10px;margin-top:9px;}
.pd-apps{display:flex;flex-direction:column;gap:8px;}
.pd-app{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:11px;padding:12px 14px;}
.pd-app.approved{border-color:rgba(47,158,106,.3);}
.pd-app.rejected{border-color:rgba(206,75,67,.3);}
.pd-appname{font-size:13.5px;font-weight:700;}
.pd-appmeta{font-size:11.5px;color:var(--spec-text-2nd,#615F72);margin-top:3px;text-transform:capitalize;}
.pd-appacts{display:flex;gap:7px;}
.pd-ok,.pd-no{font-family:inherit;font-size:12px;font-weight:700;padding:7px 13px;border-radius:8px;border:none;cursor:pointer;}
.pd-ok{background:#E9F7F0;color:#1F7A54;}
.pd-no{background:#FBECEA;color:var(--spec-error,#CE4B43);}
.pd-appbadge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:4px 10px;border-radius:99px;}
.pd-appbadge.approved{background:#E7F5EE;color:#1F7A54;}
.pd-appbadge.rejected{background:#FBECEB;color:#A83E36;}
.pd-appbadge.skipped{background:var(--spec-surface,#EFEDF5);color:var(--spec-text-2nd,#615F72);}
.pd-selectfull{flex:1;font-family:inherit;font-size:13px;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;outline:none;}
`;
