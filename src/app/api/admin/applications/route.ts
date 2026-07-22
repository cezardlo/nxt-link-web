// Admin review of early-access applications (the waitlist from the homepage
// "Apply for early access" modal). GET list, PATCH status as you work each lead:
// new → contacted → onboarding → onboarded (or declined). Admin-only.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { sendMail } from '@/lib/mail';

const STATUSES = ['new', 'contacted', 'onboarding', 'onboarded', 'declined'];

const LOGIN_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nxt-link-web.vercel.app').replace(/\/$/, '') + '/login';

// Bilingual welcome, sent automatically when a lead is moved to "onboarded".
function welcomeEmail(name: string, company: string): { subject: string; body: string } {
  const hi = name ? name : (company || 'there');
  return {
    subject: 'You’re in — NXT//LINK early access / Estás dentro',
    body:
`Hi ${hi},

Good news: ${company || 'your company'} is approved for NXT//LINK early access.

How it works: we bring you buyers who are ready to purchase. NXT//LINK only earns when you get paid — 5% on the first $50,000, 3% above, capped at $20,000. Your first deal gets up to $250 in commission credit, and every buyer we introduce is protected for 12 months.

Sign in here (no password — use Google or "email me a link"):
${LOGIN_URL}

Reply to this email anytime and we’ll help you set up your profile.

— NXT//LINK

——————————————————————————

Hola ${hi},

Buenas noticias: ${company || 'tu empresa'} fue aprobada para el acceso anticipado a NXT//LINK.

Cómo funciona: te traemos compradores listos para comprar. NXT//LINK solo gana cuando tú cobras — 5% sobre los primeros $50,000, 3% de ahí en adelante, con tope de $20,000. Tu primer trato recibe hasta $250 de crédito de comisión, y cada comprador queda protegido por 12 meses.

Inicia sesión aquí (sin contraseña — usa Google o "envíame un enlace"):
${LOGIN_URL}

Responde a este correo y te ayudamos a configurar tu perfil.

— NXT//LINK`,
  };
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, applications: [] });
  const db = getSupabaseClient({ admin: true });
  const { data } = await db.from('early_access_leads').select('*').order('created_at', { ascending: false }).limit(300);
  return NextResponse.json({ ok: true, applications: data || [] });
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  const status = STATUSES.includes(String(body.status)) ? String(body.status) : null;
  if (!id || !status) return NextResponse.json({ ok: false, message: 'id and status required' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });

  // Detect the transition INTO "onboarded" so we send the welcome only once.
  const { data: prev } = await db.from('early_access_leads').select('status, welcomed_at').eq('id', id).maybeSingle();

  const patch: Record<string, unknown> = { status };
  if (typeof body.note === 'string') patch.note = body.note.trim().slice(0, 1000) || null;

  const newlyOnboarded = status === 'onboarded' && prev?.status !== 'onboarded' && !prev?.welcomed_at;
  if (newlyOnboarded) patch.welcomed_at = new Date().toISOString();

  const { data, error } = await db.from('early_access_leads').update(patch).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  let welcomed = false;
  if (newlyOnboarded && data?.email && data?.kind !== 'buyer') {
    const mail = welcomeEmail((data.contact_name as string) || '', (data.company_name as string) || '');
    await sendMail({ to: data.email as string, subject: mail.subject, body: mail.body }).then(() => { welcomed = true; }).catch(() => {});
  }
  return NextResponse.json({ ok: true, application: data, welcomed });
}
