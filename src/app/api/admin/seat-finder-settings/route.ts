import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireFeatureForSlug } from '@/lib/entitlements/guard';
import type { SeatFinderSettings } from '@/lib/seatFinder';

export async function PUT(request: Request) {
    try {
        const body = await request.json() as { slug?: string; seatFinderSettings?: SeatFinderSettings };
        const { slug, seatFinderSettings } = body;

        if (!slug) {
            return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
        }
        if (!seatFinderSettings) {
            return NextResponse.json({ error: 'Missing seatFinderSettings' }, { status: 400 });
        }

        const guard = await requireFeatureForSlug(request, slug, 'seating');
        if (!guard.ok) {
            return NextResponse.json({ error: guard.message }, { status: guard.status });
        }

        await db
            .update(invitations)
            .set({ seatFinderSettings, updatedAt: new Date() })
            .where(eq(invitations.slug, slug));

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Failed saving seat finder settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
