import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations, rsvps } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
        }

        const invitationResult = await db.select({ id: invitations.id }).from(invitations).where(eq(invitations.slug, slug));

        if (invitationResult.length === 0) {
            return NextResponse.json({ error: 'Invalid invitation slug' }, { status: 404 });
        }

        const invitationId = invitationResult[0].id;

        const guestRsvps = await db.select().from(rsvps).where(eq(rsvps.invitationId, invitationId));

        return NextResponse.json(guestRsvps, { status: 200 });

    } catch (error: any) {
        console.error("Failed fetching RSVPs:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
