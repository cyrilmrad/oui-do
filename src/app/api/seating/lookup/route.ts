import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations, guests as guestsTable, seatingTables } from '@/db/schema';
import { and, eq, ne } from 'drizzle-orm';

/** Lowercase, strip diacritics, collapse whitespace — for forgiving name matching. */
function normalizeName(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

interface MatchResult {
    guestName: string;
    pax: number;
    table: { name: string; shape: string | null } | null;
    tablemates: string[];
}

/**
 * Public "find my seat" lookup.
 * GET /api/seating/lookup?slug=<slug>&q=<name>
 * Returns guests whose name matches the query along with their assigned table.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');
        const q = searchParams.get('q');

        if (!slug || !q || !q.trim()) {
            return NextResponse.json({ error: 'Missing slug or search query' }, { status: 400 });
        }

        const [invitation] = await db
            .select({ id: invitations.id, isArchived: invitations.isArchived })
            .from(invitations)
            .where(eq(invitations.slug, slug));

        if (!invitation) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        const tables = await db
            .select({ id: seatingTables.id, name: seatingTables.name, shape: seatingTables.shape })
            .from(seatingTables)
            .where(eq(seatingTables.slug, slug));

        const tableById = new Map(tables.map((t) => [t.id, t]));

        const allGuests = await db
            .select({
                id: guestsTable.id,
                firstName: guestsTable.firstName,
                lastName: guestsTable.lastName,
                pax: guestsTable.pax,
                tableId: guestsTable.tableId,
            })
            .from(guestsTable)
            .where(and(eq(guestsTable.invitationId, invitation.id), ne(guestsTable.status, 'declined')));

        const query = normalizeName(q);

        const scored = allGuests.map((g) => {
            const full = normalizeName(`${g.firstName} ${g.lastName}`);
            const reversed = normalizeName(`${g.lastName} ${g.firstName}`);
            const first = normalizeName(g.firstName);
            const last = normalizeName(g.lastName);

            let score = 0;
            if (full === query || reversed === query) score = 3;
            else if (first === query || last === query) score = 2;
            else if (query.length >= 2 && (full.includes(query) || reversed.includes(query))) score = 1;

            return { guest: g, score };
        }).filter((s) => s.score > 0);

        // If we have any exact full-name matches, only return those (avoids noisy partials).
        const bestScore = scored.reduce((max, s) => Math.max(max, s.score), 0);
        const filtered = bestScore === 3 ? scored.filter((s) => s.score === 3) : scored;

        filtered.sort((a, b) => b.score - a.score);

        const results: MatchResult[] = filtered.slice(0, 10).map(({ guest }) => {
            const table = guest.tableId ? tableById.get(guest.tableId) ?? null : null;
            const tablemates = guest.tableId
                ? allGuests
                    .filter((other) => other.tableId === guest.tableId && other.id !== guest.id)
                    .map((other) => `${other.firstName} ${other.lastName}`.trim())
                : [];

            return {
                guestName: `${guest.firstName} ${guest.lastName}`.trim(),
                pax: guest.pax,
                table: table ? { name: table.name, shape: table.shape } : null,
                tablemates,
            };
        });

        return NextResponse.json({ results }, { status: 200 });
    } catch (error) {
        console.error('Failed seating lookup:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
