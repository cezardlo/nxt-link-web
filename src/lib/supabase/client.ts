import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function resolveSupabaseEnv(url?: string, key?: string): { url: string; key: string } {
  if (!url || !key) {
    throw new Error(
      'Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).',
    );
  }

  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey));
}

export function getSupabaseClient(options?: { admin?: boolean }): SupabaseClient {
  // When admin is requested but the service role key is missing in the
  // environment, fall back to the anon key so read-only routes still
  // function. RLS policies determine what actually succeeds. Write paths
  // (UPDATE / DELETE) will surface a row-level-security error, which is
  // a much cleaner failure than a 500 thrown at client construction time.
  const adminWanted = options?.admin === true;
  const key = adminWanted && supabaseServiceRoleKey
    ? supabaseServiceRoleKey
    : supabaseAnonKey;
  const resolved = resolveSupabaseEnv(supabaseUrl, key);

  return createSupabaseJsClient(resolved.url, resolved.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function hasSupabaseAdmin(): boolean {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function createClient(): SupabaseClient {
  const resolved = resolveSupabaseEnv(supabaseUrl, supabaseAnonKey);

  return createSupabaseJsClient(resolved.url, resolved.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export async function checkSupabaseConnection(): Promise<{
  ok: boolean;
  status: number | null;
  message: string;
}> {
  const key = supabaseAnonKey ?? supabaseServiceRoleKey;

  if (!supabaseUrl || !key) {
    return {
      ok: false,
      status: null,
      message:
        'Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: 'no-store',
    });

    if (response.ok || response.status === 404) {
      return {
        ok: true,
        status: response.status,
        message: 'Supabase endpoint reachable.',
      };
    }

    const body = await response.text();
    return {
      ok: false,
      status: response.status,
      message: body || 'Supabase returned a non-success status.',
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      message: error instanceof Error ? error.message : 'Unknown connection error.',
    };
  }
}
