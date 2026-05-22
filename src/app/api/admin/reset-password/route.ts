import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/supabaseAdmin';
import { requireAdmin } from '@/lib/entitlements/guard';

// Resolves the canonical site URL for the recovery link redirect.
// Set NEXT_PUBLIC_SITE_URL in Vercel env vars to your production domain.
function siteUrl(): string {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'http://localhost:3000';
}

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
            options: { redirectTo: siteUrl() },
        });

        if (error || !data?.properties?.action_link) {
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json({ link: data.properties.action_link, email: user.email });

    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
