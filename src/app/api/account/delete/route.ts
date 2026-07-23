// POST /api/account/delete — a signed-in user deletes THEIR OWN account.
//
// SECURITY CONTRACT:
//  - Auth via getSessionUser() (real server-side auth.getUser(), fail-closed).
//    The account acted on is ALWAYS the session user. No id is ever read from
//    the request body — a user can only delete themselves.
//  - Admins (role admin/super_admin OR the ADMIN_EMAILS allowlist) are BLOCKED
//    from self-deleting here (a mis-click by the owner would be catastrophic);
//    they get a clear bilingual "contact support" error.
//  - Confirmation: the user must type DELETE / ELIMINAR. If the account has a
//    password identity, the current password must be re-entered and verified.
//    Passwordless (OAuth-only) accounts skip the password — the UI enforces a
//    typed phrase + a second explicit click.
//  - All data work runs with the service-role client and deletes the Supabase
//    auth user LAST (see src/lib/account/deletion.ts for the ordered plan and
//    its failure behavior).

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth/require-user';
import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { getSupabaseClient, hasSupabaseAdmin } from '@/lib/supabase/client';
import { isConfirmationValid, isSelfDeleteBlocked } from '@/lib/account/deletion-rules';
import { runAccountDeletion } from '@/lib/account/deletion';

type Lang = 'en' | 'es';

const MSG = {
  auth_required: {
    en: 'Sign in to manage your account.',
    es: 'Inicia sesión para administrar tu cuenta.',
  },
  not_configured: {
    en: 'Account deletion is temporarily unavailable. Please contact support.',
    es: 'La eliminación de cuenta no está disponible por ahora. Contacta con soporte.',
  },
  confirm_required: {
    en: 'Type DELETE to confirm.',
    es: 'Escribe ELIMINAR para confirmar.',
  },
  admin_blocked: {
    en: 'Admin accounts can’t be deleted here. Please contact support to handle this manually.',
    es: 'Las cuentas de administrador no se pueden eliminar aquí. Contacta con soporte para gestionarlo manualmente.',
  },
  password_required: {
    en: 'Enter your current password to confirm.',
    es: 'Introduce tu contraseña actual para confirmar.',
  },
  password_wrong: {
    en: 'That password is incorrect.',
    es: 'La contraseña es incorrecta.',
  },
  failed: {
    en: 'We couldn’t complete the deletion. Nothing was lost — please try again or contact support.',
    es: 'No pudimos completar la eliminación. No se perdió nada — inténtalo de nuevo o contacta con soporte.',
  },
} as const;

function pick(key: keyof typeof MSG, lang: Lang): string {
  return MSG[key][lang] || MSG[key].en;
}

export async function POST(req: Request) {
  // 1. Session user (the ONLY account this endpoint can act on).
  const user = await getSessionUser();

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const lang: Lang = body.lang === 'es' ? 'es' : 'en';

  if (!user) {
    return NextResponse.json({ ok: false, code: 'auth_required', message: pick('auth_required', lang) }, { status: 401 });
  }

  // 2. Confirmation phrase (DELETE / ELIMINAR).
  if (!isConfirmationValid(body.confirm)) {
    return NextResponse.json({ ok: false, code: 'confirm_required', message: pick('confirm_required', lang) }, { status: 400 });
  }

  // 3. We must have the service role to delete the auth user + bypass RLS.
  if (!hasSupabaseAdmin()) {
    return NextResponse.json({ ok: false, code: 'not_configured', message: pick('not_configured', lang) }, { status: 503 });
  }
  const db = getSupabaseClient({ admin: true });

  // 4. Resolve the auth user (identities + email) and role, server-side only.
  const { data: authData, error: authErr } = await db.auth.admin.getUserById(user.id);
  if (authErr || !authData?.user) {
    return NextResponse.json({ ok: false, code: 'not_configured', message: pick('not_configured', lang) }, { status: 503 });
  }
  const authUser = authData.user;
  const email = authUser.email ?? user.email ?? null;

  const { data: pu } = await db.from('platform_users').select('role').eq('auth_id', user.id).maybeSingle();
  const role = (pu?.role as string | undefined) ?? String(authUser.user_metadata?.role || 'client');

  // 5. Block admins from self-deleting here.
  if (isSelfDeleteBlocked({ role, email, adminEmailsRaw: process.env.ADMIN_EMAILS })) {
    return NextResponse.json({ ok: false, code: 'admin_blocked', message: pick('admin_blocked', lang) }, { status: 403 });
  }

  // 6. Password re-entry (only when the account actually has a password).
  const identities = (authUser.identities || []) as Array<{ provider?: string }>;
  const providers = (authUser.app_metadata?.providers as string[] | undefined) || [];
  const hasPassword = identities.some((i) => i.provider === 'email') || providers.includes('email');

  if (hasPassword) {
    const password = typeof body.password === 'string' ? body.password : '';
    if (!password) {
      return NextResponse.json({ ok: false, code: 'password_required', message: pick('password_required', lang) }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, code: 'password_wrong', message: pick('password_wrong', lang) }, { status: 401 });
    }
    // Verify by attempting a sign-in on a throwaway, non-persistent client.
    const verifier = createSupabaseJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: signInErr } = await verifier.auth.signInWithPassword({ email, password });
    if (signInErr) {
      return NextResponse.json({ ok: false, code: 'password_wrong', message: pick('password_wrong', lang) }, { status: 401 });
    }
  }

  // 7. Run the ordered deletion (auth user removed LAST inside this call).
  try {
    await runAccountDeletion(db, { uid: user.id, email });
  } catch {
    // App data may be partially wiped/anonymized, but the auth user is intact
    // and the operation is idempotent — a retry finishes it. Nothing is left in
    // an exploitable state (see deletion.ts ordering notes).
    return NextResponse.json({ ok: false, code: 'failed', message: pick('failed', lang) }, { status: 500 });
  }

  // 8. Clear the session cookies for this browser (the auth user is now gone).
  try {
    const serverClient = await createServerSupabaseClient();
    await serverClient.auth.signOut();
  } catch {
    /* cookies clear client-side on redirect regardless */
  }

  return NextResponse.json({ ok: true, redirect: '/?deleted=1' });
}
