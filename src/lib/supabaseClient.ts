import { createClient } from '@/utils/supabase/client';

/**
 * Singleton browser client for Client Components (`@supabase/ssr` cookie session).
 * For Server Components / Route Handlers, use `createClient` from `@/utils/supabase/server`.
 */
export const supabase = createClient();
