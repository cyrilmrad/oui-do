import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireFeatureForSlug } from '@/lib/entitlements/guard';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { slug, id, createdAt, updatedAt, ...updateData } = body;

        if (!slug) {
            return NextResponse.json({ error: 'Missing client slug' }, { status: 400 });
        }

        const guard = await requireFeatureForSlug(request, slug, 'settings');
        if (!guard.ok) {
            return NextResponse.json({ error: guard.message }, { status: guard.status });
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

