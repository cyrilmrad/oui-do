# Client Entitlements Panel Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin Client Entitlements panel as a searchable list + per-client detail editor, registry-driven and with safer save/confirm UX — without any DB, schema, or API changes.

**Architecture:** A parent container (`ClientEntitlementsPanel`) owns all state and data fetching and passes props down to presentational children (`EntitlementsClientList`, `EntitlementsDetail`, `FeatureToggle`, `PasswordManagerModal`). Feature labels/descriptions/icons come from a new UI-only `FEATURE_META` registry so future flags are a one-line add. Existing endpoints (`/api/admin/clients`, `/api/admin/client-entitlements` GET/POST/PATCH, reset/update-password) are reused unchanged.

**Tech Stack:** Next.js 16 / React 19, Tailwind v4 (admin "forest" tokens), lucide-react icons, sonner toasts, Supabase browser client.

**Testing note:** This repo has no unit-test runner. Each task's verification gate is `node_modules/.bin/tsc --noEmit` (no new errors) and `npm run lint` (no new errors). The final task runs `npm run build` and a manual smoke checklist.

**Branch:** `feat/entitlements-panel-revamp` (already created; spec already committed there).

---

## File Structure

- Create `src/lib/entitlements/featureMeta.ts` — UI registry: label, description, lucide icon per `FeatureKey`. Client-safe (no server imports).
- Create `src/components/admin/entitlements/types.ts` — shared `ClientFeatures` + `MergedClient` types.
- Create `src/components/admin/entitlements/FeatureToggle.tsx` — one labeled switch row (presentational).
- Create `src/components/admin/entitlements/EntitlementsClientList.tsx` — searchable list with status badges (presentational).
- Create `src/components/admin/entitlements/EntitlementsDetail.tsx` — per-client editor: toggles, inline disable-confirm, action bar (presentational).
- Create `src/components/admin/entitlements/PasswordManagerModal.tsx` — extracted password modal + a confirm step before "set password directly".
- Rewrite `src/components/admin/ClientEntitlementsPanel.tsx` — parent container (state, data, wiring). Path unchanged so `app/admin/page.tsx` import still works.

---

## Task 1: Feature metadata registry

**Files:**
- Create: `src/lib/entitlements/featureMeta.ts`

- [ ] **Step 1: Create the registry**

```ts
import type { FeatureKey } from '@/lib/features';
import { Users, MessageSquare, Wallet, Armchair, Settings, type LucideIcon } from 'lucide-react';

export type FeatureMeta = {
    label: string;
    description: string;
    icon: LucideIcon;
};

/** UI-only metadata for each entitlement flag. Adding a future flag = append to
 * FEATURE_KEYS (src/lib/features.ts) and add one entry here; the panel picks it up. */
export const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
    guests: { label: 'Guests', description: 'Guest list, RSVP tracking & CSV import', icon: Users },
    messages: { label: 'Messages', description: 'Read RSVP notes & well-wishes from guests', icon: MessageSquare },
    budget: { label: 'Budget', description: 'Budget tracker with categories & payments', icon: Wallet },
    seating: { label: 'Seating', description: 'Drag-and-drop table seating planner', icon: Armchair },
    settings: { label: 'Settings', description: 'Let the couple edit their own invitation', icon: Settings }
};
```

- [ ] **Step 2: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: PASS (no new errors). If `Record<FeatureKey, …>` complains, every key in `FEATURE_KEYS` must have an entry — confirm all five are present.

- [ ] **Step 3: Commit**

```bash
git add src/lib/entitlements/featureMeta.ts
git commit -m "feat(entitlements): add UI feature metadata registry"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/components/admin/entitlements/types.ts`

- [ ] **Step 1: Create the types**

```ts
import type { FeatureKey } from '@/lib/features';

export type ClientFeatures = Record<FeatureKey, boolean>;

export type MergedClient = {
    slug: string;
    bride?: string;
    groom?: string;
    email?: string | null;
    features: ClientFeatures;
    /** true when a client_entitlements row exists; false = running on defaults */
    configured: boolean;
    updatedAt?: string | null;
};
```

- [ ] **Step 2: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/entitlements/types.ts
git commit -m "feat(entitlements): add shared MergedClient types"
```

---

## Task 3: FeatureToggle component

**Files:**
- Create: `src/components/admin/entitlements/FeatureToggle.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import React from 'react';
import type { FeatureKey } from '@/lib/features';
import { FEATURE_META } from '@/lib/entitlements/featureMeta';

type Props = {
    featureKey: FeatureKey;
    enabled: boolean;
    onToggle: (key: FeatureKey) => void;
    disabled?: boolean;
};

export default function FeatureToggle({ featureKey, enabled, onToggle, disabled }: Props) {
    const meta = FEATURE_META[featureKey];
    const Icon = meta.icon;
    return (
        <div className="flex items-center justify-between gap-4 py-3 border-b border-outline-variant/10 last:border-0">
            <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-surface-container-high/50 flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-4 h-4" />
                </span>
                <div>
                    <p className="text-sm font-semibold text-primary">{meta.label}</p>
                    <p className="text-xs text-secondary mt-0.5">{meta.description}</p>
                </div>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`Toggle ${meta.label}`}
                disabled={disabled}
                onClick={() => onToggle(featureKey)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                    enabled ? 'bg-primary' : 'bg-outline-variant/60'
                }`}
            >
                <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        enabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
                    }`}
                />
            </button>
        </div>
    );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/entitlements/FeatureToggle.tsx
git commit -m "feat(entitlements): add FeatureToggle switch row"
```

---

## Task 4: EntitlementsClientList component

**Files:**
- Create: `src/components/admin/entitlements/EntitlementsClientList.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import React from 'react';
import { Search } from 'lucide-react';
import type { MergedClient } from './types';

type Props = {
    clients: MergedClient[];
    selectedSlug: string | null;
    search: string;
    /** slug of the selected client when it has unsaved edits, else null */
    dirtySlug: string | null;
    onSearch: (v: string) => void;
    onSelect: (slug: string) => void;
};

function displayName(c: MergedClient) {
    const b = c.bride?.trim();
    const g = c.groom?.trim();
    if (b && g) return `${b} & ${g}`;
    return b || g || c.slug;
}

export default function EntitlementsClientList({ clients, selectedSlug, search, dirtySlug, onSearch, onSelect }: Props) {
    const q = search.trim().toLowerCase();
    const filtered = !q
        ? clients
        : clients.filter((c) => {
              const name = `${c.bride || ''} ${c.groom || ''}`.toLowerCase();
              return c.slug.toLowerCase().includes(q) || name.includes(q) || (c.email || '').toLowerCase().includes(q);
          });

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-outline-variant/15">
                <div className="flex items-center gap-2 bg-surface rounded-full px-3 py-2 border border-outline-variant/20">
                    <Search className="w-4 h-4 text-secondary" />
                    <input
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="Search clients…"
                        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-secondary/50"
                    />
                </div>
            </div>
            <ul className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[60vh]">
                {filtered.map((c) => {
                    const selected = c.slug === selectedSlug;
                    const isDirty = c.slug === dirtySlug;
                    return (
                        <li key={c.slug}>
                            <button
                                type="button"
                                onClick={() => onSelect(c.slug)}
                                className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-colors ${
                                    selected
                                        ? 'bg-surface border border-outline-variant/30 shadow-sm'
                                        : 'hover:bg-surface-container-high/30 border border-transparent'
                                }`}
                            >
                                <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${c.configured ? 'bg-emerald-500' : 'bg-outline-variant/50'}`}
                                    title={c.configured ? 'Configured' : 'Using defaults'}
                                />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold text-primary truncate">{displayName(c)}</span>
                                    <span className="block font-mono text-[0.7rem] text-secondary truncate">{c.slug}</span>
                                </span>
                                {isDirty ? (
                                    <span className="text-[0.6rem] font-label uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                        Unsaved
                                    </span>
                                ) : !c.configured ? (
                                    <span className="text-[0.6rem] font-label uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                                        Defaults
                                    </span>
                                ) : null}
                            </button>
                        </li>
                    );
                })}
                {filtered.length === 0 && <li className="p-6 text-center text-secondary text-sm">No matching clients.</li>}
            </ul>
        </div>
    );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: PASS. Watch for raw `&` in JSX — `displayName` returns a plain string used as `{displayName(c)}` (a JS expression, not a JSX text node), so the `&` there is safe.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/entitlements/EntitlementsClientList.tsx
git commit -m "feat(entitlements): add searchable client list with status badges"
```

---

## Task 5: EntitlementsDetail component

**Files:**
- Create: `src/components/admin/entitlements/EntitlementsDetail.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import React from 'react';
import { Loader2, KeyRound, AlertTriangle } from 'lucide-react';
import { FEATURE_KEYS, type FeatureKey } from '@/lib/features';
import { FEATURE_META } from '@/lib/entitlements/featureMeta';
import FeatureToggle from './FeatureToggle';
import type { ClientFeatures, MergedClient } from './types';

type Props = {
    client: MergedClient | null;
    draft: ClientFeatures | null;
    dirty: boolean;
    saving: boolean;
    pendingDisable: FeatureKey | null;
    onToggle: (key: FeatureKey) => void;
    onConfirmDisable: () => void;
    onCancelDisable: () => void;
    onSave: () => void;
    onReset: () => void;
    onManagePassword: () => void;
};

function displayName(c: MergedClient) {
    const b = c.bride?.trim();
    const g = c.groom?.trim();
    if (b && g) return `${b} & ${g}`;
    return b || g || c.slug;
}

export default function EntitlementsDetail(props: Props) {
    const {
        client, draft, dirty, saving, pendingDisable,
        onToggle, onConfirmDisable, onCancelDisable, onSave, onReset, onManagePassword
    } = props;

    if (!client || !draft) {
        return (
            <div className="flex items-center justify-center h-full text-secondary text-sm p-10">
                Select a client to manage their features.
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 flex flex-col h-full">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-headline text-2xl text-primary">{displayName(client)}</h3>
                    <p className="text-xs text-secondary mt-1">
                        <span className="font-mono">{client.slug}</span>
                        <span> · {client.configured ? 'configured' : 'using defaults'}</span>
                    </p>
                </div>
                {dirty && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Unsaved changes
                    </span>
                )}
            </div>

            <div className="mt-5 flex-1">
                {FEATURE_KEYS.map((k) => (
                    <FeatureToggle key={k} featureKey={k} enabled={!!draft[k]} onToggle={onToggle} disabled={saving} />
                ))}
            </div>

            {pendingDisable && (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                    <span className="flex-1">
                        Turning <b>{FEATURE_META[pendingDisable].label}</b> off will immediately hide it from the couple&apos;s dashboard.
                    </span>
                    <div className="flex gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onCancelDisable}
                            className="px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-bold border border-amber-300 text-amber-800"
                        >
                            Keep on
                        </button>
                        <button
                            type="button"
                            onClick={onConfirmDisable}
                            className="px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-bold bg-amber-600 text-white"
                        >
                            Turn off
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-6 pt-4 border-t border-outline-variant/15 flex items-center gap-3">
                <button
                    type="button"
                    onClick={onSave}
                    disabled={!dirty || saving}
                    className="px-6 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold bg-primary text-on-primary disabled:opacity-40 flex items-center gap-2"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save changes
                </button>
                <button
                    type="button"
                    onClick={onReset}
                    disabled={!dirty || saving}
                    className="px-5 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold border border-outline-variant/30 text-secondary hover:text-primary disabled:opacity-40"
                >
                    Reset
                </button>
                <button
                    type="button"
                    onClick={onManagePassword}
                    className="ml-auto flex items-center gap-2 text-xs font-label uppercase tracking-widest font-bold text-secondary hover:text-primary"
                >
                    <KeyRound className="w-4 h-4" /> Manage password
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: PASS. Note `couple&apos;s` is used (not a raw apostrophe) to satisfy the ESLint JSX-text rule.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/entitlements/EntitlementsDetail.tsx
git commit -m "feat(entitlements): add per-client detail editor with disable-confirm"
```

---

## Task 6: PasswordManagerModal (extracted + confirm step)

**Files:**
- Create: `src/components/admin/entitlements/PasswordManagerModal.tsx`

This moves the existing modal out of `ClientEntitlementsPanel.tsx` and adds a confirmation step before "set password directly". Endpoints and payloads are unchanged.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Loader2, KeyRound, Shield, Copy, Check, X, AlertTriangle } from 'lucide-react';

type Props = {
    slug: string;
    email?: string;
    onClose: () => void;
};

type View = 'options' | 'link' | 'set-password';

async function authHeader(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return headers;
}

export default function PasswordManagerModal({ slug, email, onClose }: Props) {
    const [view, setView] = useState<View>('options');
    const [loading, setLoading] = useState(false);
    const [link, setLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmingSet, setConfirmingSet] = useState(false);
    const [done, setDone] = useState(false);
    const [resolvedEmail, setResolvedEmail] = useState(email);

    const generateLink = async () => {
        setView('link');
        setLoading(true);
        try {
            const res = await fetch('/api/admin/reset-password', { method: 'POST', headers: await authHeader(), body: JSON.stringify({ slug }) });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Failed to generate link');
            setLink(json.link);
            if (json.email) setResolvedEmail(json.email);
        } catch (e: any) {
            toast.error('Failed to generate reset link', { description: e.message });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleSetPassword = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/update-password', { method: 'POST', headers: await authHeader(), body: JSON.stringify({ slug, password: newPassword }) });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Failed to update password');
            setDone(true);
            setNewPassword('');
            setConfirmingSet(false);
        } catch (e: any) {
            toast.error('Failed to update password', { description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        if (!link) return;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 p-8 max-w-lg w-full mx-4 space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="font-headline text-xl text-primary">Manage Password</h3>
                        <p className="text-secondary text-sm mt-1">
                            <span className="font-mono text-primary">{slug}</span>
                            {resolvedEmail && <span className="text-secondary"> · {resolvedEmail}</span>}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-secondary hover:text-primary mt-0.5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {view === 'options' && (
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={generateLink}
                            className="w-full flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high/40 p-4 text-left transition-colors"
                        >
                            <KeyRound className="w-5 h-5 text-primary shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Generate reset link</p>
                                <p className="text-xs text-secondary mt-0.5">Creates a one-time recovery link to share with the client.</p>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('set-password')}
                            className="w-full flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high/40 p-4 text-left transition-colors"
                        >
                            <Shield className="w-5 h-5 text-primary shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Set password directly</p>
                                <p className="text-xs text-secondary mt-0.5">Immediately overrides the client&apos;s password. Takes effect on next login.</p>
                            </div>
                        </button>
                    </div>
                )}

                {view === 'link' && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>
                        ) : (
                            <>
                                <div className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-3 flex items-center gap-3">
                                    <p className="font-mono text-xs text-primary break-all flex-1 select-all">{link}</p>
                                    <button type="button" onClick={copyLink} className="shrink-0 text-secondary hover:text-primary" title="Copy link">
                                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-secondary">Single-use link, expires in 24 hours. Share directly with the client.</p>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setView('options')} className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold border border-outline-variant/30 text-secondary hover:text-primary">Back</button>
                                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold bg-primary text-on-primary">Done</button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {view === 'set-password' && (
                    <div className="space-y-4">
                        {done ? (
                            <>
                                <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                                    <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <p className="text-sm text-emerald-900">Password updated successfully.</p>
                                </div>
                                <button type="button" onClick={onClose} className="w-full py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold bg-primary text-on-primary">Done</button>
                            </>
                        ) : confirmingSet ? (
                            <>
                                <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-900">This immediately overrides the client&apos;s password. They will need the new password to log in. Continue?</p>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setConfirmingSet(false)} disabled={loading} className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold border border-outline-variant/30 text-secondary hover:text-primary">Cancel</button>
                                    <button
                                        type="button"
                                        onClick={handleSetPassword}
                                        disabled={loading}
                                        className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold bg-amber-600 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm override'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[0.65rem] font-label uppercase tracking-widest text-secondary font-bold block">New password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min. 8 characters"
                                        className="w-full border border-outline-variant/30 rounded-lg px-4 py-2.5 bg-surface text-sm"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setView('options')} className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold border border-outline-variant/30 text-secondary hover:text-primary">Back</button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingSet(true)}
                                        disabled={newPassword.length < 8}
                                        className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold bg-primary text-on-primary disabled:opacity-50"
                                    >
                                        Set password
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: PASS. (The old modal still lives in `ClientEntitlementsPanel.tsx` at this point — that's fine; it's removed in Task 7.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/entitlements/PasswordManagerModal.tsx
git commit -m "feat(entitlements): extract PasswordManagerModal with set-password confirm step"
```

---

## Task 7: Rewrite the parent ClientEntitlementsPanel

**Files:**
- Modify (full rewrite): `src/components/admin/ClientEntitlementsPanel.tsx`

This replaces the whole file. Path and default export stay the same, so `app/admin/page.tsx` (`import ClientEntitlementsPanel from '@/components/admin/ClientEntitlementsPanel'`) needs no change.

- [ ] **Step 1: Replace the file contents**

```tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Shield, Loader2 } from 'lucide-react';
import { FEATURE_KEYS, type FeatureKey } from '@/lib/features';
import { getDefaultFeatureFlags } from '@/lib/entitlements/defaults';
import EntitlementsClientList from './entitlements/EntitlementsClientList';
import EntitlementsDetail from './entitlements/EntitlementsDetail';
import PasswordManagerModal from './entitlements/PasswordManagerModal';
import type { ClientFeatures, MergedClient } from './entitlements/types';

type AdminClientRow = { id: string; slug: string; bride?: string; groom?: string; email?: string | null };
type EntRow = { slug: string; features: ClientFeatures; updatedAt?: string | null };

function sameFeatures(a: ClientFeatures, b: ClientFeatures) {
    return FEATURE_KEYS.every((k) => !!a[k] === !!b[k]);
}

export default function ClientEntitlementsPanel() {
    const [clients, setClients] = useState<AdminClientRow[]>([]);
    const [rowsBySlug, setRowsBySlug] = useState<Record<string, EntRow>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [draft, setDraft] = useState<ClientFeatures | null>(null);
    const [saving, setSaving] = useState(false);
    const [pendingDisable, setPendingDisable] = useState<FeatureKey | null>(null);
    const [pwSlug, setPwSlug] = useState<string | null>(null);

    const authHeader = useCallback(async (): Promise<HeadersInit> => {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
        return headers;
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const h = await authHeader();
            const [clientsRes, entRes] = await Promise.all([
                fetch('/api/admin/clients', { headers: h }),
                fetch('/api/admin/client-entitlements', { headers: h })
            ]);
            const clientsData = clientsRes.ok ? ((await clientsRes.json()) as AdminClientRow[]) : [];
            const entData = entRes.ok ? ((await entRes.json()) as EntRow[]) : [];
            const map: Record<string, EntRow> = {};
            (Array.isArray(entData) ? entData : []).forEach((r) => { map[r.slug] = r; });
            setClients(Array.isArray(clientsData) ? clientsData : []);
            setRowsBySlug(map);
        } catch (e: any) {
            toast.error('Failed to load entitlements', { description: e.message });
        } finally {
            setLoading(false);
        }
    }, [authHeader]);

    useEffect(() => { load(); }, [load]);

    const mergedClients = useMemo<MergedClient[]>(() => {
        const defaults = getDefaultFeatureFlags();
        return clients.map((c) => {
            const row = rowsBySlug[c.slug];
            return {
                slug: c.slug,
                bride: c.bride,
                groom: c.groom,
                email: c.email,
                features: row ? row.features : defaults,
                configured: !!row,
                updatedAt: row?.updatedAt ?? null
            };
        });
    }, [clients, rowsBySlug]);

    const selectedClient = useMemo(
        () => mergedClients.find((c) => c.slug === selectedSlug) ?? null,
        [mergedClients, selectedSlug]
    );

    const dirty = useMemo(() => {
        if (!selectedClient || !draft) return false;
        return !sameFeatures(draft, selectedClient.features);
    }, [selectedClient, draft]);

    const selectClient = useCallback(
        (slug: string) => {
            if (slug === selectedSlug) return;
            if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
            const target = mergedClients.find((c) => c.slug === slug);
            setSelectedSlug(slug);
            setDraft(target ? { ...target.features } : null);
            setPendingDisable(null);
        },
        [selectedSlug, dirty, mergedClients]
    );

    const handleToggle = useCallback(
        (key: FeatureKey) => {
            if (!draft) return;
            if (draft[key]) {
                // turning OFF → confirm first
                setPendingDisable(key);
            } else {
                setDraft({ ...draft, [key]: true });
                setPendingDisable(null);
            }
        },
        [draft]
    );

    const confirmDisable = useCallback(() => {
        if (!pendingDisable) return;
        setDraft((prev) => (prev ? { ...prev, [pendingDisable]: false } : prev));
        setPendingDisable(null);
    }, [pendingDisable]);

    const cancelDisable = useCallback(() => setPendingDisable(null), []);

    const resetDraft = useCallback(() => {
        if (selectedClient) setDraft({ ...selectedClient.features });
        setPendingDisable(null);
    }, [selectedClient]);

    const save = useCallback(async () => {
        if (!selectedClient || !draft) return;
        setSaving(true);
        try {
            const h = await authHeader();
            const res = selectedClient.configured
                ? await fetch(`/api/admin/client-entitlements/${encodeURIComponent(selectedClient.slug)}`, {
                      method: 'PATCH',
                      headers: h,
                      body: JSON.stringify(draft)
                  })
                : await fetch('/api/admin/client-entitlements', {
                      method: 'POST',
                      headers: h,
                      body: JSON.stringify({ slug: selectedClient.slug, ...draft })
                  });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Save failed');
            toast.success('Entitlements saved', { description: selectedClient.slug });
            await load();
        } catch (e: any) {
            toast.error('Save failed', { description: e.message });
        } finally {
            setSaving(false);
        }
    }, [selectedClient, draft, authHeader, load]);

    return (
        <div className="w-full max-w-[1600px] mx-auto p-8 md:p-12 space-y-8">
            <header>
                <span className="font-label uppercase tracking-[0.2em] text-[0.7rem] font-semibold text-secondary mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Access control
                </span>
                <h2 className="font-headline text-4xl md:text-[3rem] text-primary">Client Entitlements</h2>
                <p className="mt-2 text-secondary text-sm max-w-xl">
                    Enable or disable portal features per client. Clients on defaults (Guests and Messages on) get a saved row the first time you change them.
                </p>
            </header>

            {loading ? (
                <div className="flex justify-center py-24 text-secondary"><Loader2 className="w-10 h-10 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] rounded-2xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden min-h-[460px]">
                    <div className="border-b md:border-b-0 md:border-r border-outline-variant/15">
                        <EntitlementsClientList
                            clients={mergedClients}
                            selectedSlug={selectedSlug}
                            search={search}
                            dirtySlug={dirty ? selectedSlug : null}
                            onSearch={setSearch}
                            onSelect={selectClient}
                        />
                    </div>
                    <EntitlementsDetail
                        client={selectedClient}
                        draft={draft}
                        dirty={dirty}
                        saving={saving}
                        pendingDisable={pendingDisable}
                        onToggle={handleToggle}
                        onConfirmDisable={confirmDisable}
                        onCancelDisable={cancelDisable}
                        onSave={save}
                        onReset={resetDraft}
                        onManagePassword={() => setPwSlug(selectedClient?.slug ?? null)}
                    />
                </div>
            )}

            {pwSlug && (
                <PasswordManagerModal
                    slug={pwSlug}
                    email={clients.find((c) => c.slug === pwSlug)?.email ?? undefined}
                    onClose={() => setPwSlug(null)}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `node_modules/.bin/tsc --noEmit && npm run lint`
Expected: PASS. The old `Search`/`KeyRound`/`Copy`/`Check`/`X` imports and all the old modal/draft state are gone — confirm no unused-import or unused-var warnings remain in this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ClientEntitlementsPanel.tsx
git commit -m "feat(entitlements): rebuild panel as list + detail with registry-driven toggles"
```

---

## Task 8: Build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 2: Manual smoke test**

Run `npm run dev`, log in as an admin, open the admin workspace, and switch to the Client Entitlements section. Verify:

- [ ] The list shows **every** client (not just configured ones); configured clients show a green dot, others show a "Defaults" badge.
- [ ] Searching filters by name, slug, and email.
- [ ] Selecting a client populates the detail pane with the correct toggle states; each toggle shows its label + description + icon.
- [ ] **Save is disabled** until a toggle changes; changing one shows the "Unsaved changes" indicator and the "Unsaved" badge in the list.
- [ ] Turning a feature **off** shows the amber confirm banner; "Keep on" cancels, "Turn off" applies.
- [ ] Turning a feature **on** applies immediately (no banner).
- [ ] **Reset** restores the saved state and clears the dirty indicators.
- [ ] Saving a **defaults** client succeeds (POST creates the row) and it then shows the green "configured" dot.
- [ ] Saving a **configured** client succeeds (PATCH) and a success toast appears; an induced failure shows an error toast.
- [ ] Selecting a different client while there are unsaved edits prompts to discard.
- [ ] "Manage password" opens the modal; "Generate reset link" returns a link with copy; "Set password directly" requires the confirm step before applying; both surface errors as toasts.
- [ ] Re-confirm the dashboard side still respects flags: a client with a feature off does not see that tab (no regression in `EntitlementsContext`/`/api/me/entitlements`).

- [ ] **Step 3: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "chore(entitlements): manual-verification fixes"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- List + detail layout → Tasks 4, 5, 7. ✓
- Show-all-clients + init-on-save → Task 7 (`mergedClients` merge; POST when `!configured`). ✓
- Feature registry / UI extensibility → Task 1 + consumed in Tasks 3, 5. ✓
- Risky-action confirm (disable) → Task 5 banner + Task 7 `pendingDisable` flow. ✓
- Set-password confirm → Task 6. ✓
- Dirty state / Save-disabled / Reset / unsaved guard → Tasks 5, 7. ✓
- Sonner toasts replace inline message → Tasks 6, 7. ✓
- Component decomposition (parent + presentational) → Tasks 2–7. ✓
- No DB/schema/API change → confirmed; only client files touched. ✓

**Placeholder scan:** none — every step has complete code or exact commands.

**Type consistency:** `ClientFeatures`/`MergedClient` (Task 2) used identically in Tasks 3–7; `EntRow` (parent) matches the GET payload shape (`slug`, `features`, `updatedAt`); `pendingDisable: FeatureKey | null`, `handleToggle(key: FeatureKey)`, and `FEATURE_META[key]` are consistent across detail + parent.
