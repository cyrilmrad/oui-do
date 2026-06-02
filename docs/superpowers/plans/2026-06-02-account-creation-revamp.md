# Account Creation Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify admin account creation (new-wedding client / add-login to an existing wedding / global assistant) into one modal, and group the Clients list by wedding so multiple logins per wedding stop producing duplicate cards.

**Architecture:** No DB migration — accounts are Supabase auth users carrying `app_metadata.role` (+ `slug` for clients). `GET /api/admin/clients` groups client users by slug into one entry per wedding (with a representative `email` for backward-compat and an `accounts[]` array). The creation modal posts `role` + `expectExisting` so the backend enforces new-vs-existing slug rules. Account deletion lives in the wedding overview.

**Tech Stack:** Next.js 16 App Router (route handlers), Supabase Admin API (`@supabase/supabase-js`), Drizzle ORM, React 19, Tailwind v4, Sonner toasts, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-02-account-creation-revamp-design.md`

> **Testing note:** This repo has **no unit-test framework** (no jest/vitest; `package.json` has no `test` script). Per `CLAUDE.md`, verification is `node_modules/.bin/tsc --noEmit`, `npm run lint`, and manual runtime checks in the running app (`npm run dev`). Each task's verification reflects that — there are no fabricated unit tests. Run the app logged in as an admin for the manual checks.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/app/api/admin/create-client/route.ts` | Create a user for any account type; enforce slug rules |
| Modify | `src/app/api/admin/clients/route.ts` | Return one entry per wedding + `accounts[]` |
| Create | `src/app/api/admin/clients/[slug]/account/route.ts` | DELETE one account (last-account guard) |
| Modify | `src/components/admin/NewClientForm.tsx` | Account-type selector + conditional fields |
| Modify | `src/app/admin/page.tsx` | Form state/type, submit wiring, button label, pass accounts to overview |
| Modify | `src/components/admin/ClientList.tsx` | Render linked accounts inline (read-only) |
| Modify | `src/components/admin/ClientOverview.tsx` | Accounts management section (delete) |

Tasks are ordered backend → modal → admin wiring → list → overview, so each builds on the last and the app type-checks at every commit.

---

## Task 1: Extend `create-client` for roles + slug rules

**Files:**
- Modify: `src/app/api/admin/create-client/route.ts` (full rewrite)

- [ ] **Step 1: Rewrite the route**

Replace the entire contents of `src/app/api/admin/create-client/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/entitlements/guard';
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

    const { data } = await supabaseAdmin!.auth.admin.listUsers();
    const users = data?.users ?? [];
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
```

Key points: `role` defaults to `'client'` (backward-compat for any existing caller). Assistants get no slug. The `slugExists` rule is shared by both the new-wedding (409 if exists) and add-login (400 if missing) checks. The `catch {}` (no binding) avoids the `no-explicit-any` lint that an `err: any` binding would add.

- [ ] **Step 2: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no output (exit 0).

- [ ] **Step 3: Lint the file**

Run: `npx eslint src/app/api/admin/create-client/route.ts`
Expected: no output (no errors/warnings).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/create-client/route.ts
git commit -m "feat(admin): create-client handles role + new/existing slug rules"
```

---

## Task 2: Group Clients list by wedding

**Files:**
- Modify: `src/app/api/admin/clients/route.ts` (the `clients` mapping inside `GET`)

- [ ] **Step 1: Replace the client mapping block**

In `src/app/api/admin/clients/route.ts`, find this block inside the `try` of `GET`:

```ts
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
                    date: inv?.date || null,
                    clientLocked: inv?.clientLocked ?? false,
                    clientLockedAt: inv?.clientLockedAt ? inv.clientLockedAt.toISOString() : null,
                    isArchived: inv?.isArchived ?? false,
                    archivedAt: inv?.archivedAt ? inv.archivedAt.toISOString() : null,
                    archiveMessage: inv?.archiveMessage ?? null
                };
            });
```

Replace it entirely with:

```ts
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
```

Nothing else in the file changes (`allInvitations` and `userList` are already defined above this block).

- [ ] **Step 2: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Lint the file**

Run: `npx eslint src/app/api/admin/clients/route.ts`
Expected: no NEW errors versus baseline. (Baseline: run `git stash && npx eslint src/app/api/admin/clients/route.ts; git stash pop` if unsure — the count must not increase.)

- [ ] **Step 4: Manual runtime check**

Start `npm run dev`, log in as admin, open the **Active Clients** tab. Confirm each wedding shows once. If you have (or create, in Task 5) two logins on one slug, that wedding must still show as a single card.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/clients/route.ts
git commit -m "feat(admin): group clients list by wedding slug with accounts[]"
```

---

## Task 3: DELETE-account endpoint

**Files:**
- Create: `src/app/api/admin/clients/[slug]/account/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/admin/clients/[slug]/account/route.ts` with:

```ts
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

    const { data, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
        return NextResponse.json({ error: listErr.message }, { status: 400 });
    }

    const slugAccounts = (data?.users ?? []).filter(
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
```

- [ ] **Step 2: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Lint the file**

Run: `npx eslint "src/app/api/admin/clients/[slug]/account/route.ts"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/admin/clients/[slug]/account/route.ts"
git commit -m "feat(admin): DELETE endpoint to remove a wedding account (last-account guard)"
```

---

## Task 4: Revamp the creation modal

**Files:**
- Modify: `src/components/admin/NewClientForm.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/components/admin/NewClientForm.tsx` with:

```tsx
"use client";

import React from 'react';

export type AccountType = 'client-new' | 'client-existing' | 'assistant';

export interface NewClientFormState {
    email: string;
    password: string;
    slug: string;
    accountType: AccountType;
}

export type OnboardMessage = { type: 'success' | 'error'; text: string };

interface NewClientFormProps {
    form: NewClientFormState;
    setForm: (form: NewClientFormState) => void;
    loading: boolean;
    message: OnboardMessage | null;
    showSlugDropdown: boolean;
    setShowSlugDropdown: (open: boolean) => void;
    clients: any[];
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
}

const TYPE_OPTIONS: { value: AccountType; label: string; hint: string }[] = [
    { value: 'client-new', label: 'New Wedding', hint: 'Create a client account with a fresh URL slug and its own invitation.' },
    { value: 'client-existing', label: 'Add Login to Wedding', hint: 'Add another login to an existing wedding — shares its invitation, guests, and budget.' },
    { value: 'assistant', label: 'Assistant', hint: 'A workspace helper with Planner access only. Not tied to a wedding.' },
];

/**
 * Full-screen overlay shown when isCreatingClient is true. Lets an admin create one of three
 * account types: a brand-new wedding client, an additional login for an existing wedding, or a
 * global assistant. The selected type drives which fields show and how the parent validates the slug.
 */
export function NewClientForm({
    form,
    setForm,
    loading,
    message,
    showSlugDropdown,
    setShowSlugDropdown,
    clients,
    onSubmit,
    onCancel
}: NewClientFormProps) {
    const isClient = form.accountType !== 'assistant';
    const isExisting = form.accountType === 'client-existing';
    const activeHint = TYPE_OPTIONS.find(o => o.value === form.accountType)?.hint ?? '';
    const slugMatches = clients.filter(c => c.slug.includes(form.slug.toLowerCase()));

    return (
        <div className="absolute inset-0 z-50 flex flex-col overflow-y-auto bg-surface backdrop-blur-sm px-6 py-12 md:py-24 animate-in fade-in duration-300">
            <div className="max-w-4xl mx-auto w-full space-y-12">

                <div className="flex justify-between items-start">
                    <div className="space-y-4">
                        <h2 className="text-5xl font-headline text-primary tracking-tight">New Account</h2>
                        <p className="text-lg text-secondary max-w-xl leading-relaxed">{activeHint}</p>
                    </div>
                    <button onClick={onCancel} className="text-secondary hover:text-primary font-bold uppercase tracking-widest text-sm p-4">✕ Close</button>
                </div>

                {/* Account-type selector */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {TYPE_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm({ ...form, accountType: opt.value, slug: '' })}
                            className={`text-left p-5 rounded-xl border transition-all ${form.accountType === opt.value ? 'border-primary bg-primary-fixed/20 shadow-sm' : 'border-outline-variant/30 hover:border-outline-variant/60 bg-surface-container-lowest'}`}
                        >
                            <span className={`block text-sm font-label font-bold uppercase tracking-wider ${form.accountType === opt.value ? 'text-primary' : 'text-secondary'}`}>{opt.label}</span>
                            <span className="block text-xs text-secondary/80 mt-2 leading-snug">{opt.hint}</span>
                        </button>
                    ))}
                </div>

                {message && (
                    <div className={`p-4 text-sm rounded-xl border ${message.type === 'error' ? 'bg-error-container/20 text-error border-error/30' : 'bg-primary-fixed/30 text-primary border-primary/20'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-3">
                        <label className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary ml-1">{form.accountType === 'assistant' ? 'Assistant Email' : 'Client Email'}</label>
                        <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-6 py-5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-lg font-body" placeholder="name@example.com" />
                    </div>

                    {isClient && (
                        <div className="space-y-3 relative">
                            <label className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary ml-1">{isExisting ? 'Existing Wedding Slug' : 'New Wedding Slug'}</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-outline-variant text-lg font-body">oui-do.com/</span>
                                <input
                                    type="text"
                                    required
                                    value={form.slug}
                                    onChange={e => {
                                        setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
                                        if (isExisting) setShowSlugDropdown(true);
                                    }}
                                    onFocus={() => { if (isExisting) setShowSlugDropdown(true); }}
                                    onBlur={() => setTimeout(() => setShowSlugDropdown(false), 200)}
                                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-[8.5rem] pr-6 py-5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-lg font-body"
                                    placeholder="maya-and-john"
                                />
                            </div>

                            {isExisting && showSlugDropdown && (
                                <div className="absolute top-[100%] left-0 mt-2 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-[60] font-body">
                                    {slugMatches.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => { setForm({ ...form, slug: c.slug }); setShowSlugDropdown(false); }}
                                            className="w-full text-left px-6 py-3 text-sm hover:bg-surface-container-low flex justify-between items-center border-b border-surface-variant/50 last:border-0 transition-colors"
                                        >
                                            <span className="font-medium text-primary text-base">{c.slug}</span>
                                            <span className="text-secondary">{c.bride} &amp; {c.groom}</span>
                                        </button>
                                    ))}
                                    {slugMatches.length === 0 && (
                                        <div className="px-6 py-4 text-sm text-secondary italic">No matching weddings.</div>
                                    )}
                                </div>
                            )}
                            {!isExisting && (
                                <p className="text-xs text-secondary/70 mt-2 px-1">Must be unique — letters, numbers, and dashes only.</p>
                            )}
                        </div>
                    )}

                    <div className={`space-y-3 ${isClient ? 'md:col-span-2' : ''}`}>
                        <label className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary ml-1">Temporary Password</label>
                        <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-6 py-5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-lg font-body" placeholder="••••••••••••" minLength={6} />
                        <p className="text-xs text-secondary/70 mt-3 px-1">We recommend a secure, auto-generated string for the first login.</p>
                    </div>

                    <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-8 pt-10 border-t border-surface-container-high">
                        <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #00150F 0%, #062C22 100%)' }} className="w-full md:w-auto px-12 py-5 text-on-primary rounded-full text-sm font-label font-bold uppercase tracking-widest shadow-xl shadow-primary/10 hover:opacity-90 transition-opacity disabled:opacity-50">
                            {loading ? 'Provisioning...' : 'Create Account'}
                        </button>
                        <button type="button" onClick={onCancel} className="text-sm font-label font-bold uppercase tracking-widest text-secondary hover:text-primary transition-colors">
                            Cancel &amp; Return
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
```

The `clients: any[]` prop type is intentionally kept — it mirrors `realClients: any[]` in `admin/page.tsx` (per the existing convention noted in `CLAUDE.md` and the original file).

- [ ] **Step 2: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: This MAY report errors in `src/app/admin/page.tsx` because the form state there doesn't yet have `accountType`. That's expected — Task 5 fixes it. There must be **no** errors originating in `NewClientForm.tsx` itself.

- [ ] **Step 3: Lint the file**

Run: `npx eslint src/components/admin/NewClientForm.tsx`
Expected: no NEW errors versus baseline (the `clients: any[]` warning matches the original file).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/NewClientForm.tsx
git commit -m "feat(admin): account-type selector in creation modal"
```

---

## Task 5: Wire the admin page

**Files:**
- Modify: `src/app/admin/page.tsx` (import, form state, "New" button reset, `handleCreateClient`, `ClientOverview` props)

- [ ] **Step 1: Update the import**

Change line 28 from:

```ts
import { NewClientForm } from '@/components/admin/NewClientForm';
```

to:

```ts
import { NewClientForm, NewClientFormState } from '@/components/admin/NewClientForm';
```

- [ ] **Step 2: Type the form state with a default account type**

Change line 111 from:

```ts
    const [newClientForm, setNewClientForm] = useState({ email: '', password: '', slug: '' });
```

to:

```ts
    const [newClientForm, setNewClientForm] = useState<NewClientFormState>({ email: '', password: '', slug: '', accountType: 'client-new' });
```

- [ ] **Step 3: Reset account type when opening the modal**

In the sidebar "New Client Instance" button's `onClick` (around line 800), it currently calls `setIsCreatingClient(true);`. Immediately after that line, add:

```ts
                            setNewClientForm({ email: '', password: '', slug: '', accountType: 'client-new' });
```

So the block reads:

```ts
                            setLiveData(defaultData);
                            setIsCreatingClient(true);
                            setNewClientForm({ email: '', password: '', slug: '', accountType: 'client-new' });
                            setHeroImageFile(null); setHeroImagePreview(null);
```

- [ ] **Step 4: Build the typed payload in `handleCreateClient`**

In `handleCreateClient` (around line 447), replace this:

```ts
        try {
            const response = await fetchWithAuth('/api/admin/create-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newClientForm)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create client');
            }

            setOnboardMessage({ type: 'success', text: `Successfully created client ${newClientForm.slug}` });
            setNewClientForm({ email: '', password: '', slug: '' });
            fetchClients(); // Refresh client list
```

with:

```ts
        try {
            const { accountType, email, password, slug } = newClientForm;
            const payload = accountType === 'assistant'
                ? { email, password, role: 'assistant' as const }
                : { email, password, role: 'client' as const, slug, expectExisting: accountType === 'client-existing' };

            const response = await fetchWithAuth('/api/admin/create-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create account');
            }

            const successText = accountType === 'assistant'
                ? `Assistant ${email} created`
                : accountType === 'client-existing'
                    ? `Added ${email} to ${slug}`
                    : `Created wedding ${slug}`;
            setOnboardMessage({ type: 'success', text: successText });
            setNewClientForm({ email: '', password: '', slug: '', accountType: 'client-new' });
            fetchClients(); // Refresh client list
```

(The rest of `handleCreateClient` — the `setTimeout`, the `catch`, the `finally` — is unchanged.)

- [ ] **Step 5: Pass accounts + refresh callback to `ClientOverview`**

In the `ClientOverview` usage (around line 1539), add two props. Change:

```tsx
                            slug={liveData.slug}
                            lifecycle={selectedLifecycle}
                            onLifecycleChange={(patch) => setSelectedLifecycle(prev => prev ? { ...prev, ...patch } : patch)}
                        />
```

to:

```tsx
                            slug={liveData.slug}
                            lifecycle={selectedLifecycle}
                            onLifecycleChange={(patch) => setSelectedLifecycle(prev => prev ? { ...prev, ...patch } : patch)}
                            accounts={realClients.find(c => c.slug === liveData.slug)?.accounts ?? []}
                            onAccountsChanged={() => fetchClients()}
                        />
```

- [ ] **Step 6: Update the sidebar button label**

The sidebar "New Client Instance" button label (around line 816) — change the visible text from `New Client Instance` to `New Account`:

```tsx
                        New Account
```

- [ ] **Step 7: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: This MAY still report errors in `src/components/admin/ClientOverview.tsx` (the `accounts` / `onAccountsChanged` props don't exist there yet). That's expected — Task 7 adds them. There must be **no** errors in `admin/page.tsx` or `NewClientForm.tsx`.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): wire account-type creation + pass accounts to overview"
```

---

## Task 6: Show linked accounts inline on the card

**Files:**
- Modify: `src/components/admin/ClientList.tsx` (the name block inside the card)

- [ ] **Step 1: Add the inline accounts block**

In `src/components/admin/ClientList.tsx`, find:

```tsx
                                <div>
                                    <h4 className="font-headline text-xl text-primary">{client.bride} & {client.groom}</h4>
                                    <p className="font-body text-xs text-secondary mt-1 tracking-widest lowercase">slug: /{client.slug}</p>
                                </div>
```

Replace with:

```tsx
                                <div className="min-w-0">
                                    <h4 className="font-headline text-xl text-primary">{client.bride} & {client.groom}</h4>
                                    <p className="font-body text-xs text-secondary mt-1 tracking-widest lowercase">slug: /{client.slug}</p>
                                    {Array.isArray(client.accounts) && client.accounts.length > 0 && (
                                        <div className="mt-2 flex items-center gap-2 min-w-0">
                                            <span className="font-label text-[0.6rem] font-bold uppercase tracking-wider text-secondary bg-surface-container-high px-2 py-0.5 rounded-full shrink-0">
                                                {client.accounts.length} {client.accounts.length === 1 ? 'login' : 'logins'}
                                            </span>
                                            <span className="text-[0.7rem] text-secondary/80 font-body truncate">
                                                {client.accounts.map((a: { id: string; email: string }) => a.email).join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </div>
```

This is read-only — no actions on the card (deletion lives in the overview, Task 7).

- [ ] **Step 2: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: same expected state as Task 5 Step 7 (only `ClientOverview` errors remain until Task 7). No errors in `ClientList.tsx`.

- [ ] **Step 3: Lint the file**

Run: `npx eslint src/components/admin/ClientList.tsx`
Expected: no NEW errors versus baseline.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ClientList.tsx
git commit -m "feat(admin): show linked wedding accounts inline on client cards"
```

---

## Task 7: Accounts management in the wedding overview

**Files:**
- Modify: `src/components/admin/ClientOverview.tsx` (props interface, new `AccountsSection` component, render it)

- [ ] **Step 1: Extend the props interface**

In `src/components/admin/ClientOverview.tsx`, find the `ClientOverviewProps` interface (around line 25) and add two fields after `onLifecycleChange?`:

```ts
    onLifecycleChange?: (patch: LifecycleState) => void;
    accounts?: { id: string; email: string }[];
    onAccountsChanged?: () => void;
}
```

- [ ] **Step 2: Add the `AccountsSection` sub-component**

Immediately before the line `// ─── Lifecycle section ────` (around line 112), insert this new component:

```tsx
// ─── Accounts section ─────────────────────────────────────────────────────────

interface AccountsSectionProps {
    slug: string;
    accounts: { id: string; email: string }[];
    onAccountsChanged: () => void;
}

function AccountsSection({ slug, accounts, onAccountsChanged }: AccountsSectionProps) {
    const [pendingDelete, setPendingDelete] = useState<{ id: string; email: string } | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleDelete(userId: string) {
        setBusy(true);
        try {
            const res = await fetchWithAuth(`/api/admin/clients/${encodeURIComponent(slug)}/account`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) {
                const { error } = await res.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(typeof error === 'string' ? error : 'Request failed');
            }
            toast.success('Account removed');
            onAccountsChanged();
        } catch (err: unknown) {
            toast.error('Could not remove account', {
                description: err instanceof Error ? err.message : 'Unknown error',
            });
        } finally {
            setBusy(false);
            setPendingDelete(null);
        }
    }

    return (
        <div className="bg-white border border-stone-200/70 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-stone-500" />
                    </div>
                    <span className="text-sm font-semibold text-stone-700">Accounts</span>
                </div>
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full bg-stone-100 text-stone-500">
                    {accounts.length} {accounts.length === 1 ? 'login' : 'logins'}
                </span>
            </div>
            <div className="divide-y divide-stone-100">
                {accounts.length === 0 && (
                    <p className="px-5 py-4 text-sm text-stone-400">No linked accounts.</p>
                )}
                {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                        <span className="text-sm text-stone-700 truncate">{acc.email}</span>
                        <button
                            type="button"
                            disabled={busy || accounts.length <= 1}
                            onClick={() => setPendingDelete(acc)}
                            title={accounts.length <= 1 ? 'Cannot remove the only account' : 'Remove account'}
                            className="text-[0.7rem] font-label font-bold uppercase tracking-widest px-3 py-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>

            <ConfirmDialog
                isOpen={pendingDelete !== null}
                tone="danger"
                title="Remove account"
                body={`Remove ${pendingDelete?.email ?? ''} from this wedding? They will lose access to this dashboard. This cannot be undone.`}
                confirmLabel="Remove"
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => { if (pendingDelete) handleDelete(pendingDelete.id); }}
            />
        </div>
    );
}
```

(`useState`, `Users`, `fetchWithAuth`, `toast`, and `ConfirmDialog` are already imported at the top of this file.)

- [ ] **Step 3: Destructure the new props**

Find the `ClientOverview` function signature / where props are destructured. The component is declared as `export default function ClientOverview({ ... }: ClientOverviewProps)`. Add `accounts` and `onAccountsChanged` to the destructured list, e.g.:

```tsx
export default function ClientOverview({
    liveData,
    guests,
    expenses,
    accessToken,
    hasInvitation,
    onNavigate,
    onInvitationSaved,
    slug,
    lifecycle,
    onLifecycleChange,
    accounts,
    onAccountsChanged,
}: ClientOverviewProps) {
```

(If the existing signature destructures inline in a different order, just add `accounts` and `onAccountsChanged` to it — order doesn't matter.)

- [ ] **Step 4: Render the section after Client Status**

Find the Client Status block (around line 522):

```tsx
                {/* ── Client Status (lifecycle) ─────────────────────────────── */}
                {slug && lifecycle && onLifecycleChange && (
                    <div>
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
                            Client Status
                        </p>
                        <LifecycleSection
                            slug={slug}
                            lifecycle={lifecycle}
                            onLifecycleChange={onLifecycleChange}
                        />
                    </div>
                )}
```

Immediately after that closing `)}`, insert:

```tsx
                {/* ── Accounts ──────────────────────────────────────────────── */}
                {slug && accounts && onAccountsChanged && (
                    <div>
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
                            Accounts
                        </p>
                        <AccountsSection
                            slug={slug}
                            accounts={accounts}
                            onAccountsChanged={onAccountsChanged}
                        />
                    </div>
                )}
```

- [ ] **Step 5: Type-check (now the whole graph must be clean)**

Run: `node_modules/.bin/tsc --noEmit`
Expected: **no output** (exit 0). All cross-file types now line up.

- [ ] **Step 6: Lint the file**

Run: `npx eslint src/components/admin/ClientOverview.tsx`
Expected: no NEW errors versus baseline.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/ClientOverview.tsx
git commit -m "feat(admin): account management section in wedding overview"
```

---

## Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Type-check + lint the whole touched set**

Run:
```bash
node_modules/.bin/tsc --noEmit
npx eslint src/app/api/admin/create-client/route.ts src/app/api/admin/clients/route.ts "src/app/api/admin/clients/[slug]/account/route.ts" src/components/admin/NewClientForm.tsx src/components/admin/ClientList.tsx src/components/admin/ClientOverview.tsx src/app/admin/page.tsx
```
Expected: `tsc` prints nothing. `eslint` shows no NEW errors versus the pre-change baseline for each file (admin/page.tsx retains its known pre-existing `any` errors; nothing new).

- [ ] **Step 2: Manual scenarios** (run `npm run dev`, log in as admin)

Walk the spec's verification list:
1. **New** → "New Account" → **New Wedding** → unique slug + email + password → Create. One new card appears for that slug.
2. **New** → **Add Login to Wedding** → pick the same slug from the dropdown → different email → Create. The same card now shows a "2 logins" badge and both emails; **no** second card.
3. **New** → **Assistant** → email + password (no slug field shown) → Create. Log in as that user in a separate session → routed to `/admin` showing only the Planner.
4. **New** → **New Wedding** with an already-used slug → inline error ("slug is already in use"), nothing created.
5. **New** → **Add Login to Wedding** with a slug typed that doesn't exist → inline error ("No wedding found"), nothing created.
6. Open the wedding from step 2 → **Overview** → **Accounts** section lists both emails. Click **Remove** on one → confirm → it disappears and the card's badge drops to "1 login". The remaining account's **Remove** button is disabled.
7. **Regression:** open **Entitlements**, pick a client, open its password modal — the email still shows and reset still works (representative email present).

- [ ] **Step 3: Final commit (if any verification fixes were needed)**

If steps 1-2 surfaced no issues, there's nothing to commit. Otherwise commit fixes with a clear message.

---

## Self-Review (completed by plan author)

- **Spec coverage:** create-client roles/modes → Task 1; clients grouping + representative email → Task 2; DELETE + last-account guard → Task 3; account-type modal → Task 4; admin wiring + button label + overview props → Task 5; inline read-only accounts → Task 6; overview Accounts management → Task 7; verification incl. entitlements regression → Task 8. All spec sections covered.
- **Type consistency:** `accounts: { id: string; email: string }[]` is used identically in the clients route output, `ClientOverview` props, `AccountsSection`, and `ClientList`. `AccountType` and `NewClientFormState` are defined in `NewClientForm.tsx` and imported into `admin/page.tsx`. Payload `role`/`expectExisting` field names match the route's `body` reads.
- **Placeholder scan:** no TBD/TODO; every code step shows full code; the only intentional `any` is the pre-existing `clients: any[]` convention.
