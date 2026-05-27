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

        const invitationResult = await db
            .select({
                id: invitations.id,
                showRsvp: invitations.showRsvp,
                isArchived: invitations.isArchived
            })
            .from(invitations)
            .where(eq(invitations.slug, slug));

        if (invitationResult.length === 0) {
            return NextResponse.json({ error: 'Invalid invitation slug' }, { status: 404 });
        }

        if (invitationResult[0].showRsvp === false) {
            return NextResponse.json({ error: 'RSVP is not enabled for this invitation' }, { status: 403 });
        }

        if (invitationResult[0].isArchived === true) {
            return NextResponse.json({ error: 'This event has concluded.' }, { status: 403 });
        }

        const invitationId = invitationResult[0].id;
        const status = attending === 'yes' ? 'attending' : 'declined';
        const paxCount = parseInt(guests, 10) || 1;

        if (guestId) {
            // Verify guestId belongs to this invitation before updating
            const [guestCheck] = await db
                .select({ invitationId: guestsTable.invitationId })
                .from(guestsTable)
                .where(eq(guestsTable.id, guestId))
                .limit(1);

            if (!guestCheck || guestCheck.invitationId !== invitationId) {
                return NextResponse.json({ error: 'Invalid guest link' }, { status: 403 });
            }

            // When declining via personalized link, do NOT overwrite pax — the admin-set
            // headcount should be retained so total invitee stats remain accurate.
            if (status === 'attending') {
                await db.update(guestsTable)
                    .set({ status, pax: paxCount, message: message || '', updatedAt: new Date() })
                    .where(eq(guestsTable.id, guestId));
            } else {
                await db.update(guestsTable)
                    .set({ status, message: message || '', updatedAt: new Date() })
                    .where(eq(guestsTable.id, guestId));
            }
        } else {
            // Generic link insert — use submitted pax if attending, else 1 (the person
            // who declined still counts as 1 invitee for accurate totals).
            await db.insert(guestsTable).values({
                invitationId,
                firstName,
                lastName,
                status,
                pax: status === 'attending' ? paxCount : 1,
                message: message || ''
            });
        }

        return NextResponse.json({ message: 'RSVP submitted successfully' });

    } catch (error: any) {
        console.error("Failed saving RSVP:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
