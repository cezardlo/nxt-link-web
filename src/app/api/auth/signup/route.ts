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
//
// mode 'magic' (the vendor QUICK signup, fast-signup brief §3): 3 fields —
// company name, work email, "what do you supply" — NO password. Same click-
// wrap gate, then a magic sign-in link (signInWithOtp + shouldCreateUser,
// the exact auth pattern of the invited /join lane). Company + categories
// ride in the OTP user metadata; /auth/callback creates the vendor profile
// through ensureVendorProfile lane 'organic' — born PENDING, admin review
// still gates anything going public. NEVER weaken that.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { recordLegalAcceptance, LEGAL_MSG, bilingual } from '@/lib/legal/acceptance';
import { isEmailBanned } from '@/lib/vendor/moderation';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface SignupBody {
  email?: string;
  password?: string;
  role?: string;
  vendor_type?: string;
  use_case?: string;           // /signup "Something else" free text (optional)
  terms_accepted?: boolean;
  locale?: string;
  mode?: string;               // 'magic' → passwordless vendor quick signup
  company_name?: string;       // magic mode: field 1
  supply_categories?: unknown; // magic mode: field 3 (chips + free text)
}

function cleanCategories(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const raw of v) {
    const s = String(raw).trim().slice(0, 80);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= 10) break;
  }
  return out;
}

export async function POST(req: Request) {
  let body: SignupBody;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const magic = body.mode === 'magic';
  const role = magic ? 'vendor' : body.role === 'vendor' ? 'vendor' : 'client';
  const vendorType = String(body.vendor_type || '').trim().slice(0, 60) || null;
  const useCase = String(body.use_case || '').trim().slice(0, 200) || null;
  const locale: 'en' | 'es' = body.locale === 'es' ? 'es' : 'en';
  const companyName = String(body.company_name || '').trim().slice(0, 120);
  const supplyCategories = cleanCategories(body.supply_categories);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, message: 'A valid email is required. / Se requiere un correo válido.' }, { status: 400 });
  }
  if (!magic && password.length < 8) {
    return NextResponse.json({ ok: false, message: 'Password must be at least 8 characters. / La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }
  if (magic && !companyName) {
    return NextResponse.json({ ok: false, message: 'Your company name is required. / El nombre de tu empresa es requerido.' }, { status: 400 });
  }
  // Click-wrap gate — fail closed (no accepted terms, no account).
  if (body.terms_accepted !== true) {
    return NextResponse.json({ ok: false, message: bilingual(LEGAL_MSG.required, locale) }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Sign-up is not available right now. / El registro no está disponible en este momento.' }, { status: 503 });
  }

  const db = getSupabaseClient({ admin: true });
  if (magic && await isEmailBanned(db, email)) {
    return NextResponse.json({ ok: false, message: 'This email cannot be used. Contact us for help. / Este correo no puede usarse. Contáctanos para ayuda.' }, { status: 403 });
  }

  // Record the acceptance BEFORE the account exists — if this write fails,
  // no account is created (the evidence row is the gate, not decoration).
  const recorded = await recordLegalAcceptance(db, { email, context: 'signup', languageShown: locale, req });
  if (!recorded.ok) {
    return NextResponse.json({ ok: false, message: bilingual(LEGAL_MSG.recordFailed, locale) }, { status: 500 });
  }

  const sb = await createServerSupabaseClient();
  const origin = new URL(req.url).origin;

  if (magic) {
    // Passwordless quick signup — the magic link IS the email verification
    // (fast-signup brief: no verification wall blocking the dashboard).
    // Company + supply answers ride in the user metadata so /auth/callback
    // can create the PENDING organic vendor profile without asking again.
    const redirect = `${origin}/auth/callback?next=${encodeURIComponent('/vendor/portal?welcome=1')}`;
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirect,
        shouldCreateUser: true,
        data: {
          role: 'vendor',
          signup_lane: 'quick',
          company_name: companyName,
          supply_categories: supplyCategories,
          locale,
        },
      },
    });
    if (error) {
      return NextResponse.json({ ok: false, message: 'Could not send the sign-in link. Try again in a minute. / No pudimos enviar el enlace. Intenta de nuevo en un minuto.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, sent: true, role });
  }
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { role, vendor_type: role === 'vendor' ? vendorType : null, use_case: useCase },
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
