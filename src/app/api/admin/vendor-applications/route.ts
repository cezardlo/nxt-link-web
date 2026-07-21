// Admin review of FULL vendor applications (the detailed /apply submissions that
// land in vendor_applications). GET lists them with their submitted details and
// whether each has already been promoted to a live vendor. POST approves or
// rejects one:
//   - approve → idempotently create/link a live vendor_profiles row from the
//     application data and send the bilingual welcome email.
//   - reject  → mark the application declined.
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
import { sendMail } from '@/lib/mail';

const LOGIN_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nxt-link-web.vercel.app').replace(/\/$/, '') + '/login';

const APP_COLS = 'id, public_ref, company_name, contact_name, email, phone, category, offering_types, supply_chain_stages, company_size, region, problem_solved, target_customer, price_range, logo_path, product_image_paths, status, admin_notes, approved_at, auth_id, created_at';

function welcomeEmail(name: string, company: string): { subject: string; body: string } {
  const hi = name ? name : (company || 'there');
  return {
    subject: 'You’re in — NXT//LINK vendor approval / Estás dentro',
    body:
`Hi ${hi},

Good news: ${company || 'your company'} is approved as a NXT//LINK vendor.

How it works: we bring you buyers who are ready to purchase. NXT//LINK only earns when you get paid — 5% on the first $50,000, 3% above, capped at $20,000. Your first two deals get up to $1,250 commission credit each, and every buyer we introduce is protected for 12 months.

Sign in here (no password — use Google or "email me a link"):
${LOGIN_URL}

Reply to this email anytime and we’ll help you finish your profile and listings.

— NXT//LINK

——————————————————————————

Hola ${hi},

Buenas noticias: ${company || 'tu empresa'} fue aprobada como proveedor de NXT//LINK.

Cómo funciona: te traemos compradores listos para comprar. NXT//LINK solo gana cuando tú cobras — 5% sobre los primeros $50,000, 3% de ahí en adelante, con tope de $20,000. Tus primeros dos tratos reciben hasta $1,250 de crédito cada uno, y cada comprador queda protegido por 12 meses.

Inicia sesión aquí (sin contraseña — usa Google o "envíame un enlace"):
${LOGIN_URL}

Responde a este correo y te ayudamos a completar tu perfil y tus anuncios.

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

  let body: { id?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null;
  if (!id || !action) return NextResponse.json({ ok: false, message: "id and action ('approve'|'reject') required" }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { data: app } = await db.from('vendor_applications').select(APP_COLS).eq('id', id).maybeSingle();
  if (!app) return NextResponse.json({ ok: false, message: 'Application not found' }, { status: 404 });

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
      service_areas: app.region ? [app.region] : [],
      industries: Array.isArray(app.supply_chain_stages) ? app.supply_chain_stages : [],
      client_types: app.target_customer ? [app.target_customer] : [],
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
