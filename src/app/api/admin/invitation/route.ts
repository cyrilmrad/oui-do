import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireFeatureForSlug } from '@/lib/entitlements/guard';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { slug } = body;

        if (!slug) {
            return NextResponse.json({ error: 'Missing client slug' }, { status: 400 });
        }

        const guard = await requireFeatureForSlug(request, slug, 'settings');
        if (!guard.ok) {
            return NextResponse.json({ error: guard.message }, { status: guard.status });
        }

        // Explicit allowlist — only known invitation columns may be written
        const allowedFields: (keyof typeof body)[] = [
            'bride', 'groom', 'date', 'time',
            'venue', 'location',
            'receptionTime', 'receptionVenue', 'receptionLocation', 'receptionAddress',
            'mapLink', 'heroImage', 'metadataImageUrl', 'heroVideo',
            'detailsBackgroundUrl', 'audioUrl',
            'message', 'giftMessage',
            'bankAccountName', 'bankAccountNumber', 'mobileTransferNumber', 'giftOptions',
            'theme', 'heroLogoUrl', 'showHeroLogo', 'showHeroDate',
            'showFormalInvitation', 'formalInvitationImage', 'preCeremonyMedia',
            'showHouses', 'housesData', 'showNavigation', 'navigationPages',
            'customSections', 'footnote', 'showRsvp', 'rsvpClosedMessage',
        ];

        const updateData: Record<string, unknown> = {};
        for (const key of allowedFields) {
            if (key in body) updateData[key] = body[key];
        }

        // Check if invitation already exists for this slug
        const existing = await db.select().from(invitations).where(eq(invitations.slug, slug));

        if (existing.length > 0) {
            // Update
            await db.update(invitations)
                .set({ ...updateData, updatedAt: new Date() })
                .where(eq(invitations.slug, slug));
            return NextResponse.json({ message: 'Invitation updated successfully' });
        } else {
            // Insert new
            await db.insert(invitations).values({ slug, ...updateData });
            return NextResponse.json({ message: 'Invitation created successfully' });
        }

    } catch (error: any) {
        console.error("Failed saving invitation:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

