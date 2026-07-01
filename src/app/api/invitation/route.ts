import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Internal / lifecycle fields that no public or authenticated consumer of this
 * endpoint reads. This route is unauthenticated (the public seat-finder page
 * uses it), so we strip operational metadata to avoid leaking archive/lock
 * state and timestamps. `clientLocked` is intentionally kept — the client
 * dashboard reads it to render the locked-editing state.
 */
const INTERNAL_FIELDS = new Set([
    'createdAt',
    'updatedAt',
    'isArchived',
    'archivedAt',
    'archiveMessage',
    'clientLockedAt',
]);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
        }

        const result = await db.select().from(invitations).where(eq(invitations.slug, slug));

        if (result.length === 0) {
            return NextResponse.json(null, { status: 200 }); // Valid, just empty
        }

        const publicData = Object.fromEntries(
            Object.entries(result[0]).filter(([key]) => !INTERNAL_FIELDS.has(key))
        );

        return NextResponse.json(publicData, { status: 200 });

    } catch (error) {
        console.error("Failed fetching invitation:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
