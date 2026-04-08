import { NextResponse } from 'next/server';
import { db } from '@/db';
import { guests, invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireFeatureForSlug } from '@/lib/entitlements/guard';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
        }

        const guard = await requireFeatureForSlug(request, slug, 'guests');
        if (!guard.ok) {
            return NextResponse.json({ error: guard.message }, { status: guard.status });
        }

        const invitation = await db.select().from(invitations).where(eq(invitations.slug, slug));
        if (invitation.length === 0) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        const guestList = await db.select().from(guests).where(eq(guests.invitationId, invitation[0].id));
        return NextResponse.json(guestList, { status: 200 });
    } catch (error: any) {
        console.error("Failed fetching guests:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { slug, guests: newGuests } = body;

        if (!slug || !newGuests) {
            return NextResponse.json({ error: 'Missing slug or guests data' }, { status: 400 });
        }

        const guard = await requireFeatureForSlug(request, slug, 'guests');
        if (!guard.ok) {
            return NextResponse.json({ error: guard.message }, { status: guard.status });
        }

        const invitation = await db.select().from(invitations).where(eq(invitations.slug, slug));
        if (invitation.length === 0) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        const invitationId = invitation[0].id;

        const guestsToInsert = Array.isArray(newGuests) ? newGuests : [newGuests];
        const insertData = guestsToInsert.map((g: any) => ({
            invitationId,
            firstName: g.firstName,
            lastName: g.lastName,
            pax: g.pax || 1,
            status: g.status || 'pending',
            message: g.message || ''
        }));

        await db.insert(guests).values(insertData);
        return NextResponse.json({ message: 'Guests added successfully' }, { status: 201 });
    } catch (error: any) {
        console.error("Failed adding guests:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, firstName, lastName, pax, status, message } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing guest id' }, { status: 400 });
        }

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

        await db.update(guests)
            .set({ firstName, lastName, pax, status, message })
            .where(eq(guests.id, id));

        return NextResponse.json({ message: 'Guest updated successfully' }, { status: 200 });
    } catch (error: any) {
        console.error("Failed updating guest:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing guest id' }, { status: 400 });
        }

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
