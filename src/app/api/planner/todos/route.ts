import { NextResponse } from 'next/server';
import { requireAdminOrAssistant } from '@/lib/entitlements/guard';
import { db } from '@/db';
import { plannerTodos } from '@/db/schema';
import { asc, max } from 'drizzle-orm';
import { reqString, optString, isValidationError } from '@/lib/validation';

export async function GET(request: Request) {
    const auth = await requireAdminOrAssistant(request);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const rows = await db.select().from(plannerTodos).orderBy(asc(plannerTodos.sortOrder), asc(plannerTodos.createdAt));
    return NextResponse.json(rows);
}

export async function POST(request: Request) {
    const auth = await requireAdminOrAssistant(request);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    try {
        const body = await request.json();
        const [{ maxOrder }] = await db.select({ maxOrder: max(plannerTodos.sortOrder) }).from(plannerTodos);
        const sortOrder = (maxOrder ?? 0) + 1;

        const [row] = await db.insert(plannerTodos).values({
            title: reqString(body.title, 'title', 300),
            description: optString(body.description, 'description', 5000) || null,
            isCompleted: false,
            sortOrder,
        }).returning();
        return NextResponse.json(row, { status: 201 });
    } catch (error) {
        if (isValidationError(error)) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
    }
}
