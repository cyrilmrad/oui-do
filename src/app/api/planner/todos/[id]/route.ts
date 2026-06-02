import { NextResponse } from 'next/server';
import { requireAdminOrAssistant } from '@/lib/entitlements/guard';
import { db } from '@/db';
import { plannerTodos } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdminOrAssistant(request);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    try {
        const { id } = await params;
        const body = await request.json();
        const [updated] = await db
            .update(plannerTodos)
            .set({
                ...(body.title !== undefined && { title: body.title }),
                ...(body.description !== undefined && { description: body.description }),
                ...(body.isCompleted !== undefined && { isCompleted: body.isCompleted }),
                ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
                updatedAt: new Date(),
            })
            .where(eq(plannerTodos.id, id))
            .returning();
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdminOrAssistant(request);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    try {
        const { id } = await params;
        await db.delete(plannerTodos).where(eq(plannerTodos.id, id));
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
    }
}
