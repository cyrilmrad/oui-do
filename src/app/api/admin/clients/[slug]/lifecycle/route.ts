import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/entitlements/guard';

interface LifecyclePatchBody {
    clientLocked?: boolean;
    isArchived?: boolean;
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const authGuard = await requireAdmin(request);
    if (!authGuard.ok) {
        return NextResponse.json({ error: authGuard.message }, { status: authGuard.status });
    }

    const { slug } = await params;
    const decoded = decodeURIComponent(slug);
    let body: LifecyclePatchBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body.clientLocked !== 'boolean' && typeof body.isArchived !== 'boolean') {
        return NextResponse.json(
            { error: 'Provide at least one of clientLocked or isArchived (boolean).' },
            { status: 400 }
        );
    }

    const now = new Date();
    const updates: Partial<typeof invitations.$inferInsert> = { updatedAt: now };

    if (typeof body.clientLocked === 'boolean') {
        updates.clientLocked = body.clientLocked;
        updates.clientLockedAt = body.clientLocked ? now : null;
    }
    if (typeof body.isArchived === 'boolean') {
        updates.isArchived = body.isArchived;
        updates.archivedAt = body.isArchived ? now : null;
    }

    try {
        const updated = await db
            .update(invitations)
            .set(updates)
            .where(eq(invitations.slug, decoded))
            .returning({
                slug: invitations.slug,
                clientLocked: invitations.clientLocked,
                clientLockedAt: invitations.clientLockedAt,
                isArchived: invitations.isArchived,
                archivedAt: invitations.archivedAt
            });

        if (updated.length === 0) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        return NextResponse.json(updated[0]);
    } catch (err) {
        console.error('PATCH /api/admin/clients/[slug]/lifecycle failed', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
