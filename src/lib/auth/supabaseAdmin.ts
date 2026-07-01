import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Fetch ALL auth users, paging past Supabase's per-request cap (default page size
 * 50, max 1000). Without paging, admin lookups — slug-collision checks, per-wedding
 * account listing, and password/account operations — silently miss users once the
 * workspace grows beyond one page. Throws on API error (callers wrap in try/catch).
 */
export async function listAllAuthUsers(admin: SupabaseClient): Promise<User[]> {
    const all: User[] = [];
    const perPage = 1000;
    // Hard page cap (100k users) as a runaway-loop backstop.
    for (let page = 1; page <= 100; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const users = data?.users ?? [];
        all.push(...users);
        if (users.length < perPage) break;
    }
    return all;
}

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
