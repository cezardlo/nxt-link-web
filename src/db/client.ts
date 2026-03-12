import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export function getDb(options?: { admin?: boolean }): SupabaseClient {
  return getSupabaseClient(options);
}

export { isSupabaseConfigured };
