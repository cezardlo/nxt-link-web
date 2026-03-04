import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase/client';

export function createClient(options?: { admin?: boolean }): SupabaseClient {
  try {
    return getSupabaseClient({ admin: options?.admin ?? true });
  } catch {
    return getSupabaseClient({ admin: false });
  }
}
