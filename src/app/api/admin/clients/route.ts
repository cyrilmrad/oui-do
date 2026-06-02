import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/entitlements/guard';

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

import { db } from '@/db';
import { invitations } from '@/db/schema';

export async function GET(request: Request) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase is not correctly configured.' }, { status: 500 });
    }

    const authGuard = await requireAdmin(request);
    if (!authGuard.ok) {
        return NextResponse.json({ error: authGuard.message }, { status: authGuard.status });
    }

    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        const allInvitations = await db.select().from(invitations);
        const userList = users ?? [];

        // Group client users by slug → one entry per wedding (multiple logins allowed).
        const bySlug = new Map<string, { id: string; email: string; createdAt: string }[]>();
        for (const user of userList) {
            if (user.app_metadata?.role !== 'client') continue;
            const slug = user.app_metadata?.slug || 'unknown-slug';
            if (!bySlug.has(slug)) bySlug.set(slug, []);
            bySlug.get(slug)!.push({
                id: user.id,
                email: user.email ?? '',
                createdAt: user.created_at ?? ''
            });
        }

        const clients = Array.from(bySlug.entries()).map(([slug, rawAccounts]) => {
            // Oldest account first → its email is the representative used by the entitlements panel.
            const accounts = [...rawAccounts].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
            const inv = allInvitations.find(i => i.slug === slug);
            return {
                id: slug,                       // stable card key (one card per wedding)
                slug: slug,
                email: accounts[0]?.email ?? null,
                bride: inv?.bride || 'Bride',
                groom: inv?.groom || 'Groom',
                heroImage: inv?.heroImage || null,
                date: inv?.date || null,
                clientLocked: inv?.clientLocked ?? false,
                clientLockedAt: inv?.clientLockedAt ? inv.clientLockedAt.toISOString() : null,
                isArchived: inv?.isArchived ?? false,
                archivedAt: inv?.archivedAt ? inv.archivedAt.toISOString() : null,
                archiveMessage: inv?.archiveMessage ?? null,
                accounts: accounts.map(a => ({ id: a.id, email: a.email }))
            };
        });

        return NextResponse.json(clients, { status: 200 });

    } catch (err: any) {
        console.error('GET /api/admin/clients failed', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
