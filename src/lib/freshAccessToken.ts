import { supabase } from '@/lib/supabaseClient';

/**
 * Returns the current Supabase access token, read fresh from the client's
 * (auto-refreshed) session at call time — NOT a value captured earlier in React
 * state. A token snapshotted at page mount goes stale ~1h after login, which makes
 * token-authenticated server actions fail with "Unauthorized". Pass a previously
 * captured token as `fallback` for the rare case `getSession()` is unavailable.
 */
export async function getFreshAccessToken(fallback?: string | null): Promise<string | undefined> {
    try {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? fallback ?? undefined;
    } catch {
        return fallback ?? undefined;
    }
}
