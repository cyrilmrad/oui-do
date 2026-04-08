import type { User } from '@supabase/supabase-js';
import { getUserFromAccessToken } from '@/lib/auth/supabaseAdmin';
import type { FeatureKey } from '@/lib/features';
import { assertFeatureEnabled, getClientEntitlementsBySlug } from '@/lib/entitlements/service';

export type AuthGuardResult =
    | { ok: true; user: User; isAdmin: boolean; clientSlug?: string }
    | { ok: false; status: number; message: string };

export async function verifyBearerUser(accessToken: string | undefined): Promise<AuthGuardResult> {
    const user = await getUserFromAccessToken(accessToken);
    if (!user) {
        return { ok: false, status: 401, message: 'Unauthorized' };
    }
    const role = user.app_metadata?.role as string | undefined;
    if (role === 'admin') {
        return { ok: true, user, isAdmin: true };
    }
    if (role === 'client') {
        const clientSlug = user.app_metadata?.slug as string | undefined;
        if (!clientSlug) {
            return { ok: false, status: 403, message: 'Missing client slug in profile' };
        }
        return { ok: true, user, isAdmin: false, clientSlug };
    }
    return { ok: false, status: 403, message: 'Forbidden' };
}

function bearerTokenFromRequest(request: Request): string | undefined {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return undefined;
    return auth.slice(7).trim();
}

/**
 * Ensures the caller may act on `slug` and has the feature enabled (clients only; admins bypass feature checks).
 */
export async function requireFeatureForSlug(
    request: Request,
    slug: string,
    feature: FeatureKey
): Promise<AuthGuardResult & { featureOk?: boolean }> {
    const token = bearerTokenFromRequest(request);
    const auth = await verifyBearerUser(token);
    if (!auth.ok) return auth;

    if (auth.isAdmin) {
        return { ...auth, featureOk: true };
    }

    if (auth.clientSlug !== slug) {
        return { ok: false, status: 403, message: 'Forbidden' };
    }

    const { features } = await getClientEntitlementsBySlug(slug);
    if (!features[feature]) {
        return { ok: false, status: 403, message: `Feature "${feature}" is not enabled for this account` };
    }

    return { ...auth, featureOk: true };
}

export async function requireAdmin(request: Request): Promise<AuthGuardResult> {
    const token = bearerTokenFromRequest(request);
    const auth = await verifyBearerUser(token);
    if (!auth.ok) return auth;
    if (!auth.isAdmin) {
        return { ok: false, status: 403, message: 'Admin only' };
    }
    return auth;
}

/** Server actions & internal calls: verify JWT and feature (admins bypass feature checks). */
export async function enforceSlugFeature(
    slug: string,
    feature: FeatureKey,
    accessToken: string | undefined
): Promise<void> {
    const auth = await verifyBearerUser(accessToken);
    if (!auth.ok) {
        throw new Error(auth.message);
    }
    if (auth.isAdmin) {
        return;
    }
    if (auth.clientSlug !== slug) {
        throw new Error('Forbidden');
    }
    await assertFeatureEnabled(slug, feature);
}
