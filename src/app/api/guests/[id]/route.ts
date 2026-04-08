import { NextResponse } from 'next/server';
import { db } from '@/db';
import { guests, invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireFeatureForSlug } from '@/lib/entitlements/guard';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const [guestRow] = await db.select().from(guests).where(eq(guests.id, id)).limit(1);
        if (!guestRow) {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
        }
        const [inv] = await db.select().from(invitations).where(eq(invitations.id, guestRow.invitationId)).limit(1);
        if (!inv) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        const guard = await requireFeatureForSlug(request, inv.slug, 'guests');
        if (!guard.ok) {
            return NextResponse.json({ error: guard.message }, { status: guard.status });
        }

        const updateData = await request.json();

        await db.update(guests).set({ ...updateData, updatedAt: new Date() }).where(eq(guests.id, id));

        return NextResponse.json({ message: 'Guest updated successfully' }, { status: 200 });
    } catch (error: any) {
        console.error("Failed updating guest:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const [guestRow] = await db.select().from(guests).where(eq(guests.id, id)).limit(1);
        if (!guestRow) {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
        }
        const [inv] = await db.select().from(invitations).where(eq(invitations.id, guestRow.invitationId)).limit(1);
        if (!inv) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        const guard = await requireFeatureForSlug(request, inv.slug, 'guests');
        if (!guard.ok) {
            return NextResponse.json({ error: guard.message }, { status: guard.status });
        }

        await db.delete(guests).where(eq(guests.id, id));

        return NextResponse.json({ message: 'Guest deleted successfully' }, { status: 200 });
    } catch (error: any) {
        console.error("Failed deleting guest:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
