import { NextResponse } from 'next/server';
import { supabaseAdmin, listAllAuthUsers } from '@/lib/auth/supabaseAdmin';
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
        const { slug, password } = await request.json();
        if (!slug?.trim()) {
            return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
        }
        if (!password || password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        const users = await listAllAuthUsers(supabaseAdmin);

        const user = users.find(u => u.app_metadata?.slug === slug && u.app_metadata?.role === 'client');
        if (!user) {
            return NextResponse.json({ error: 'No client found for this slug' }, { status: 404 });
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
        if (error) {
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Password updated successfully' });

    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
