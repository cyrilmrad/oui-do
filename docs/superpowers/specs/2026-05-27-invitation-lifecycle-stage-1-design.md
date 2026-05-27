# Invitation Lifecycle — Stage 1 (manual admin controls)

**Status:** Approved for implementation
**Date:** 2026-05-27
**Scope:** Stage 1 of a three-stage feature. This spec covers manual admin controls only — the 7-day auto-trigger after the wedding date is Stage 2 and gets its own spec.

## Problem

After a wedding, couples are done with the dashboard but the public invitation lingers indefinitely on the live site. There is no way to:

1. Pause a client's dashboard access (so they stop editing finalized data, and so we close out finished engagements cleanly).
2. Transition the public `/invite/<slug>` page from a "you are invited" page to a "thank you for celebrating with us" memorial page, while preserving the registry/gift details for guests who still want to send something.

Stage 1 gives the admin two independent toggles to do this manually. Stage 2 will later automate the toggles based on `wedding_date + 7 days`.

## Goals

- Admin can independently:
  - Lock a client's dashboard access.
  - Archive a client's public invitation into a memorial view.
- The locked dashboard shows a dignified "your account is paused" screen, not a 404 or auth error.
- The archived public invite shows a minimal "Thank you" view that preserves the gift/registry block.
- Status of each invitation is visible at a glance on the admin client list.
- Both flags are independently reversible (turn off to restore live state).

## Non-goals (Stage 1)

- 7-day automatic trigger after the wedding date — Stage 2.
- Calling Supabase `auth.admin.updateUserById(..., { ban_duration })` — DB flag is sufficient for enforcement in Stage 1.
- "Preview archived view" toggle inside the admin builder — admin can flip the live flag and reverse it; preview is overkill at this stage.
- Forced guest-list export before locking — assumed admin handles their own data hand-off.
- New roles (`planner`, etc.) — orthogonal multi-tenant feature.

## Data model

Migration (additive, backward-compatible — all new columns nullable or with safe defaults):

```sql
ALTER TABLE invitations
  ADD COLUMN client_locked     BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN client_locked_at  TIMESTAMP,
  ADD COLUMN is_archived       BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN archived_at       TIMESTAMP;
```

Drizzle schema in `src/db/schema.ts`:

```ts
clientLocked:    boolean('client_locked').notNull().default(false),
clientLockedAt:  timestamp('client_locked_at'),
isArchived:      boolean('is_archived').notNull().default(false),
archivedAt:      timestamp('archived_at'),
```

### Why on `invitations` and not elsewhere

- Matches the existing slug-keyed flag pattern (`showRsvp`, `showHouses`, `showFormalInvitation`, …).
- Single source of truth: the public invite page already fetches this row.
- Easy to query for the admin client list (one join less than going through auth metadata or `subscriptions`).
- The `*_at` timestamps make Stage 2's "7 days post-wedding" calculation trivial later.

### Why two booleans, not an enum

- The two states are independent. Stage 2's 7-day grace window has `client_locked = true` but `is_archived = false`. A bundled "wind-down" enum would have to break apart again.
- Boolean toggles map cleanly onto the existing builder UI conventions.
- Migration cost is two columns; no state machine to maintain.

## Backend

### New endpoint

```
PATCH /api/admin/clients/[slug]/lifecycle
```

Body (both fields optional, at least one required):

```ts
{
  clientLocked?: boolean;
  isArchived?: boolean;
}
```

Behavior:
- Admin-only, guarded by `requireAdmin`.
- For each provided field: update the column. When flipping to `true`, set the corresponding `*_at = now()`. When flipping to `false`, set `*_at = NULL`.
- Returns the updated `(client_locked, client_locked_at, is_archived, archived_at)` tuple.
- 404 if the slug does not exist.

### RSVP rejection on archived invites

`/api/rsvp` (existing) gets one new early return: if the target invitation has `is_archived = true`, reject with HTTP 403 and a `{ error: "This event has concluded." }` body. Without this, guests could still submit RSVPs to closed events.

### Existing endpoints

No other endpoint changes. The public invite page and dashboard each read the new flags directly from the row they already fetch.

## Public archived view

### Routing

`app/invite/[slug]/page.tsx`:
- After loading the invitation row, branch:
  - `dbData.isArchived === true` → render `<ArchivedInvitationView data={clientData} />`
  - otherwise → render `<InvitationPreview data={clientData} />` as today.
- `generateMetadata`: when archived, use `Thank you from {bride} & {groom}` for `title` and an analogous description. Hero image and Open Graph image stay the same.

### New component: `src/components/ArchivedInvitationView.tsx`

Layout, top to bottom:

1. **Hero band** — full-bleed height ~`70vh`.
   - Background: `data.heroImage` rendered with `grayscale brightness-75 blur-[2px] opacity-60` over the configured theme background, so the photo becomes a softened keepsake rather than a marketing hero.
   - Centered ornament line: `·  ·  ·  &  ·  ·  ·` in the theme accent color (uses the existing `cleanTheme.accent` token).
   - Big serif title: `Thank You.` — uses the same `font-serif` (Noto Serif) treatment already used for the invitation hero.
   - Subtext: `With gratitude for every guest who celebrated with us on {data.date}.`
   - Couple signature: `— {data.bride} & {data.groom}` in a smaller serif.

2. **Gifts & Registry block** — only rendered when `data.giftOptions?.length > 0`.
   - Header (small caps): `GIFTS & REGISTRY`.
   - Sub-line in italic serif: `Your generosity is still welcome.`
   - The same per-option cards as the live invite (bank icon + bank name; mobile icon + service name; the `GiftTransferDetailCard` rows below).
   - Implementation: extract the existing `GiftTransferDetailCard` and the per-option block out of `InvitationPreview.tsx` into a small `<InvitationGifts data={...} />` component in `src/components/`, so both `<InvitationPreview>` and `<ArchivedInvitationView>` render gifts identically. (Same pattern as the recently-extracted `<GiftOptionsList>` form.)

3. **Footer** — same `footnote` text as the live invite, in the same minimalist style.

What the archived view **hides**: RSVP, navigation pages, schedule, houses, formal invitation, custom sections, pre-ceremony media, reception details. These are wedding logistics — irrelevant after the fact.

### Why a sibling component, not a flag inside InvitationPreview

- `InvitationPreview` is ~1500 lines of layout assumptions for the live experience. Threading an `archived` mode through every section would balloon it.
- The archived view is conceptually a different page: different intent, different chrome, different metadata.
- Both views share the gift block — which is the natural extraction point.

## Dashboard lock enforcement

### Where the check happens

In `app/dashboard/page.tsx`, the existing initial load already fetches the invitation row by the user's slug. Extend that fetch to include `client_locked`. Immediately after the row resolves, if `clientLocked === true`, render `<DashboardLockedScreen />` instead of the tabs.

The dashboard's existing top nav (with its sign-out button) and `<Toaster />` stay mounted — only the tabbed interior is replaced.

### New component: `src/components/dashboard/DashboardLockedScreen.tsx`

Centered card on the dashboard's existing stone-50 background:

- Top: small lock glyph (`Lock` from lucide-react) in a soft circle.
- Heading (serif, large): `Your account is paused`.
- Body: `Thank you for celebrating with us. Your dashboard access has been paused. The invitation page may still be accessible to your guests.`
- Secondary line: `Need to download your guest list or update something? Reach out to your planner.` (No planner contact stored yet — generic copy.)

Palette matches the existing dashboard (stones + emerald accents). No tabs visible. The top nav's sign-out button is the user's exit. No 404 — the user is not lost, they are paused.

## Admin UI

### New `<LifecyclePanel>` component

`src/components/admin/LifecyclePanel.tsx`. Mounted in the admin builder next to `<ClientEntitlementsPanel>`.

```
┌─ LIFECYCLE ───────────────────────────────────────┐
│                                                   │
│  Client dashboard access                          │
│  ┌────────────────────────────────────────────┐   │
│  │  ●━━○   Active                              │   │
│  │  Client can log in and edit their dashboard │   │
│  └────────────────────────────────────────────┘   │
│                                                   │
│  Public invitation                                │
│  ┌────────────────────────────────────────────┐   │
│  │  ●━━○   Live                                │   │
│  │  /invite/<slug> shows the full invitation   │   │
│  └────────────────────────────────────────────┘   │
│                                                   │
│  Last archived: —                                 │
│  Last locked:   —                                 │
│                                                   │
└───────────────────────────────────────────────────┘
```

Each toggle:
- Visible state with plain-language description of the *current* state and what happens on flip.
- Custom in-app confirmation modal before flipping ON (matching the existing `PaymentModal` / `CsvImportModal` pattern: a `useState` boolean + a centered card with a title, body, "Cancel" / "Confirm" buttons). Copy: `"Lock this client's dashboard access? They will see a paused-account screen until you reverse this."` Flipping OFF is one click — restoring is meant to be easy.

A new small `<ConfirmDialog>` primitive in `src/components/ConfirmDialog.tsx` is appropriate since both toggles need the same shape (`isOpen`, `title`, `body`, `confirmLabel`, `confirmTone: 'neutral' | 'danger'`, `onCancel`, `onConfirm`). The admin-tokens palette applies.
- Live timestamps below (`Last locked: 2 days ago` / `Last archived: 5 days ago`) once set, `—` when never set.
- Success toast via `sonner` on both flip directions (consistent with the rest of the admin).

Material-tokens / dark-forest palette to match the admin builder visual language.

### Status pill on `ClientList.tsx`

Replaces the hardcoded `"In Progress"` pill currently on lines 132–136. Derived state:

| Underlying flags                              | Pill                                    |
|-----------------------------------------------|-----------------------------------------|
| `!isArchived && !clientLocked && date set`    | emerald dot · `Live`                    |
| `!isArchived && clientLocked`                 | amber dot · `Client locked`             |
| `isArchived && !clientLocked`                 | stone dot · `Archived`                  |
| `isArchived && clientLocked`                  | stone dot · `Closed`                    |
| `!isArchived && !clientLocked && !date`       | blue dot · `In Progress` (today's pill) |

`/api/admin/clients` (already returns each client's invitation row) needs to start returning `clientLocked` and `isArchived`. Otherwise no breaking shape change.

## Visual language

| Surface              | Palette                                                |
|----------------------|--------------------------------------------------------|
| Admin LifecyclePanel | dark-forest / Material tokens (matches admin builder)  |
| ClientList pill      | dark-forest / Material tokens                          |
| DashboardLockedScreen| stones + emerald accents (matches client dashboard)    |
| ArchivedInvitationView | inherits invitation's `cleanTheme` (per-couple)      |

No new color tokens.

## Files touched

```
src/db/schema.ts                                    (4 new columns)
src/app/api/admin/clients/[slug]/lifecycle/route.ts (NEW)
src/app/api/admin/clients/route.ts                  (return flags)
src/app/api/rsvp/route.ts                           (403 when archived)
src/app/invite/[slug]/page.tsx                      (branch on isArchived)
src/app/dashboard/page.tsx                          (lock check + render)
src/app/admin/page.tsx                              (mount LifecyclePanel)
src/components/ArchivedInvitationView.tsx           (NEW)
src/components/InvitationGifts.tsx                  (NEW — extracted from InvitationPreview)
src/components/InvitationPreview.tsx                (use extracted InvitationGifts)
src/components/dashboard/DashboardLockedScreen.tsx  (NEW)
src/components/admin/LifecyclePanel.tsx             (NEW)
src/components/admin/ClientList.tsx                 (derived status pill)
src/components/ConfirmDialog.tsx                    (NEW — generic confirm modal)
```

Schema is applied via `npm run db:push` (drizzle-kit), not via committed migration files — same as every other column added to this project. The schema change in `src/db/schema.ts` is the migration artifact.

## Rollout

1. Migration is additive (defaults to `false`). Safe to push to prod before code ships.
2. Code change is gated entirely by the two new flags — existing rows default to `(false, false)` → identical live behavior.
3. Reversible: flipping either flag back returns the client / invite to the previous state instantly.
4. No background jobs, cron, or webhooks needed in Stage 1.

## Open questions deferred to Stage 2

- How to schedule the 7-day-post-wedding job (Vercel cron? Supabase Edge Function? Manual?).
- Timezone handling for `wedding_date + 7d` (couples and guests across timezones).
- Whether locking should also revoke any in-flight session tokens (it does not today — they expire normally).
- Whether the planner contact info should appear on `DashboardLockedScreen` (depends on the planner-multi-tenant feature).
