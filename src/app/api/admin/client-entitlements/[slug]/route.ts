import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/entitlements/guard';
import { getClientEntitlementsBySlug, upsertClientEntitlements } from '@/lib/entitlements/service';
import type { FeatureKey } from '@/lib/features';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, ctx: Ctx) {
    try {
        const admin = await requireAdmin(_request);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.message }, { status: admin.status });
        }
        const { slug } = await ctx.params;
        const decoded = decodeURIComponent(slug);
        const payload = await getClientEntitlementsBySlug(decoded);
        return NextResponse.json(payload, { status: 200 });
    } catch (e: any) {
        console.error('GET /admin/client-entitlements/[slug]', e);
        return NextResponse.json({ error: e.message ?? 'Server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request, ctx: Ctx) {
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.message }, { status: admin.status });
        }
        const { slug } = await ctx.params;
        const decoded = decodeURIComponent(slug);
        const body = await request.json();

        const flags: Partial<Record<FeatureKey, boolean>> = {};
        for (const key of ['guests', 'messages', 'budget', 'seating', 'settings'] as const) {
            if (typeof body[key] === 'boolean') {
                flags[key] = body[key];
            }
        }

        const payload = await upsertClientEntitlements(decoded, flags);
        return NextResponse.json(payload, { status: 200 });
    } catch (e: any) {
        console.error('PATCH /admin/client-entitlements/[slug]', e);
        return NextResponse.json({ error: e.message ?? 'Server error' }, { status: 500 });
    }
}
