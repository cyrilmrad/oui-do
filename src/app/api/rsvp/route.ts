import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations, rsvps } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { slug, firstName, lastName, attending, guests, dietary } = body;

        if (!slug || !firstName || !lastName || !attending) {
            return NextResponse.json({ error: 'Missing required RSVP fields' }, { status: 400 });
        }

        // 1. Find the parent invitation by slug
        const invitationResult = await db.select({ id: invitations.id }).from(invitations).where(eq(invitations.slug, slug));

        if (invitationResult.length === 0) {
            return NextResponse.json({ error: 'Invalid invitation slug' }, { status: 404 });
        }

        const invitationId = invitationResult[0].id;

        // 2. Insert the RSVP record
        await db.insert(rsvps).values({
            invitationId,
            firstName,
            lastName,
            status: attending === 'yes' ? 'attending' : 'declined',
            guests: attending === 'yes' ? parseInt(guests, 10) || 1 : 0,
            dietary: attending === 'yes' ? dietary : '',
            message: '' // Assuming message is not in RSVP form yet, but could be added later
        });

        return NextResponse.json({ message: 'RSVP submitted successfully' });

    } catch (error: any) {
        console.error("Failed saving RSVP:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
