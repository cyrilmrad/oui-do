import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations, guests as guestsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { clampPax, splitFullNameOnFirstSpace, type NormalizedRsvpCompanion } from '@/lib/multiGuestRsvp';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
    // Public, unauthenticated endpoint — throttle per IP to curb RSVP spam and
    // slug enumeration (differing 404/403/200 responses would otherwise be an oracle).
    const limited = enforceRateLimit(request, { bucket: 'rsvp', limit: 15, windowMs: 60_000 });
    if (limited) return limited;

    try {
        const body = await request.json();
        // guestId is only present if they use personalized link
        const { guestId, slug, firstName, lastName, attending, guests, message, companions } = body;

        if (!slug || !firstName || !lastName || !attending) {
            return NextResponse.json({ error: 'Missing required RSVP fields' }, { status: 400 });
        }

        const invitationResult = await db
            .select({
                id: invitations.id,
                showRsvp: invitations.showRsvp,
                isArchived: invitations.isArchived,
                multiGuestNameCollectionEnabled: invitations.multiGuestNameCollectionEnabled
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
        const paxCount = clampPax(guests);

        if (guestId) {
            // Verify guestId belongs to this invitation before updating
            const [guestCheck] = await db
                .select({ invitationId: guestsTable.invitationId, pax: guestsTable.pax })
                .from(guestsTable)
                .where(eq(guestsTable.id, guestId))
                .limit(1);

            if (!guestCheck || guestCheck.invitationId !== invitationId) {
                return NextResponse.json({ error: 'Invalid guest link' }, { status: 403 });
            }

            const multiGuestNameCollectionEnabled = invitationResult[0].multiGuestNameCollectionEnabled === true;
            const submittedCompanions = Array.isArray(companions) ? companions : [];
            const originalPax = Math.max(1, guestCheck.pax || 1);

            if (status === 'attending' && paxCount > originalPax) {
                return NextResponse.json({ error: 'RSVP pax exceeds the invited party size' }, { status: 400 });
            }

            if (status === 'attending' && multiGuestNameCollectionEnabled && submittedCompanions.length > 0) {
                const companionSlots = Math.max(0, paxCount - 1);
                const companionsToInsert: NormalizedRsvpCompanion[] = [];

                for (const companion of submittedCompanions) {
                    if (companionsToInsert.length >= companionSlots) break;

                    const fullName = typeof companion?.fullName === 'string'
                        ? companion.fullName.trim().replace(/\s+/g, ' ')
                        : '';

                    if (!fullName) continue;

                    const { firstName, lastName } = splitFullNameOnFirstSpace(fullName);
                    companionsToInsert.push({ fullName, firstName, lastName, pax: 1 });
                }

                const primaryPax = Math.max(1, paxCount - companionsToInsert.length);

                await db.transaction(async (tx) => {
                    await tx.update(guestsTable)
                        .set({ status, pax: primaryPax, message: message || '', updatedAt: new Date() })
                        .where(eq(guestsTable.id, guestId));

                    if (companionsToInsert.length > 0) {
                        await tx.insert(guestsTable).values(companionsToInsert.map((companion) => ({
                            invitationId,
                            firstName: companion.firstName,
                            lastName: companion.lastName,
                            pax: 1,
                            parentGuestId: guestId,
                            status,
                            message: ''
                        })));
                    }
                });
            // When declining via personalized link, do NOT overwrite pax — the admin-set
            // headcount should be retained so total invitee stats remain accurate.
            } else if (status === 'attending') {
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

    } catch (error) {
        console.error("Failed saving RSVP:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
