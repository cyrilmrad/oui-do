import { NextResponse } from 'next/server';
import { requireAdminOrAssistant } from '@/lib/entitlements/guard';
import { db } from '@/db';
import { plannerEvents } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { reqString, optString, optHexColor, isValidationError } from '@/lib/validation';

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
            title: reqString(body.title, 'title', 300),
            description: optString(body.description, 'description', 5000) || null,
            startAt: reqString(body.startAt, 'startAt', 40),
            endAt: body.endAt ? optString(body.endAt, 'endAt', 40) : null,
            allDay: body.allDay === true,
            color: optHexColor(body.color, 'color'),
        }).returning();
        return NextResponse.json(row, { status: 201 });
    } catch (error) {
        if (isValidationError(error)) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}
