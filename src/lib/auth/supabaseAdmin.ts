import { createClient, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin =
    supabaseUrl && supabaseUrl.startsWith('http') && serviceRoleKey
        ? createClient(supabaseUrl, serviceRoleKey, {
              auth: { autoRefreshToken: false, persistSession: false }
          })
        : null;

export async function getUserFromAccessToken(accessToken: string | undefined): Promise<User | null> {
    if (!accessToken || !supabaseAdmin) return null;
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return data.user;
}
