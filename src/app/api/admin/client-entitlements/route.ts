import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/entitlements/guard';
import { getAllClientEntitlements, getClientEntitlementsBySlug, upsertClientEntitlements } from '@/lib/entitlements/service';
import type { FeatureKey } from '@/lib/features';

export async function GET(request: Request) {
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.message }, { status: admin.status });
        }

        const rows = await getAllClientEntitlements();
        const enriched = await Promise.all(
            rows.map(async (row) => {
                const payload = await getClientEntitlementsBySlug(row.slug);
                return {
                    id: row.id,
                    slug: row.slug,
                    features: payload.features,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt
                };
            })
        );
        return NextResponse.json(enriched, { status: 200 });
    } catch (e: any) {
        console.error('GET /admin/client-entitlements', e);
        return NextResponse.json({ error: e.message ?? 'Server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.message }, { status: admin.status });
        }

        const body = await request.json();
        const slug = body.slug as string | undefined;
        if (!slug?.trim()) {
            return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
        }

        const flags: Partial<Record<FeatureKey, boolean>> = {};
        for (const key of ['guests', 'messages', 'budget', 'seating', 'settings'] as const) {
            if (typeof body[key] === 'boolean') {
                flags[key] = body[key];
            }
        }

        const payload = await upsertClientEntitlements(slug.trim(), flags);
        return NextResponse.json(payload, { status: 201 });
    } catch (e: any) {
        console.error('POST /admin/client-entitlements', e);
        return NextResponse.json({ error: e.message ?? 'Server error' }, { status: 500 });
    }
}
