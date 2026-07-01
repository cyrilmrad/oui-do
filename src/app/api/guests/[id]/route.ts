import { NextResponse } from 'next/server';
import { db } from '@/db';
import { guests, invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireFeatureForSlug } from '@/lib/entitlements/guard';
import { reqString, optString, intInRange, enumValue, isValidationError, ValidationError } from '@/lib/validation';

const GUEST_STATUSES = ['pending', 'attending', 'declined'] as const;

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

        const body = await request.json();

        // Validate only the fields present so partial updates (e.g. a lone table
        // assignment from the seating planner) keep working.
        const updateData: Record<string, unknown> = {};
        if ('firstName' in body) updateData.firstName = reqString(body.firstName, 'firstName', 200);
        if ('lastName' in body) updateData.lastName = optString(body.lastName, 'lastName', 200);
        if ('pax' in body) updateData.pax = intInRange(body.pax, 'pax', 1, 100);
        if ('status' in body) updateData.status = enumValue(body.status, 'status', GUEST_STATUSES);
        if ('message' in body) updateData.message = optString(body.message, 'message', 2000);
        if ('tableId' in body) {
            const t = body.tableId;
            if (t !== null && typeof t !== 'string') {
                throw new ValidationError('tableId must be a table id or null');
            }
            // Empty string means "unassign" → store null (the column is a uuid FK).
            updateData.tableId = t ? optString(t, 'tableId', 64) : null;
        }

        if (Object.keys(updateData).length > 0) {
            await db.update(guests).set({ ...updateData, updatedAt: new Date() }).where(eq(guests.id, id));
        }

        return NextResponse.json({ message: 'Guest updated successfully' }, { status: 200 });
    } catch (error) {
        if (isValidationError(error)) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error("Failed updating guest:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
