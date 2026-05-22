import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/supabaseAdmin';
import { requireAdmin } from '@/lib/entitlements/guard';

export async function POST(request: Request) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase is not correctly configured.' }, { status: 500 });
    }

    const authGuard = await requireAdmin(request);
    if (!authGuard.ok) {
        return NextResponse.json({ error: authGuard.message }, { status: authGuard.status });
    }

    try {
        const { slug } = await request.json();
        if (!slug?.trim()) {
            return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
        }

        // Find the user whose app_metadata.slug matches
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (listError) {
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        const user = users.find(u => u.app_metadata?.slug === slug && u.app_metadata?.role === 'client');
        if (!user?.email) {
            return NextResponse.json({ error: 'No client found for this slug' }, { status: 404 });
        }

        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: user.email,
        });

        if (error || !data?.properties?.action_link) {
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json({ link: data.properties.action_link, email: user.email });

    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
