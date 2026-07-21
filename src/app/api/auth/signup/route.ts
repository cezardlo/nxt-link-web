// POST /api/auth/signup — ONE server-side account-creation door for the
// organic lanes (buyer and vendor). The /signup page posts here instead of
// calling Supabase directly, so the click-wrap gate is enforced server-side
// and fail-closed (process doc §4: never a checkbox that saves nothing):
//   1) reject unless terms_accepted === true;
//   2) write the ToS + Privacy acceptance rows FIRST (no record → no account);
//   3) create the auth account with the same SSR client /auth/callback pairs
//      with (PKCE verifier cookie set on this response, so the confirmation
//      email link works exactly as the old client-side signUp did);
//   4) best-effort: link the pre-account acceptance rows to the new auth id.
// Invited vendors use /join/<token> (their own click-wrap gate); this route
// is only the organic door.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { recordLegalAcceptance, LEGAL_MSG, bilingual } from '@/lib/legal/acceptance';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface SignupBody {
  email?: string;
  password?: string;
  role?: string;
  vendor_type?: string;
  terms_accepted?: boolean;
  locale?: string;
}

export async function POST(req: Request) {
  let body: SignupBody;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = body.role === 'vendor' ? 'vendor' : 'client';
  const vendorType = String(body.vendor_type || '').trim().slice(0, 60) || null;
  const locale: 'en' | 'es' = body.locale === 'es' ? 'es' : 'en';

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, message: 'A valid email is required. / Se requiere un correo válido.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, message: 'Password must be at least 8 characters. / La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }
  // Click-wrap gate — fail closed (no accepted terms, no account).
  if (body.terms_accepted !== true) {
    return NextResponse.json({ ok: false, message: bilingual(LEGAL_MSG.required, locale) }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Sign-up is not available right now. / El registro no está disponible en este momento.' }, { status: 503 });
  }

  // Record the acceptance BEFORE the account exists — if this write fails,
  // no account is created (the evidence row is the gate, not decoration).
  const db = getSupabaseClient({ admin: true });
  const recorded = await recordLegalAcceptance(db, { email, context: 'signup', languageShown: locale, req });
  if (!recorded.ok) {
    return NextResponse.json({ ok: false, message: bilingual(LEGAL_MSG.recordFailed, locale) }, { status: 500 });
  }

  const sb = await createServerSupabaseClient();
  const origin = new URL(req.url).origin;
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { role, vendor_type: role === 'vendor' ? vendorType : null },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  // Best-effort: link the pre-account acceptance rows to the new auth id
  // (the immutability guard only permits this null → id transition).
  try {
    if (data.user) {
      await db.from('terms_acceptances').update({ user_id: data.user.id }).eq('email', email).is('user_id', null);
    }
  } catch { /* best-effort — /auth/callback also links on first sign-in */ }

  // session=true when email confirmation is disabled in the project settings —
  // the SSR client already set the session cookies on this response.
  return NextResponse.json({ ok: true, session: Boolean(data.session), role });
}
