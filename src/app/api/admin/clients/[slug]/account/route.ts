import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/entitlements/guard';
import { listAllAuthUsers } from '@/lib/auth/supabaseAdmin';

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

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase is not correctly configured.' }, { status: 500 });
    }

    const authGuard = await requireAdmin(request);
    if (!authGuard.ok) {
        return NextResponse.json({ error: authGuard.message }, { status: authGuard.status });
    }

    const { slug } = await params;
    const decoded = decodeURIComponent(slug);

    let userId: string | undefined;
    try {
        const body = await request.json();
        userId = body.userId;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    let allUsers;
    try {
        allUsers = await listAllAuthUsers(supabaseAdmin);
    } catch {
        return NextResponse.json({ error: 'Failed to list accounts' }, { status: 500 });
    }

    const slugAccounts = allUsers.filter(
        u => u.app_metadata?.role === 'client' && u.app_metadata?.slug === decoded
    );
    const target = slugAccounts.find(u => u.id === userId);
    if (!target) {
        return NextResponse.json({ error: 'Account not found for this wedding' }, { status: 404 });
    }
    if (slugAccounts.length <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last account for this wedding.' }, { status: 409 });
    }

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
