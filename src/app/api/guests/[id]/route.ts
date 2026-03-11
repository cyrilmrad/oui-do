import { NextResponse } from 'next/server';
import { db } from '@/db';
import { guests } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        // ensure id is available
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const updateData = await request.json();

        await db.update(guests)
            .set({ ...updateData, updatedAt: new Date() })
            .where(eq(guests.id, id));

        return NextResponse.json({ message: 'Guest updated successfully' }, { status: 200 });
    } catch (error: any) {
        console.error("Failed updating guest:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        await db.delete(guests).where(eq(guests.id, id));

        return NextResponse.json({ message: 'Guest deleted successfully' }, { status: 200 });
    } catch (error: any) {
        console.error("Failed deleting guest:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
