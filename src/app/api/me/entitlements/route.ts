import { NextResponse } from 'next/server';
import { verifyBearerUser } from '@/lib/entitlements/guard';
import { getClientEntitlementsBySlug } from '@/lib/entitlements/service';

function bearerToken(request: Request): string | undefined {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return undefined;
    return auth.slice(7).trim();
}

export async function GET(request: Request) {
    try {
        const auth = await verifyBearerUser(bearerToken(request));
        if (!auth.ok) {
            return NextResponse.json({ error: auth.message }, { status: auth.status });
        }
        if (auth.isAdmin) {
            return NextResponse.json(
                { error: 'Use admin client-entitlements endpoints for admin users' },
                { status: 400 }
            );
        }
        const slug = auth.clientSlug!;
        const payload = await getClientEntitlementsBySlug(slug);
        return NextResponse.json(payload, { status: 200 });
    } catch (e: any) {
        console.error('GET /me/entitlements', e);
        return NextResponse.json({ error: e.message ?? 'Server error' }, { status: 500 });
    }
}
