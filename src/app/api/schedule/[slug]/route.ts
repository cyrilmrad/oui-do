import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { weddingSchedules } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    try {
        const rows = await db.select().from(weddingSchedules).where(eq(weddingSchedules.slug, slug));
        if (!rows[0]) {
            return NextResponse.json(null, { status: 404 });
        }
        return NextResponse.json(rows[0]);
    } catch (err) {
        console.error('GET /api/schedule/[slug] failed', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
