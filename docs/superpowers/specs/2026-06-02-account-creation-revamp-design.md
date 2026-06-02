# Account Creation Revamp — Design

**Date:** 2026-06-02
**Branch:** `feat/account-creation-revamp` (branched from `feat/planner-feature`, which introduces the `assistant` role this work depends on)

## Context

Two related needs prompted this work:

1. **Duplicate client cards.** The admin Clients list (`GET /api/admin/clients`) is built by listing every Supabase auth user with `role: 'client'` and mapping each to the invitation for its slug — i.e. **one row per user account**. Creating a second user with an existing slug therefore produces a **second card** pointing at the same shared invitation. The underlying data already shares correctly (invitation, guests, budget, seating are all keyed by slug); only the list view duplicates the wedding.

2. **Assistant creation.** The `assistant` role (global, Planner-only, no slug) shipped with the planner feature, but there is no UI to create assistant accounts.

The goal: reshape the mental model so **one wedding (slug + invitation) can own multiple user accounts**, surface those accounts in the UI, and provide a single revamped creation flow that can produce a new-wedding client, an additional login for an existing wedding, or a global assistant.

## Decisions (from brainstorming)

- **Multiple logins per wedding.** A wedding may have several client accounts (e.g. bride + groom), all sharing one invitation. The Clients list shows **one card per wedding**, with linked accounts shown inline.
- **Assistant stays global** (as shipped): `role: 'assistant'`, no slug, Planner-only.
- **Add-login lives in the creation modal** (Approach A): a single "New" entry point with an account-type selector.
- **Show linked accounts inline** on each wedding card (read-only glance).
- **Account management (delete) lives in the wedding overview** — a small Accounts section listing the linked users with a delete button next to each. Keeps the card glanceable and management where you're focused on one wedding.
- **Assistant management** (a list/removal surface for assistants) is **out of scope** for this spec.

## Data model — no DB migration

A "wedding" is identified by its **slug**. Accounts are Supabase auth users carrying `app_metadata`:

- **Client** → `role: 'client'` + `slug`. Multiple clients may share one slug.
- **Assistant** → `role: 'assistant'`, no slug.

"Accounts for a wedding" = client users filtered by slug. No schema changes required.

## Backend

### `POST /api/admin/create-client` (extended; same path for backward-compat)

Accepts `{ email, password, role?, slug?, expectExisting? }`. `role` defaults to `'client'` so existing callers keep working.

- `role: 'assistant'` → create user with `app_metadata.role = 'assistant'`; **ignore slug** (no slug stored).
- `role: 'client'` + `expectExisting: false` (new wedding) → **reject with 409** if that slug already exists.
- `role: 'client'` + `expectExisting: true` (add login) → **reject with 400** if that slug does not exist.
- Email collisions surface Supabase's native error message.

**Slug existence** is determined by a single shared rule used by both checks above: a slug "exists" if any client user has that slug **or** an invitation row has that slug.

### `GET /api/admin/clients` (grouped by slug)

Return **one entry per wedding** instead of one per user:

```jsonc
{
  "slug": "maya-and-john",
  "email": "maya@example.com",   // representative (oldest account) — keeps entitlements panel & lifecycle consumers working
  "bride": "Maya",
  "groom": "John",
  "heroImage": null,
  "date": null,
  "clientLocked": false,
  "clientLockedAt": null,
  "isArchived": false,
  "archivedAt": null,
  "archiveMessage": null,
  "accounts": [
    { "id": "<uuid>", "email": "maya@example.com" },
    { "id": "<uuid>", "email": "john@example.com" }
  ]
}
```

- The entry `id` becomes the **slug** (stable card key).
- Representative `email` = the oldest account for that slug (by `created_at`), preserving backward-compat for `ClientEntitlementsPanel` (which does `clients.find(c => c.slug === slug)?.email`) and lifecycle panels.
- `accounts[]` is sorted oldest-first.

### `DELETE /api/admin/clients/[slug]/account` (new)

Body: `{ userId }`. Removes one client account via the Supabase admin API.

- **Guard:** refuse (409) to remove the **last remaining** client account for the slug — prevents orphaning the wedding out of the list view.
- Admin-only (`requireAdmin`).

## Frontend

### Creation modal — `NewClientForm.tsx` (Approach A)

Top-of-modal **account-type selector** (segmented control, 3 options). Conditional fields per type:

- **New wedding (client)** → email · *fresh* slug (inline "slug already in use" error when taken) · password. Submits `role: 'client', expectExisting: false`.
- **Add login to existing wedding** → email · existing-slug picker (must resolve to a real wedding) · password. Submits `role: 'client', expectExisting: true`.
- **Assistant** → email · password (no slug field). Submits `role: 'assistant'`.

The heading/description adapt per selected type. On success when adding to an existing wedding, the list refreshes and the existing card gains an account — no new card appears.

### Clients list — `ClientList.tsx`

Each wedding card renders its linked **accounts inline, read-only**: a count badge plus the list of account emails. No actions on the card — it stays a glance. Password reset remains in the entitlements panel, targeting the representative account.

### Wedding overview — `ClientOverview.tsx`

A small **Accounts** section lists the wedding's linked client accounts (email + created date), each with a **delete** button next to it (via `ConfirmDialog`, already imported here). Delete calls `DELETE …/account`; the **last remaining account cannot be deleted** (button disabled + backend guard). Accounts are passed in as a prop (`accounts: { id: string; email: string }[]`) sourced from the admin page's already-loaded clients list; on a successful delete the overview invokes an `onAccountsChanged` callback so the parent refetches `/api/admin/clients` and the prop updates. No new GET endpoint required.

### Admin page — `src/app/admin/page.tsx`

- Form state extended for account type + mode (`role`, `expectExisting`).
- `handleCreateClient` wires the type/mode into the POST body and handles the new error codes (409 slug-in-use, 400 no-such-wedding) with `toast.error`.
- Sidebar button label "New Client Instance" → "New Account".
- Passes the selected wedding's `accounts` (from `realClients`) into `ClientOverview`, plus an `onAccountsChanged` handler that calls `fetchClients()`.

## Edge cases

- **New-wedding slug collision** → inline error, no account created.
- **Existing-wedding unknown slug** → inline error, no account created.
- **Removing the last account** of a wedding → blocked (409 + toast).
- A wedding with an invitation but **zero client users** still does not appear in the list (unchanged from today; the list is sourced from users).
- **Email already in use** → Supabase error surfaced in the modal.

## Out of scope

- Assistant **management** (listing / removing / resetting assistants). Assistants can be created but have no management surface yet; generic password reset still applies. Tracked as a potential follow-up.

## Verification

1. **New wedding** → exactly one card appears for the slug.
2. **Add login to existing wedding** → same card now lists 2 emails with a count badge; no duplicate card.
3. **Create assistant** → user created with `role: 'assistant'`; logging in routes to `/admin` showing only the Planner.
4. **New-wedding with a taken slug** → 409, inline error, nothing created.
5. **Add-login with an unknown slug** → 400, inline error, nothing created.
6. **Remove an account** (from the wedding overview's Accounts section) → email disappears from the overview and the card; removing the last one is blocked (button disabled + backend guard).
7. **Regression:** entitlements panel still loads its client picker and password-reset works (representative email present).
8. `node_modules/.bin/tsc --noEmit` and `npm run lint` show no new errors.

## Files touched

| Action | File |
|--------|------|
| Modify | `src/app/api/admin/create-client/route.ts` |
| Modify | `src/app/api/admin/clients/route.ts` |
| Create | `src/app/api/admin/clients/[slug]/account/route.ts` |
| Modify | `src/components/admin/NewClientForm.tsx` |
| Modify | `src/components/admin/ClientList.tsx` (inline accounts, read-only) |
| Modify | `src/components/admin/ClientOverview.tsx` (Accounts management section) |
| Modify | `src/app/admin/page.tsx` |
