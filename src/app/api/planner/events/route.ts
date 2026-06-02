import { NextResponse } from 'next/server';
import { requireAdminOrAssistant } from '@/lib/entitlements/guard';
import { db } from '@/db';
import { plannerEvents } from '@/db/schema';
import { asc } from 'drizzle-orm';

export async function GET(request: Request) {
    const auth = await requireAdminOrAssistant(request);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const rows = await db.select().from(plannerEvents).orderBy(asc(plannerEvents.startAt));
    return NextResponse.json(rows);
}

export async function POST(request: Request) {
    const auth = await requireAdminOrAssistant(request);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    try {
        const body = await request.json();
        const [row] = await db.insert(plannerEvents).values({
            title: body.title,
            description: body.description ?? null,
            startAt: body.startAt,
            endAt: body.endAt ?? null,
            allDay: body.allDay ?? false,
            color: body.color ?? null,
        }).returning();
        return NextResponse.json(row, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}
