import { supabase } from '@/lib/supabaseClient';

/** Attaches `Authorization: Bearer <access_token>` when a Supabase session exists. */
export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(init?.headers);
    if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
    }
    return fetch(input, { ...init, headers });
}
