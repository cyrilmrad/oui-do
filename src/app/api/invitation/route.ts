import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

        return NextResponse.json(result[0], { status: 200 });

    } catch (error: any) {
        console.error("Failed fetching invitation:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
