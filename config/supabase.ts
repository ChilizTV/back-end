import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Use service role key for server-side operations (bypasses RLS)
// Fallback to anon key if service role key is not set
const serverSupabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

export const supabase = createClient(supabaseUrl, serverSupabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

if (supabaseServiceRoleKey) {
    console.log('🚀 Supabase client initialized with SERVICE_ROLE key (bypasses RLS)');
} else {
    console.log('⚠️ Supabase client initialized with ANON key (subject to RLS)');
    console.log('💡 For better security, set SUPABASE_SERVICE_ROLE_KEY in your .env file');
}

console.log('🚀 Supabase client initialized'); 