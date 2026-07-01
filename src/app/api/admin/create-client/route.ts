import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/entitlements/guard';
import { listAllAuthUsers } from '@/lib/auth/supabaseAdmin';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';

// We must use the SERVICE_ROLE_KEY to bypass RLS and create users securely on the backend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseUrl && supabaseUrl.startsWith('http')
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

/** A slug "exists" if an invitation row uses it OR any client user already has it. */
async function slugExists(slug: string): Promise<boolean> {
    const inv = await db
        .select({ slug: invitations.slug })
        .from(invitations)
        .where(eq(invitations.slug, slug))
        .limit(1);
    if (inv.length > 0) return true;

    const users = await listAllAuthUsers(supabaseAdmin!);
    return users.some(u => u.app_metadata?.role === 'client' && u.app_metadata?.slug === slug);
}

export async function POST(request: Request) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase is not correctly configured. Missing environment variables.' }, { status: 500 });
    }

    const authGuard = await requireAdmin(request);
    if (!authGuard.ok) {
        return NextResponse.json({ error: authGuard.message }, { status: authGuard.status });
    }

    try {
        const body = await request.json();
        const { email, password, slug, expectExisting } = body;
        const role: 'client' | 'assistant' = body.role === 'assistant' ? 'assistant' : 'client';

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const appMetadata: Record<string, unknown> = { role };

        if (role === 'client') {
            if (!slug) {
                return NextResponse.json({ error: 'A wedding slug is required for client accounts' }, { status: 400 });
            }
            const exists = await slugExists(slug);
            if (expectExisting && !exists) {
                return NextResponse.json({ error: `No wedding found for slug "${slug}". Pick an existing wedding or create a new one.` }, { status: 400 });
            }
            if (!expectExisting && exists) {
                return NextResponse.json({ error: `The slug "${slug}" is already in use. Add a login to the existing wedding instead, or choose a different slug.` }, { status: 409 });
            }
            appMetadata.slug = slug;
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm since an admin is creating them
            app_metadata: appMetadata
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: 'Account created successfully', user: data.user }, { status: 200 });

    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
