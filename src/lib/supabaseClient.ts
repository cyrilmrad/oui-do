import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Avoid crashing during static build extraction if keys are currently placeholders
export const supabase = supabaseUrl && supabaseUrl.startsWith('http')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {} as any; // Cast as any for build time (it will fail cleanly later or redirect to login)
