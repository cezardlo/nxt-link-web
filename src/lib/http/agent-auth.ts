import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { checkCronSecret } from '@/lib/http/cron-auth';

export type AgentMutationAuthResult =
  | { ok: true; actor: 'automation' | 'user' }
  | { ok: false; status: 401 | 503; message: string };

async function hasAuthenticatedUser(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return false;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return Boolean(user && !error);
  } catch {
    return false;
  }
}

function isLocalDevRequest(request: Request): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(request.url);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export async function authorizeAgentMutation(
  request: Request,
): Promise<AgentMutationAuthResult> {
  const cronCheck = checkCronSecret(request.headers);
  if (cronCheck.valid) {
    return { ok: true, actor: 'automation' };
  }

  if (await hasAuthenticatedUser()) {
    return { ok: true, actor: 'user' };
  }

  // Developer ergonomics: allow local manual testing without auth setup.
  // Production remains protected by cron secret or authenticated session.
  if (isLocalDevRequest(request)) {
    return { ok: true, actor: 'user' };
  }

  if (!cronCheck.configured) {
    return {
      ok: false,
      status: 503,
      message: 'Server misconfigured: CRON_SECRET is not set and no authenticated user session was found.',
    };
  }

  return { ok: false, status: 401, message: 'Unauthorized' };
}
