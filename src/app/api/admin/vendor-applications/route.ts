// Admin review of FULL vendor applications (the detailed /apply submissions that
// land in vendor_applications). GET lists them with their submitted details and
// whether each has already been promoted to a live vendor. POST approves or
// rejects one:
//   - approve → idempotently create/link a live vendor_profiles row from the
//     application data and send the bilingual welcome email.
//   - reject  → mark the application declined.
//   - needs_info → send the application back: status 'needs_info' + a short
//     note in the dedicated vendor_message column (NEVER admin_notes — that
//     one is internal). The vendor sees the note on /apply/status and gets a
//     bilingual email; saving their application returns it to review.
// Admin-only (same access gate as the rest of /admin).
//
// NOTE on status: vendor_applications has a DB guard trigger
// (guard_vendor_application_update) that only lets is_admin() DB sessions change
// status/approved_at. The operator here authenticates via the admin access code
// (service-role DB session, auth.uid() null → is_admin() false), so that trigger
// silently keeps the column at its old value. We therefore treat the created
// vendor_profiles row as the durable "approved / live" signal (used below to
// mark applications as approved), and still attempt the status write so it takes
// effect automatically if the app is ever driven by a real admin auth session.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { ensureVendorProfile } from '@/lib/vendor/profile';
import { cleanVendorMessage } from '@/lib/apply/fields';
import { sendMail } from '@/lib/mail';

const LOGIN_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nxt-link-web.vercel.app').replace(/\/$/, '') + '/login';
const APPLY_LOGIN_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nxt-link-web.vercel.app').replace(/\/$/, '') + '/apply/login';

const APP_COLS = 'id, public_ref, company_name, contact_name, email, phone, category, offering_types, supply_chain_stages, company_size, region, regions, problem_solved, target_customer, target_customers, price_range, logo_path, product_image_paths, status, vendor_message, admin_notes, approved_at, auth_id, created_at';

function welcomeEmail(name: string, company: string): { subject: string; body: string } {
  const hi = name ? name : (company || 'there');
  return {
    subject: 'You’re in — NXT//LINK vendor approval / Estás dentro',
    body:
`Hi ${hi},

Good news: ${company || 'your company'} is approved as a NXT//LINK vendor.

How it works: we bring you buyers who are ready to purchase. NXT//LINK only earns when you get paid — 4% on the first $50,000, 2% above that, capped at $20,000. New vendors get 50% off that commission on their first closed deal (within 90 days of joining, one per company), and every buyer we introduce is protected for 12 months.

Sign in here (no password — use Google or "email me a link"):
${LOGIN_URL}

Reply to this email anytime and we’ll help you finish your profile and listings.

— NXT//LINK

——————————————————————————

Hola ${hi},

Buenas noticias: ${company || 'tu empresa'} fue aprobada como proveedor de NXT//LINK.

Cómo funciona: te traemos compradores listos para comprar. NXT//LINK solo gana cuando tú cobras — 4% sobre los primeros $50,000, 2% de ahí en adelante, con tope de $20,000. Los proveedores nuevos reciben 50% de descuento en esa comisión en su primer trato cerrado (dentro de los primeros 90 días después de unirse, uno por empresa), y cada comprador queda protegido por 12 meses.

Inicia sesión aquí (sin contraseña — usa Google o "envíame un enlace"):
${LOGIN_URL}

Responde a este correo y te ayudamos a completar tu perfil y tus anuncios.

— NXT//LINK`,
  };
}

// ⚠️ NEEDS CESAR APPROVAL (2026-08-04 Batch B): vendor-facing email copy for
// the needs_info send-back. Cesar approves all vendor-facing email copy
// before it ships — do not deploy this without his sign-off. Spanish is
// informal "tú" per his site-wide register ruling.
function needsInfoEmail(name: string, company: string, message: string, email: string): { subject: string; body: string } {
  const hi = name ? name : (company || 'there');
  const link = `${APPLY_LOGIN_URL}?email=${encodeURIComponent(email)}`;
  return {
    subject: 'A quick question about your NXT//LINK application / Una pregunta sobre tu solicitud',
    body:
`Hi ${hi},

Thanks for applying to join NXT//LINK${company ? ` with ${company}` : ''}. We need a bit more information before we can approve you — this is not a rejection.

Our team's note:
${message}

You can update your application here (sign in or create your account with this same email — everything you already entered is saved):
${link}

Reply to this email anytime if you'd rather just answer here.

— NXT//LINK

——————————————————————————

Hola ${hi},

Gracias por aplicar a NXT//LINK${company ? ` con ${company}` : ''}. Necesitamos un poco más de información antes de poder aprobarte — no es un rechazo.

Nota de nuestro equipo:
${message}

Puedes actualizar tu solicitud aquí (inicia sesión o crea tu cuenta con este mismo correo — todo lo que ya escribiste está guardado):
${link}

Si prefieres, responde a este correo directamente.

— NXT//LINK`,
  };
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, applications: [] });
  const db = getSupabaseClient({ admin: true });

  const { data: apps } = await db.from('vendor_applications').select(APP_COLS).order('created_at', { ascending: false }).limit(300);
  const rows = apps || [];

  // Which applications are already live vendors? Match created profiles by
  // auth_id (preferred) or email (case-insensitive) — this is our durable
  // "approved" signal, independent of the guarded status column.
  const emails = Array.from(new Set(rows.map((a) => (a.email as string || '').toLowerCase()).filter(Boolean)));
  const authIds = Array.from(new Set(rows.map((a) => a.auth_id as string).filter(Boolean)));
  const byEmail = new Map<string, string>();
  const byAuth = new Map<string, string>();
  const collect = (profs: { id: unknown; email: unknown; auth_id: unknown }[] | null) => {
    for (const p of profs || []) {
      if (p.email) byEmail.set((p.email as string).toLowerCase(), p.id as string);
      if (p.auth_id) byAuth.set(p.auth_id as string, p.id as string);
    }
  };
  if (emails.length) {
    const { data } = await db.from('vendor_profiles').select('id, email, auth_id').in('email', emails);
    collect(data);
  }
  if (authIds.length) {
    const { data } = await db.from('vendor_profiles').select('id, email, auth_id').in('auth_id', authIds);
    collect(data);
  }

  const applications = rows.map((a) => {
    const liveId = (a.auth_id && byAuth.get(a.auth_id as string)) || byEmail.get((a.email as string || '').toLowerCase()) || null;
    return { ...a, approved: Boolean(liveId) || a.status === 'approved', live_vendor_id: liveId };
  });

  return NextResponse.json({ ok: true, applications });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let body: { id?: string; action?: string; message?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : body.action === 'needs_info' ? 'needs_info' : null;
  if (!id || !action) return NextResponse.json({ ok: false, message: "id and action ('approve'|'reject'|'needs_info') required" }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { data: app } = await db.from('vendor_applications').select(APP_COLS).eq('id', id).maybeSingle();
  if (!app) return NextResponse.json({ ok: false, message: 'Application not found' }, { status: 404 });

  if (action === 'needs_info') {
    // Send back for more info (2026-08-04 Batch B): same admin gate as
    // approve/reject above, no new privilege path. The message goes into the
    // DEDICATED vendor_message column — never admin_notes (internal). The
    // vendor sees it on /apply/status and in this email; saving their
    // application returns the same row to 'pending' review.
    const note = cleanVendorMessage(body.message);
    if (!note) return NextResponse.json({ ok: false, message: 'A short message for the vendor is required' }, { status: 400 });
    await db.from('vendor_applications').update({ status: 'needs_info', vendor_message: note }).eq('id', id);
    const { data: after } = await db.from('vendor_applications').select('status, vendor_message').eq('id', id).maybeSingle();
    let emailed = false;
    const to = String(app.email || '');
    if (to) {
      const mail = needsInfoEmail(String(app.contact_name || ''), String(app.company_name || ''), note, to);
      await sendMail({ to, subject: mail.subject, body: mail.body }).then(() => { emailed = true; }).catch(() => {});
    }
    return NextResponse.json({ ok: true, action, emailed, status_advanced: after?.status === 'needs_info', status: after?.status });
  }

  if (action === 'reject') {
    // Best-effort; the guard trigger keeps status unchanged unless the DB
    // session is a real admin. Reported back so the UI can be honest.
    await db.from('vendor_applications').update({ status: 'rejected' }).eq('id', id);
    const { data: after } = await db.from('vendor_applications').select('status').eq('id', id).maybeSingle();
    return NextResponse.json({ ok: true, action, status_advanced: after?.status === 'rejected', status: after?.status });
  }

  // approve — idempotently create or link a live vendor_profiles row through
  // the ONE shared creator (src/lib/vendor/profile.ts). lane 'admin_approval'
  // is the human review decision: it may claim any same-email profile (even a
  // pending one auto-created by a portal visit) and flip it approved + active,
  // or mint a fresh approved profile from the application data.
  const email = String(app.email || '');
  const authId = (app.auth_id as string) || null;
  // Multi-value fields (2026-08-04): prefer the arrays, fall back to the
  // legacy single-value column for rows that predate them.
  const regions = Array.isArray(app.regions) && app.regions.length ? app.regions : app.region ? [app.region] : [];
  const customers = Array.isArray(app.target_customers) && app.target_customers.length ? app.target_customers : app.target_customer ? [app.target_customer] : [];

  const ensured = await ensureVendorProfile(db, {
    lane: 'admin_approval',
    authId,
    email,
    profile: {
      company_name: app.company_name || 'New company',
      contact_name: app.contact_name || null,
      email: email || null,
      phone: app.phone || null,
      categories: app.category ? [app.category] : [],
      service_areas: regions,
      industries: Array.isArray(app.supply_chain_stages) ? app.supply_chain_stages : [],
      client_types: customers,
      description: app.problem_solved || null,
      logo_path: app.logo_path || null,
      source: 'application',
    },
  });
  if (!ensured.ok) return NextResponse.json({ ok: false, message: ensured.error }, { status: 500 });
  const profile = { id: ensured.id, status: ensured.status };
  const created = ensured.created;
  const wasAlreadyApproved = ensured.wasAlreadyApproved;

  // Advance the application status (best-effort; guard may keep it — reported).
  await db.from('vendor_applications').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);
  const { data: after } = await db.from('vendor_applications').select('status').eq('id', id).maybeSingle();

  // Welcome email only on first approval (fresh profile or a newly-flipped one).
  let welcomed = false;
  if (email && (created || !wasAlreadyApproved)) {
    const mail = welcomeEmail(String(app.contact_name || ''), String(app.company_name || ''));
    await sendMail({ to: email, subject: mail.subject, body: mail.body }).then(() => { welcomed = true; }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    action,
    vendor_id: profile?.id || null,
    created,
    already_approved: wasAlreadyApproved,
    welcomed,
    status_advanced: after?.status === 'approved',
  });
}
