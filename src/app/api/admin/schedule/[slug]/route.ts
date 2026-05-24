import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/entitlements/guard';
import { db } from '@/db';
import { weddingSchedules } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const authGuard = await requireAdmin(request);
    if (!authGuard.ok) {
        return NextResponse.json({ error: authGuard.message }, { status: authGuard.status });
    }

    const { slug } = await params;
    try {
        const rows = await db.select().from(weddingSchedules).where(eq(weddingSchedules.slug, slug));
        return NextResponse.json(rows[0] ?? null);
    } catch (err) {
        console.error('GET /api/admin/schedule/[slug] failed', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const authGuard = await requireAdmin(request);
    if (!authGuard.ok) {
        return NextResponse.json({ error: authGuard.message }, { status: authGuard.status });
    }

    const { slug } = await params;
    try {
        const body = await request.json();
        const now = new Date();

        const payload = {
            slug,
            title: body.title ?? '',
            weddingDate: body.weddingDate || null,
            backgroundColor: body.backgroundColor ?? '#cfe8e0',
            backgroundImageUrl: body.backgroundImageUrl ?? null,
            accentColor: body.accentColor ?? '#00150f',
            textColor: body.textColor ?? '#1a2e25',
            items: body.items ?? [],
            updatedAt: now,
        };

        await db
            .insert(weddingSchedules)
            .values({ ...payload, createdAt: now })
            .onConflictDoUpdate({
                target: weddingSchedules.slug,
                set: payload,
            });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('PUT /api/admin/schedule/[slug] failed', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
