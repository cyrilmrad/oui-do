# Invitation Lifecycle — Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin two independent toggles — lock a client's dashboard access, and archive a public invitation into a memorial "thank you" view — with a derived status pill on the admin client list.

**Architecture:** Two additive boolean columns + audit timestamps on `invitations` (`client_locked`, `is_archived`). One new admin PATCH endpoint. One new public component (`<ArchivedInvitationView>`) that the public route branches to. One new dashboard screen for paused clients. One new admin LifecyclePanel inside the per-client builder, paired with a small `<ConfirmDialog>` primitive.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM on Postgres, Supabase Auth, Tailwind v4 with the project's design tokens (`text-primary`, `bg-surface-container-*` for admin; stones/emerald for dashboard).

**Verification model:** This project has no test framework. Each task verifies with `node_modules/.bin/tsc --noEmit` + `npm run lint` and a manual smoke check where behavior changes. Don't add a test runner.

**Spec:** `docs/superpowers/specs/2026-05-27-invitation-lifecycle-stage-1-design.md`

**Branch:** `feat/invitation-lifecycle-stage-1` (already created and contains the spec commits).

---

## File map

```
src/db/schema.ts                                    [MODIFY — 4 new cols]
src/app/api/admin/clients/[slug]/lifecycle/route.ts [CREATE]
src/app/api/admin/clients/route.ts                  [MODIFY — return flags]
src/app/api/rsvp/route.ts                           [MODIFY — 403 if archived]
src/components/ConfirmDialog.tsx                    [CREATE]
src/components/admin/LifecyclePanel.tsx             [CREATE]
src/app/admin/page.tsx                              [MODIFY — mount panel]
src/components/admin/ClientList.tsx                 [MODIFY — status pill]
src/components/InvitationGifts.tsx                  [CREATE — extracted]
src/components/InvitationPreview.tsx                [MODIFY — use extracted]
src/components/ArchivedInvitationView.tsx           [CREATE]
src/app/invite/[slug]/page.tsx                      [MODIFY — branch + metadata]
src/components/dashboard/DashboardLockedScreen.tsx  [CREATE]
src/app/dashboard/page.tsx                          [MODIFY — lock check]
```

---

## Task 1: Add lifecycle columns to the `invitations` schema

**Files:**
- Modify: `src/db/schema.ts` (the `invitations` table definition near lines 4–47)

- [ ] **Step 1: Add four columns to the Drizzle `invitations` table**

In `src/db/schema.ts`, inside the `invitations = pgTable('invitations', { ... })` definition, after the existing `rsvpClosedMessage` line and before `createdAt`, add:

```ts
    clientLocked: boolean('client_locked').notNull().default(false),
    clientLockedAt: timestamp('client_locked_at'),
    isArchived: boolean('is_archived').notNull().default(false),
    archivedAt: timestamp('archived_at'),
```

The existing imports already include `boolean` and `timestamp` — no import changes needed.

- [ ] **Step 2: Push the schema change to the dev database**

Run: `npm run db:push`
Expected: drizzle-kit prompts to confirm the four `ALTER TABLE` statements. Confirm them. No data loss (all four are additive with safe defaults).

- [ ] **Step 3: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: no new errors. `InvitationSelect` (inferred from `invitations`) will now include the four new properties — referenced in later tasks.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "@ feat(lifecycle): add client_locked + is_archived columns to invitations"
```

---

## Task 2: New PATCH endpoint for lifecycle flags

**Files:**
- Create: `src/app/api/admin/clients/[slug]/lifecycle/route.ts`

- [ ] **Step 1: Create the route file with the PATCH handler**

```ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/entitlements/guard';

interface LifecyclePatchBody {
    clientLocked?: boolean;
    isArchived?: boolean;
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const authGuard = await requireAdmin(request);
    if (!authGuard.ok) {
        return NextResponse.json({ error: authGuard.message }, { status: authGuard.status });
    }

    const { slug } = await params;
    let body: LifecyclePatchBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body.clientLocked !== 'boolean' && typeof body.isArchived !== 'boolean') {
        return NextResponse.json(
            { error: 'Provide at least one of clientLocked or isArchived (boolean).' },
            { status: 400 }
        );
    }

    const now = new Date();
    const updates: Partial<typeof invitations.$inferInsert> = { updatedAt: now };

    if (typeof body.clientLocked === 'boolean') {
        updates.clientLocked = body.clientLocked;
        updates.clientLockedAt = body.clientLocked ? now : null;
    }
    if (typeof body.isArchived === 'boolean') {
        updates.isArchived = body.isArchived;
        updates.archivedAt = body.isArchived ? now : null;
    }

    const updated = await db
        .update(invitations)
        .set(updates)
        .where(eq(invitations.slug, slug))
        .returning({
            slug: invitations.slug,
            clientLocked: invitations.clientLocked,
            clientLockedAt: invitations.clientLockedAt,
            isArchived: invitations.isArchived,
            archivedAt: invitations.archivedAt
        });

    if (updated.length === 0) {
        return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0], { status: 200 });
}
```

- [ ] **Step 2: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Manual smoke (optional but recommended)**

Start dev server (`npm run dev`), log in as admin, then in the browser console:
```js
const t = (await (await fetch('/api/me')).json()).accessToken;
// or use supabase.auth.getSession() to get the token
await fetch('/api/admin/clients/<some-real-slug>/lifecycle', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify({ isArchived: true })
}).then(r => r.json());
```
Expected: returns the updated row. Re-run with `{ isArchived: false }` to revert.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/clients/[slug]/lifecycle/route.ts
git commit -m "@ feat(lifecycle): admin PATCH endpoint for client_locked + is_archived"
```

---

## Task 3: Extend `/api/admin/clients` to return lifecycle flags

**Files:**
- Modify: `src/app/api/admin/clients/route.ts` (lines 35–53)

- [ ] **Step 1: Add `clientLocked` and `isArchived` to the response mapping**

In `route.ts` around line 44, change:

```ts
                return {
                    id: user.id,
                    slug: slug,
                    email: user.email,
                    bride: inv?.bride || 'Bride',
                    groom: inv?.groom || 'Groom',
                    heroImage: inv?.heroImage || null,
                    date: inv?.date || null
                };
```

to:

```ts
                return {
                    id: user.id,
                    slug: slug,
                    email: user.email,
                    bride: inv?.bride || 'Bride',
                    groom: inv?.groom || 'Groom',
                    heroImage: inv?.heroImage || null,
                    date: inv?.date || null,
                    clientLocked: inv?.clientLocked ?? false,
                    isArchived: inv?.isArchived ?? false
                };
```

- [ ] **Step 2: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean (the new fields are inferred from `InvitationSelect`).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/clients/route.ts
git commit -m "@ feat(lifecycle): admin clients listing returns clientLocked + isArchived"
```

---

## Task 4: Reject RSVP submissions on archived invitations

**Files:**
- Modify: `src/app/api/rsvp/route.ts` (around lines 16–27)

- [ ] **Step 1: Add `isArchived` to the select and an early-return**

In `route.ts`, change the select around line 16:

```ts
        const invitationResult = await db
            .select({ id: invitations.id, showRsvp: invitations.showRsvp })
            .from(invitations)
            .where(eq(invitations.slug, slug));
```

to:

```ts
        const invitationResult = await db
            .select({
                id: invitations.id,
                showRsvp: invitations.showRsvp,
                isArchived: invitations.isArchived
            })
            .from(invitations)
            .where(eq(invitations.slug, slug));
```

Then, immediately after the existing `if (invitationResult[0].showRsvp === false)` block (around line 27), add:

```ts
        if (invitationResult[0].isArchived === true) {
            return NextResponse.json({ error: 'This event has concluded.' }, { status: 403 });
        }
```

- [ ] **Step 2: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/rsvp/route.ts
git commit -m "@ feat(lifecycle): reject RSVP submissions on archived invitations"
```

---

## Task 5: Generic `<ConfirmDialog>` primitive

**Files:**
- Create: `src/components/ConfirmDialog.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    body: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'neutral' | 'danger';
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * In-app confirmation modal — matches the PaymentModal / CsvImportModal scaffold
 * used elsewhere in this codebase. Use this instead of the browser's confirm()
 * for any admin action that should pause the user with a clear question.
 */
export default function ConfirmDialog({
    isOpen,
    title,
    body,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'neutral',
    onCancel,
    onConfirm
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const confirmClass =
        tone === 'danger'
            ? 'bg-rose-600 hover:bg-rose-700 text-white'
            : 'bg-primary hover:bg-primary/90 text-on-primary';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
        >
            <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden">
                <div className="flex items-start gap-4 p-6">
                    {tone === 'danger' && (
                        <div className="shrink-0 w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-rose-600" />
                        </div>
                    )}
                    <div className="flex-1">
                        <h3 id="confirm-dialog-title" className="text-lg font-headline text-primary mb-2">
                            {title}
                        </h3>
                        <p className="text-sm font-body text-on-surface leading-relaxed">{body}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 bg-surface-container-low border-t border-outline-variant/10">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-[0.75rem] font-label uppercase tracking-widest px-4 py-2 rounded text-secondary hover:bg-surface-container-high transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`text-[0.75rem] font-label uppercase tracking-widest px-4 py-2 rounded transition-colors ${confirmClass}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmDialog.tsx
git commit -m "@ feat: generic ConfirmDialog primitive (admin-tokens palette)"
```

---

## Task 6: `<LifecyclePanel>` admin component

**Files:**
- Create: `src/components/admin/LifecyclePanel.tsx`

- [ ] **Step 1: Write the panel**

```tsx
"use client";

import React, { useState } from 'react';
import { Lock, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import ConfirmDialog from '@/components/ConfirmDialog';

interface LifecyclePanelProps {
    slug: string;
    clientLocked: boolean;
    isArchived: boolean;
    clientLockedAt: string | null;
    archivedAt: string | null;
    onChange: (patch: {
        clientLocked: boolean;
        clientLockedAt: string | null;
        isArchived: boolean;
        archivedAt: string | null;
    }) => void;
}

type PendingConfirm = null | 'lock' | 'archive';

function formatTimestamp(value: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

/**
 * Lifecycle controls for a single client, mounted inside the admin builder.
 * Two independent toggles: dashboard access lock + public invitation archive.
 * Each ON-flip goes through a ConfirmDialog; OFF-flip is one click.
 */
export default function LifecyclePanel({
    slug,
    clientLocked,
    isArchived,
    clientLockedAt,
    archivedAt,
    onChange
}: LifecyclePanelProps) {
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState<PendingConfirm>(null);

    async function patchLifecycle(patch: { clientLocked?: boolean; isArchived?: boolean }) {
        setBusy(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                (headers as Record<string, string>)['Authorization'] = `Bearer ${session.access_token}`;
            }
            const res = await fetch(`/api/admin/clients/${encodeURIComponent(slug)}/lifecycle`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(patch)
            });
            if (!res.ok) {
                const { error } = await res.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(error || 'Request failed');
            }
            const updated = await res.json();
            onChange({
                clientLocked: updated.clientLocked,
                clientLockedAt: updated.clientLockedAt,
                isArchived: updated.isArchived,
                archivedAt: updated.archivedAt
            });
            toast.success('Lifecycle updated');
        } catch (err: any) {
            toast.error('Could not update lifecycle', { description: err?.message || 'Unknown error' });
        } finally {
            setBusy(false);
            setPending(null);
        }
    }

    function handleLockToggle() {
        if (!clientLocked) {
            setPending('lock');
        } else {
            patchLifecycle({ clientLocked: false });
        }
    }

    function handleArchiveToggle() {
        if (!isArchived) {
            setPending('archive');
        } else {
            patchLifecycle({ isArchived: false });
        }
    }

    return (
        <section>
            <h2 className="text-2xl font-headline text-primary mb-8">Lifecycle</h2>
            <div className="bg-surface-container-latest p-8 space-y-6">
                <ToggleRow
                    icon={<Lock className="w-4 h-4" />}
                    title="Client dashboard access"
                    state={clientLocked ? 'Locked' : 'Active'}
                    descriptionOn="Client cannot edit their dashboard. They see a paused-account screen on login."
                    descriptionOff="Client can log in and edit their dashboard."
                    isOn={clientLocked}
                    onToggle={handleLockToggle}
                    busy={busy}
                />
                <ToggleRow
                    icon={<Archive className="w-4 h-4" />}
                    title="Public invitation"
                    state={isArchived ? 'Archived' : 'Live'}
                    descriptionOn="Public /invite/<slug> shows the thank-you memorial view. Gifts/registry preserved."
                    descriptionOff="Public /invite/<slug> shows the full live invitation."
                    isOn={isArchived}
                    onToggle={handleArchiveToggle}
                    busy={busy}
                />
                <div className="pt-4 border-t border-outline-variant/15 text-[0.75rem] font-label uppercase tracking-[0.1em] text-secondary space-y-1">
                    <div>Last locked: <span className="font-body normal-case tracking-normal text-on-surface">{formatTimestamp(clientLockedAt)}</span></div>
                    <div>Last archived: <span className="font-body normal-case tracking-normal text-on-surface">{formatTimestamp(archivedAt)}</span></div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={pending === 'lock'}
                title="Lock dashboard access?"
                body="The client will see a paused-account screen the next time they open the dashboard. You can reverse this at any time."
                confirmLabel="Lock account"
                tone="danger"
                onCancel={() => setPending(null)}
                onConfirm={() => patchLifecycle({ clientLocked: true })}
            />
            <ConfirmDialog
                isOpen={pending === 'archive'}
                title="Archive the public invitation?"
                body="The public invitation will be replaced with the memorial 'thank you' view. The registry/gift block stays visible. You can reverse this at any time."
                confirmLabel="Archive invitation"
                tone="danger"
                onCancel={() => setPending(null)}
                onConfirm={() => patchLifecycle({ isArchived: true })}
            />
        </section>
    );
}

interface ToggleRowProps {
    icon: React.ReactNode;
    title: string;
    state: string;
    descriptionOn: string;
    descriptionOff: string;
    isOn: boolean;
    onToggle: () => void;
    busy: boolean;
}

function ToggleRow({ icon, title, state, descriptionOn, descriptionOff, isOn, onToggle, busy }: ToggleRowProps) {
    return (
        <div className="rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-secondary">{icon}</div>
                    <div>
                        <p className="text-[0.85rem] font-body font-medium text-on-surface">{title}</p>
                        <p className="text-xs text-secondary mt-1">{isOn ? descriptionOn : descriptionOff}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    disabled={busy}
                    aria-pressed={isOn}
                    className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded text-[0.7rem] font-label uppercase tracking-widest transition-colors ${isOn
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : 'bg-surface-container text-primary hover:bg-surface-container-high border border-outline-variant/30'
                        } disabled:opacity-50`}
                >
                    <span className={`w-2 h-2 rounded-full ${isOn ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    {state}
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean. (Don't wire it into the admin page yet — that's Task 7.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/LifecyclePanel.tsx
git commit -m "@ feat(lifecycle): admin LifecyclePanel with confirm-dialog toggles"
```

---

## Task 7: Mount `<LifecyclePanel>` inside the admin builder

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Import the panel**

Add this import alongside the existing builder section imports near the top of the file (the same block that imports `GiftOptionsSection`, `FootnoteSection`, etc., around line 36):

```ts
import LifecyclePanel from '@/components/admin/LifecyclePanel';
```

- [ ] **Step 2: Locate the builder column and mount the panel**

Find the `<FootnoteSection footnote={liveData.footnote || ''} onChange={handleInputChange} />` line (around line 1276 — this is the last builder section in the left column). Immediately after `<FootnoteSection ... />` and before the closing `</div>` of the builder column, add:

```tsx
                                        <LifecyclePanel
                                            slug={liveData.slug || ''}
                                            clientLocked={Boolean((liveData as any).clientLocked)}
                                            isArchived={Boolean((liveData as any).isArchived)}
                                            clientLockedAt={((liveData as any).clientLockedAt as string | null) ?? null}
                                            archivedAt={((liveData as any).archivedAt as string | null) ?? null}
                                            onChange={(patch) => setLiveData(prev => ({ ...prev, ...patch }) as typeof prev)}
                                        />
```

The `as any` is intentional and matches the existing typing relaxation in `InvitationData` for fields not yet in the public `InvitationData` interface. (We can tighten this later if `InvitationData` gets extended.)

- [ ] **Step 3: Ensure the loaded invitation row includes the new fields**

Find where `liveData` is populated from the API response on client selection. Search the file for `setLiveData(` and look for the spot that maps the fetched invitation into `liveData`. The fetched row already contains `clientLocked` / `isArchived` / `clientLockedAt` / `archivedAt` after Task 3, so the existing `setLiveData(fetchedInvitation)` already carries them through. Verify by inspecting the relevant `setLiveData` call — if it spreads selectively, add the four new fields explicitly. (Most likely you'll find a `setLiveData({ ...dbData, ... })` style call that already covers it.)

- [ ] **Step 4: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 5: Manual smoke**

Run `npm run dev`. Log in as admin. Select an existing client. Scroll the builder column to the bottom — the Lifecycle section should appear after Footnote. Toggle "Public invitation" ON — confirm dialog appears. Confirm — toast says "Lifecycle updated", the pill flips to red/Archived. Toggle OFF (one click) — pill flips back. Repeat for "Client dashboard access".

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "@ feat(lifecycle): mount LifecyclePanel in admin builder column"
```

---

## Task 8: Derived status pill on `ClientList`

**Files:**
- Modify: `src/components/admin/ClientList.tsx` (lines 132–136 area)

- [ ] **Step 1: Add a helper for derived status**

Above the `ClientList` function declaration (around line 30, after the `daysUntil` helper), add:

```ts
interface PillState {
    dotClass: string;
    label: string;
}

function deriveStatus(client: any): PillState {
    if (client.isArchived && client.clientLocked) return { dotClass: 'bg-stone-400', label: 'Closed' };
    if (client.isArchived) return { dotClass: 'bg-stone-400', label: 'Archived' };
    if (client.clientLocked) return { dotClass: 'bg-amber-400', label: 'Client locked' };
    if (client.date) return { dotClass: 'bg-emerald-500', label: 'Live' };
    return { dotClass: 'bg-blue-400', label: 'In Progress' };
}
```

- [ ] **Step 2: Replace the hardcoded pill**

In the client row JSX (around line 131–137), replace:

```tsx
                            <div className="hidden md:block w-1/6">
                                <span className="font-label uppercase tracking-widest text-[0.65rem] font-bold text-secondary block mb-1">Status</span>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                    <span className="font-body text-xs font-bold text-primary">In Progress</span>
                                </div>
                            </div>
```

with:

```tsx
                            {(() => {
                                const pill = deriveStatus(client);
                                return (
                                    <div className="hidden md:block w-1/6">
                                        <span className="font-label uppercase tracking-widest text-[0.65rem] font-bold text-secondary block mb-1">Status</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${pill.dotClass}`}></span>
                                            <span className="font-body text-xs font-bold text-primary">{pill.label}</span>
                                        </div>
                                    </div>
                                );
                            })()}
```

- [ ] **Step 3: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Manual smoke**

Refresh the admin "Active Clients" view. Existing clients show `Live` (have a date) or `In Progress` (no date). After Task 7 wiring, archiving or locking a client and going back to the list shows the new status.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ClientList.tsx
git commit -m "@ feat(lifecycle): derived status pill on admin client list"
```

---

## Task 9: Extract `<InvitationGifts>` from `<InvitationPreview>`

**Files:**
- Create: `src/components/InvitationGifts.tsx`
- Modify: `src/components/InvitationPreview.tsx`

This is a pure refactor — behavior must not change. The extracted component will be reused by `<ArchivedInvitationView>` in Task 10.

- [ ] **Step 1: Inspect the existing gifts block**

Read `src/components/InvitationPreview.tsx` around lines 1217–1288 — the `{hasGiftsSection && (...) }` block. Note the `data.giftMessage`, `data.giftOptions`, the per-option mapping with `Landmark` / `Smartphone` icons, the `GiftTransferDetailCard` helper, and the use of `cleanTheme.accent`.

- [ ] **Step 2: Create the extracted component**

Create `src/components/InvitationGifts.tsx`:

```tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Landmark, Smartphone } from 'lucide-react';
import {
    giftResolvedAccountNumberLabel,
    giftResolvedSwiftLabel,
    giftResolvedMobileNumberLabel,
    type GiftOption
} from '@/components/InvitationPreview';

interface InvitationGiftsProps {
    giftMessage?: string;
    giftOptions: GiftOption[];
    accentClass: string; // e.g. cleanTheme.accent like "text-emerald-700"
    headerLabel?: string; // defaults to "Registry & Gifts"
    /** Optional tag line below the header (used by ArchivedInvitationView for the post-event copy). */
    tagline?: string;
}

function GiftTransferDetailCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    const raw = value ?? '';
    if (!raw.trim()) return null;
    return (
        <div className="rounded-xl bg-stone-100/90 border border-stone-200/70 px-5 py-4 text-left shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]">
            <p className="text-[10px] font-sans font-medium uppercase tracking-[0.2em] text-stone-500 mb-2">{label}</p>
            <p className={`text-[15px] font-semibold text-stone-900 leading-snug break-words ${mono ? 'font-mono text-sm' : 'font-sans'}`}>
                {raw}
            </p>
        </div>
    );
}

const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' as const } }
};

/**
 * The Gifts & Registry block — extracted from InvitationPreview so both the
 * live invitation and the archived memorial view can render gifts identically.
 */
export default function InvitationGifts({
    giftMessage,
    giftOptions,
    accentClass,
    headerLabel = 'Registry & Gifts',
    tagline
}: InvitationGiftsProps) {
    if (!giftOptions || giftOptions.length === 0) return null;

    return (
        <motion.section
            className="py-24 px-6 @md:px-12 bg-stone-50 border-y border-stone-200"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={sectionVariants}
        >
            <div className="max-w-3xl mx-auto text-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-8 shadow-sm">
                    <Gift className={`w-6 h-6 ${accentClass}`} strokeWidth={1.5} />
                </div>
                <h3 className="text-sm @md:text-base font-sans mb-4 tracking-[0.2em] uppercase text-stone-400">
                    {headerLabel}
                </h3>
                {tagline && (
                    <p className="font-serif italic text-stone-500 text-lg mb-8">{tagline}</p>
                )}
                {giftMessage && (
                    <p className="text-xl @md:text-2xl font-serif text-stone-800 leading-relaxed font-light whitespace-pre-line mb-10">
                        {giftMessage}
                    </p>
                )}

                <div className="max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-stone-100 text-left space-y-10">
                    {giftOptions.map((option, idx) => (
                        <div key={option.id || idx}>
                            {idx > 0 && <div className="w-full h-px bg-stone-100 mb-10" aria-hidden />}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center shrink-0 border border-stone-100">
                                    {option.type === 'bank' ? (
                                        <Landmark className={`w-4 h-4 ${accentClass}`} />
                                    ) : (
                                        <Smartphone className={`w-4 h-4 ${accentClass}`} />
                                    )}
                                </div>
                                <h4 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                                    {option.type === 'bank'
                                        ? option.bankName || 'Bank transfer'
                                        : option.serviceName?.trim() || 'Mobile transfer'}
                                </h4>
                            </div>
                            {option.type === 'bank' ? (
                                <div className="space-y-3">
                                    <GiftTransferDetailCard label="Account holder" value={option.accountName || ''} />
                                    <GiftTransferDetailCard label={giftResolvedAccountNumberLabel(option)} value={option.accountNumber || ''} mono />
                                    <GiftTransferDetailCard label={giftResolvedSwiftLabel(option)} value={option.swiftCode || ''} mono />
                                    {(option.customFields || [])
                                        .filter((f) => f.value.trim() && f.label.trim())
                                        .map((f) => (
                                            <GiftTransferDetailCard key={f.id} label={f.label} value={f.value} mono />
                                        ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <GiftTransferDetailCard label="Account name" value={option.mobileAccountName || ''} />
                                    <GiftTransferDetailCard label={giftResolvedMobileNumberLabel(option)} value={option.mobileNumber || ''} mono />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </motion.section>
    );
}
```

- [ ] **Step 3: Replace the inline block in `InvitationPreview.tsx` with the extracted component**

In `InvitationPreview.tsx`, locate the `{hasGiftsSection && ( ... )}` block (around lines 1218–1288). Replace the entire block with:

```tsx
                        {hasGiftsSection && (
                            <InvitationGifts
                                giftMessage={data.giftMessage}
                                giftOptions={data.giftOptions || []}
                                accentClass={cleanTheme.accent}
                            />
                        )}
```

Add an import at the top of `InvitationPreview.tsx` (in the existing component-imports area):

```tsx
import InvitationGifts from '@/components/InvitationGifts';
```

If the local `GiftTransferDetailCard` helper at the top of `InvitationPreview.tsx` (around lines 95–116) is now unused, delete it. Same for the `Landmark` and `Smartphone` imports from `lucide-react` if they are no longer referenced elsewhere in the file (check with a quick search inside the file before removing).

- [ ] **Step 4: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean. (Lint may complain about unused imports if `Landmark`/`Smartphone` were not removed cleanly — fix them then.)

- [ ] **Step 5: Manual smoke**

Load an existing invitation at `/invite/<slug>` with at least one gift option. Visual: the gifts section looks identical to before — no layout/style/font changes. Custom fields render with mono font.

- [ ] **Step 6: Commit**

```bash
git add src/components/InvitationGifts.tsx src/components/InvitationPreview.tsx
git commit -m "@ refactor: extract InvitationGifts from InvitationPreview"
```

---

## Task 10: `<ArchivedInvitationView>` component

**Files:**
- Create: `src/components/ArchivedInvitationView.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import React from 'react';
import type { InvitationData, Theme } from '@/components/InvitationPreview';
import InvitationGifts from '@/components/InvitationGifts';

interface ArchivedInvitationViewProps {
    data: InvitationData;
}

function resolveTheme(theme?: Theme | null): { accent: string; background: string } {
    const fallback = { accent: 'text-emerald-700', background: 'bg-stone-50' };
    if (!theme) return fallback;
    return {
        accent: theme.accent || fallback.accent,
        background: theme.background || fallback.background
    };
}

/**
 * Public memorial view shown when `invitations.is_archived === true`.
 *
 * Minimal "thank you" hero + gifts/registry block. Everything else from the live
 * invitation (RSVP, schedule, houses, navigation, custom sections, formal invitation,
 * pre-ceremony media, reception details) is intentionally hidden.
 */
export default function ArchivedInvitationView({ data }: ArchivedInvitationViewProps) {
    const cleanTheme = resolveTheme(data.theme);
    const heroSrc = data.heroImage || '';

    return (
        <main className={`min-h-screen ${cleanTheme.background}`}>
            {/* Hero band — softened photo with thank-you title */}
            <section className="relative w-full overflow-hidden" style={{ minHeight: '70vh' }}>
                {heroSrc && (
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${heroSrc})`, filter: 'grayscale(1) brightness(0.75) blur(2px)', opacity: 0.6 }}
                    />
                )}
                <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-32 @md:py-40 max-w-3xl mx-auto">
                    <div className={`text-lg tracking-[0.5em] mb-10 ${cleanTheme.accent}`}>·  ·  ·  &amp;  ·  ·  ·</div>
                    <h1 className="font-serif text-6xl @md:text-8xl text-stone-900 leading-tight mb-8">Thank You.</h1>
                    <p className="font-serif text-lg @md:text-xl text-stone-700 leading-relaxed max-w-xl">
                        With gratitude for every guest who celebrated with us{data.date ? <> on <span className="italic">{data.date}</span></> : null}.
                    </p>
                    <p className="font-serif text-base @md:text-lg text-stone-600 mt-10 italic">
                        — {data.bride} &amp; {data.groom}
                    </p>
                </div>
            </section>

            {/* Gifts & registry — preserved if any options exist */}
            <InvitationGifts
                giftMessage={data.giftMessage}
                giftOptions={data.giftOptions || []}
                accentClass={cleanTheme.accent}
                headerLabel="Gifts & Registry"
                tagline="Your generosity is still welcome."
            />

            {/* Footnote */}
            {data.footnote && (
                <footer className="py-12 text-center text-xs text-stone-400 font-sans tracking-widest uppercase">
                    {data.footnote}
                </footer>
            )}
        </main>
    );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/ArchivedInvitationView.tsx
git commit -m "@ feat(lifecycle): ArchivedInvitationView (memorial 'thank you' page)"
```

---

## Task 11: Branch `app/invite/[slug]/page.tsx` on `isArchived` + metadata

**Files:**
- Modify: `src/app/invite/[slug]/page.tsx`

- [ ] **Step 1: Branch on `isArchived` in the page handler**

Locate the `if (result.length === 0) { notFound(); }` block (around line 65). After the `dbData` assignment that follows it (`const dbData = result[0];`), the page proceeds to fetch guest data and then render `<InvitationPreview ... />`. We want to: build `clientData` as today; if archived, render `<ArchivedInvitationView />` instead.

In the imports at the top of the file (lines 1–6), add:

```tsx
import ArchivedInvitationView from '@/components/ArchivedInvitationView';
```

Locate the final `return <InvitationPreview data={clientData} guestData={guestData} />;` line (around line 134). Replace it with:

```tsx
    if (dbData.isArchived) {
        return <ArchivedInvitationView data={clientData} />;
    }

    return <InvitationPreview data={clientData} guestData={guestData} />;
```

- [ ] **Step 2: Update `generateMetadata` for archived invites**

In `generateMetadata` (lines 13–50), locate where `title` and `description` are composed (around lines 28–29). Right before that, branch on the archive flag. Replace:

```tsx
    const data = result[0];
    const title = `${data.bride} & ${data.groom} | Wedding Invitation`;
    const description = `You are invited to the wedding of ${data.bride} & ${data.groom}. Join us on ${data.date || 'our special day'}.`;
```

with:

```tsx
    const data = result[0];
    const title = data.isArchived
        ? `Thank you from ${data.bride} & ${data.groom}`
        : `${data.bride} & ${data.groom} | Wedding Invitation`;
    const description = data.isArchived
        ? `${data.bride} & ${data.groom} thank you for celebrating with them${data.date ? ` on ${data.date}` : ''}.`
        : `You are invited to the wedding of ${data.bride} & ${data.groom}. Join us on ${data.date || 'our special day'}.`;
```

- [ ] **Step 3: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Manual smoke**

In dev: pick a test invitation. Use the LifecyclePanel from Task 7 to flip "Public invitation" ON. Visit `/invite/<slug>` — the page now shows the memorial view (faded hero, "Thank You.", gifts block preserved if any). Flip OFF — page returns to the live invitation. Confirm `og:title` in the page source matches the branch.

- [ ] **Step 5: Commit**

```bash
git add src/app/invite/[slug]/page.tsx
git commit -m "@ feat(lifecycle): public invite branches to ArchivedInvitationView when archived"
```

---

## Task 12: `<DashboardLockedScreen>` component

**Files:**
- Create: `src/components/dashboard/DashboardLockedScreen.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import React from 'react';
import { Lock } from 'lucide-react';

interface DashboardLockedScreenProps {
    bride?: string;
    groom?: string;
}

/**
 * Body of the dashboard when `invitations.client_locked === true`.
 * The existing dashboard top-nav (with the sign-out button) and <Toaster />
 * stay mounted around this — only the tabbed interior is replaced.
 */
export default function DashboardLockedScreen({ bride, groom }: DashboardLockedScreenProps) {
    const couple = bride && groom ? `${bride} & ${groom}` : null;
    return (
        <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
            <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center mb-6">
                    <Lock className="w-5 h-5 text-stone-600" />
                </div>
                <h2 className="font-serif text-3xl text-stone-900 mb-4">Your account is paused</h2>
                <p className="text-sm text-stone-600 leading-relaxed">
                    {couple ? <>Thank you, <span className="italic">{couple}</span>, for celebrating with us. </> : 'Thank you for celebrating with us. '}
                    Your dashboard access has been paused. The invitation page may still be accessible to your guests.
                </p>
                <p className="text-sm text-stone-500 leading-relaxed mt-4">
                    Need to download your guest list or update something? Reach out to your planner.
                </p>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardLockedScreen.tsx
git commit -m "@ feat(lifecycle): DashboardLockedScreen for paused clients"
```

---

## Task 13: Render `<DashboardLockedScreen>` when the client is locked

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Locate the invitation fetch**

Search `src/app/dashboard/page.tsx` for the initial invitation fetch that populates `weddingDetails`. It's the same fetch that already populates fields like `dbData.giftOptions || []` (around line 161 from earlier inspection). The fetched row already includes `clientLocked` after Task 1's schema change.

Ensure the local `weddingDetails` state carries `clientLocked` through. If the existing mapper drops fields, explicitly include it:

```ts
// inside the post-fetch mapper, alongside other fields:
clientLocked: (dbData as any).clientLocked ?? false,
```

- [ ] **Step 2: Import the locked screen**

Add this import near the other component imports at the top of `dashboard/page.tsx`:

```tsx
import DashboardLockedScreen from '@/components/dashboard/DashboardLockedScreen';
```

- [ ] **Step 3: Branch the tabbed body on `clientLocked`**

Find where the dashboard renders its tab content (look for `activeTab === 'guests'` / `activeTab === 'overview'` etc.). These are typically wrapped inside a single content area below the top nav. Just inside that wrapping container, before the first tab-conditional render, add:

```tsx
                {Boolean((weddingDetails as any).clientLocked) && (
                    <DashboardLockedScreen bride={weddingDetails.bride} groom={weddingDetails.groom} />
                )}
                {!Boolean((weddingDetails as any).clientLocked) && (
                    <>
                        {/* … existing tab content … */}
                    </>
                )}
```

If the file's structure makes that pattern awkward, an equivalent early-return at the top of the JSX is fine — but the top nav with sign-out MUST remain mounted. The simplest concrete pattern, if the existing JSX is `return ( <div>{nav}{tabContent}</div> )`, is to keep the wrapper and conditionally render the tabContent vs. the locked screen.

- [ ] **Step 4: Type-check and lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 5: Manual smoke**

Log in as admin in one browser window. Open the dashboard in a second window (as a client). Toggle "Client dashboard access" ON in the admin LifecyclePanel. Refresh the dashboard window — the tabbed body is replaced by the centered paused-account card. Top nav and sign-out are still visible/usable. Toggle OFF — refresh — dashboard returns to normal.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "@ feat(lifecycle): show DashboardLockedScreen when client is locked"
```

---

## Final verification

- [ ] **Step 1: Full type-check + lint**

```bash
node_modules/.bin/tsc --noEmit
npm run lint
```

Expected: clean.

- [ ] **Step 2: End-to-end smoke**

In dev (`npm run dev`):

1. Admin logs in.
2. Selects a test client in ClientList — status pill shows `Live` (or `In Progress` if no date).
3. Opens the builder, scrolls to the Lifecycle section.
4. Toggles "Public invitation" ON — confirm dialog → confirm.
5. In another tab, visits `/invite/<test-slug>` — sees the memorial view with gifts preserved.
6. Toggles "Client dashboard access" ON — confirm.
7. The test client refreshes their dashboard — sees the paused-account screen; sign-out works.
8. Admin returns to ClientList — status pill shows `Closed` (both flags ON).
9. Admin toggles both OFF — public invite returns to live; dashboard returns to normal.

- [ ] **Step 3: Push the branch when the user is ready**

The branch `feat/invitation-lifecycle-stage-1` was kept local during implementation. When the user confirms, push:

```bash
git push -u origin feat/invitation-lifecycle-stage-1
```

Then open a PR against `main` — the spec + 13 task commits.

---

## Self-review (run before handoff)

- **Spec coverage:** Tasks 1 (data model) · 2/3/4 (backend) · 9/10/11 (archived view) · 12/13 (locked dashboard) · 5/6/7 (admin panel + confirm) · 8 (status pill). All sections of the spec mapped.
- **Placeholders:** None — every step shows the actual code or exact command.
- **Type consistency:** `clientLocked` / `isArchived` / `clientLockedAt` / `archivedAt` used identically across schema, endpoint, panel, and page renders. `InvitationGifts` props match both call sites (`InvitationPreview` passes 3 props, `ArchivedInvitationView` passes 5).
- **Ambiguity:** Task 7 Step 3 has a "find the setLiveData call" instruction — flagged as needing inspection during execution; the file is too long to enumerate every spot in this plan, but the type-check at Step 4 will catch any drop.
