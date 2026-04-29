import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function GET() {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase is not correctly configured.' }, { status: 500 });
    }

    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        const allInvitations = await db.select().from(invitations);
        const userList = users ?? [];

        // Filter for clients only and map to match mock structure
        const clients = userList
            .filter(user => user.app_metadata?.role === 'client')
            .map(user => {
                const slug = user.app_metadata?.slug || 'unknown-slug';
                const inv = allInvitations.find(i => i.slug === slug);
                return {
                    id: user.id,
                    slug: slug,
                    email: user.email,
                    bride: inv?.bride || 'Bride',
                    groom: inv?.groom || 'Groom',
                    heroImage: inv?.heroImage || null,
                    date: inv?.date || null
                };
            });

        return NextResponse.json(clients, { status: 200 });

    } catch (err: any) {
        console.error('GET /api/admin/clients failed', err);
        return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
    }
}
