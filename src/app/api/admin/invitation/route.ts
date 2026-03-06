import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseUrl && supabaseUrl.startsWith('http')
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
    : null;

export async function POST(request: Request) {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Database uninitialized' }, { status: 500 });

    try {
        const body = await request.json();

        // MVP: We assume the Admin is the one hitting this endpoint
        // A full implementation would inspect request headers to verify the JWT
        const { slug, id, createdAt, updatedAt, ...updateData } = body;

        if (!slug) {
            return NextResponse.json({ error: 'Missing client slug' }, { status: 400 });
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
