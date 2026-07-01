import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireFeatureForSlug } from '@/lib/entitlements/guard';

// Max length per string column. varchar(255) columns match the DB (so we return a
// clean 400 instead of a DB error); URL/text columns get generous but finite caps.
const STRING_CAPS: Record<string, number> = {
    bride: 255, groom: 255, date: 255, time: 255, venue: 255, location: 255,
    receptionTime: 255, receptionVenue: 255, receptionLocation: 255, receptionAddress: 255,
    bankAccountName: 255, bankAccountNumber: 255, mobileTransferNumber: 255,
    mapLink: 2048, heroImage: 2048, metadataImageUrl: 2048, heroVideo: 2048,
    detailsBackgroundUrl: 2048, audioUrl: 2048, heroLogoUrl: 2048,
    formalInvitationImage: 2048, preCeremonyMedia: 2048,
    message: 10000, giftMessage: 5000, footnote: 5000, rsvpClosedMessage: 5000,
};
// Structured JSONB columns: cap serialized size to prevent storage-bloat.
const JSONB_FIELDS = new Set(['giftOptions', 'theme', 'customSections', 'navigationPages', 'housesData']);
const MAX_JSONB_BYTES = 256 * 1024;

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
        const allowedFields = [
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
            'multiGuestNameCollectionEnabled',
        ] as const;

        const updateData: Record<string, unknown> = {};
        for (const key of allowedFields) {
            if (!(key in body)) continue;
            const value = body[key];

            const cap = STRING_CAPS[key];
            if (typeof value === 'string' && cap !== undefined && value.length > cap) {
                return NextResponse.json({ error: `${key} is too long (max ${cap} characters)` }, { status: 400 });
            }
            if (JSONB_FIELDS.has(key) && value != null && JSON.stringify(value).length > MAX_JSONB_BYTES) {
                return NextResponse.json({ error: `${key} payload is too large` }, { status: 400 });
            }

            updateData[key] = value;
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await db.insert(invitations).values({ slug, ...updateData } as any);
            return NextResponse.json({ message: 'Invitation created successfully' });
        }

    } catch (error: any) {
        console.error("Failed saving invitation:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

