import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

function initSupabase(): SupabaseClient | null {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    try {
          return createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
          console.warn('[supabase] Failed to initialise client:', err);
          return null;
    }
}

export const supabase = initSupabase();

export const isSupabasePublicConfigured = Boolean(supabaseUrl && supabaseAnonKey);
