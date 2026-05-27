# Lifecycle Panel Redesign

**Date:** 2026-05-27  
**Status:** Approved  
**Branch:** `feat/invitation-lifecycle-stage-1`

---

## What & Why

The current Lifecycle UI has two problems:
1. It lives in a separate top-level sidebar tab (`AdminLifecyclePanel`) that breaks per-client context — admins must leave a client's workspace entirely to manage their lifecycle.
2. The visual design uses big stacked cards that feel heavy and disconnected.

**Solution:** Move lifecycle controls into the `ClientOverview` panel (the tab that appears when a client is selected), remove the top-level tab entirely, and surface lifecycle status as pills on the `ClientList` rows.

---

## Changes

### 1. `src/app/admin/page.tsx`

- Remove `'lifecycle'` from the `activeTab` union type.
- Remove the "Lifecycle" sidebar `<button>` (the one with `<Archive>` icon).
- Remove the `{activeTab === 'lifecycle' && <AdminLifecyclePanel />}` render block.
- Add a `selectedLifecycle` state object:
  ```ts
  const [selectedLifecycle, setSelectedLifecycle] = useState<{
      clientLocked: boolean;
      clientLockedAt: string | null;
      isArchived: boolean;
      archivedAt: string | null;
      archiveMessage: string | null;
  } | null>(null);
  ```
- In `onSelectClient`, after loading the client, set `selectedLifecycle` from the client row (the `/api/admin/clients` response already includes all lifecycle fields):
  ```ts
  setSelectedLifecycle({
      clientLocked: client.clientLocked ?? false,
      clientLockedAt: client.clientLockedAt ?? null,
      isArchived: client.isArchived ?? false,
      archivedAt: client.archivedAt ?? null,
      archiveMessage: client.archiveMessage ?? null,
  });
  ```
- Pass new props to `<ClientOverview>`:
  ```tsx
  slug={liveData.slug}
  lifecycle={selectedLifecycle}
  onLifecycleChange={(patch) => setSelectedLifecycle(prev => prev ? { ...prev, ...patch } : patch)}
  ```
- Also reset `selectedLifecycle` to `null` when switching away from a client (same place the other resets happen).

### 2. `src/components/admin/ClientOverview.tsx`

Add a **"Client Status"** section between the stat cards and the Quick Access nav.

**New props added to `ClientOverviewProps`:**
```ts
slug: string;
lifecycle: {
    clientLocked: boolean;
    clientLockedAt: string | null;
    isArchived: boolean;
    archivedAt: string | null;
    archiveMessage: string | null;
} | null;
onLifecycleChange: (patch: {
    clientLocked: boolean;
    clientLockedAt: string | null;
    isArchived: boolean;
    archivedAt: string | null;
    archiveMessage: string | null;
}) => void;
```

**Lifecycle section design** (uses the overview's stone palette — `bg-white border border-stone-100 rounded-2xl`):

- Section eyebrow label: `"Client Status"` — same style as the Quick Access eyebrow
- A single card (`bg-white border border-stone-100 rounded-2xl overflow-hidden`) containing:
  - **Header row**: small icon + "Lifecycle" title on the left; phase badge on the right
    - Phase badge: emerald (`bg-emerald-50 text-emerald-700`) when Live, amber (`bg-amber-50 text-amber-700`) when only locked, stone (`bg-stone-100 text-stone-500`) when archived
    - Phase text: "Live" / "Paused" / "Archived" / "Closed" (locked + archived)
  - **Control row 1 — Dashboard access**: `🔓`/`🔒` icon + title + description + action button
    - Button when active (not locked): neutral (`bg-stone-50 border-stone-200 text-stone-600`) — label "Active" with green dot
    - Button when locked: amber tint (`bg-amber-50 border-amber-200 text-amber-700`) — label "Locked" with amber dot
    - Clicking when not locked: opens ConfirmDialog to lock
    - Clicking when locked: immediately unlocks (no confirm)
  - **Control row 2 — Public invitation**: `🌐`/`📦` icon + title + description + action button
    - Button when live: neutral — label "Live" with green dot
    - Button when archived: stone tint (`bg-stone-100 border-stone-200 text-stone-500`) — label "Archived" with stone dot
    - Clicking when live: opens ConfirmDialog to archive
    - Clicking when archived: immediately unarchives (no confirm)
  - **Thank-you note area** (always visible, not conditional on archive state): muted `bg-stone-50` panel with label, textarea (2 rows), and "Save note" button — same stone palette
  - **Timestamps footer**: two inline items `Last locked:` / `Last archived:` in tiny muted text

**API calls** use `fetchWithAuth` (already imported in admin/page.tsx context but ClientOverview needs to import it directly: `import { fetchWithAuth } from '@/lib/fetchWithAuth'`).

Endpoint: `PATCH /api/admin/clients/${slug}/lifecycle`

**ConfirmDialog** already exists at `@/components/ConfirmDialog` — import and use it.

**Local state in ClientOverview** for lifecycle actions:
```ts
const [lifecycleBusy, setLifecycleBusy] = useState(false);
const [lifecyclePending, setLifecyclePending] = useState<'lock' | 'archive' | null>(null);
const [localArchiveMessage, setLocalArchiveMessage] = useState('');
const [savingMessage, setSavingMessage] = useState(false);
```

Sync `localArchiveMessage` from `lifecycle.archiveMessage` via `useEffect`.

### 3. `src/components/admin/ClientList.tsx`

Replace the single combined status column with separate lifecycle pills. Show pills only for non-default states (don't show a "Live" pill — just show nothing for normal clients to reduce clutter).

**New pill logic** (replaces `deriveStatus`):
```ts
// Show one or two pills for exceptional states only
const pills = [];
if (client.clientLocked) pills.push({ label: 'Paused', cls: 'bg-amber-50 text-amber-700 border border-amber-200' });
if (client.isArchived) pills.push({ label: 'Archived', cls: 'bg-stone-100 text-stone-500 border border-stone-200' });
```

Each pill: `font-label text-[0.6rem] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full` + the cls above.

The status column label "Status" and the dot+text pattern is replaced by these pill(s). If no pills, the column is empty (no dot shown for Live/In Progress).

### 4. Remove `AdminLifecyclePanel` from active use

- Remove the import from `admin/page.tsx`
- The file `src/components/admin/AdminLifecyclePanel.tsx` can remain on disk (no need to delete)

### 5. `LifecyclePanel.tsx` — no changes

This component is no longer used by `AdminLifecyclePanel` (which itself is unused). It remains in the codebase for reference but is not imported anywhere after this change.

---

## Out of Scope

- Deleting `AdminLifecyclePanel.tsx` or `LifecyclePanel.tsx` from disk
- Any changes to the `DashboardLockedScreen` or `ArchivedInvitationView`
- Any change to the lifecycle API route
