import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations, guests as guestsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // guestId is only present if they use personalized link
        const { guestId, slug, firstName, lastName, attending, guests, message } = body;

        if (!slug || !firstName || !lastName || !attending) {
            return NextResponse.json({ error: 'Missing required RSVP fields' }, { status: 400 });
        }

        const invitationResult = await db.select({ id: invitations.id }).from(invitations).where(eq(invitations.slug, slug));

        if (invitationResult.length === 0) {
            return NextResponse.json({ error: 'Invalid invitation slug' }, { status: 404 });
        }

        const invitationId = invitationResult[0].id;
        const status = attending === 'yes' ? 'attending' : 'declined';
        const paxCount = attending === 'yes' ? parseInt(guests, 10) || 1 : 0;

        if (guestId) {
            // Personalized Link Update
            await db.update(guestsTable)
                .set({ status, pax: paxCount, message: message || '', updatedAt: new Date() })
                .where(eq(guestsTable.id, guestId));
        } else {
            // Generic Link Insert
            await db.insert(guestsTable).values({
                invitationId,
                firstName,
                lastName,
                status,
                pax: paxCount,
                message: message || ''
            });
        }

        return NextResponse.json({ message: 'RSVP submitted successfully' });

    } catch (error: any) {
        console.error("Failed saving RSVP:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
