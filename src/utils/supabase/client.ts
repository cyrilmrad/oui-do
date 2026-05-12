import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** Browser Supabase client (cookie-backed session; pair with middleware refresh). */
export function createClient(): SupabaseClient {
    if (!supabaseUrl.startsWith('http')) {
        return {} as SupabaseClient;
    }
    return createBrowserClient(supabaseUrl, supabaseKey);
}
