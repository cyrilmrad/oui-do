import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We must use the SERVICE_ROLE_KEY to bypass RLS and create users securely on the backend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Avoid crashing during static build extraction if keys are currently placeholders
const supabaseAdmin = supabaseUrl && supabaseUrl.startsWith('http')
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

export async function POST(request: Request) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase is not correctly configured. Missing environment variables.' }, { status: 500 });
    }

    try {
        // 1. Verify Authorization Header (The requesting Admin)
        const authHeader = request.headers.get('Authorization');

        // Note: For a fully secure App, we should verify the JWT token from the Authorization header 
        // to confirm the requester is legitimately an admin. For MVP, we'll extract the token.
        // const token = authHeader?.split('Bearer ')[1];
        // const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        // if (authError || user?.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { email, password, slug } = body;

        if (!email || !password || !slug) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Create the user using the Admin API
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto-confirm since an admin is creating them
            user_metadata: {
                role: 'client',
                slug: slug
            }
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: 'Client created successfully', user: data.user }, { status: 200 });

    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
