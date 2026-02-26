import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serverSupabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

export const supabaseClient: SupabaseClient = createClient(
  supabaseUrl,
  serverSupabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

export type { SupabaseClient };
