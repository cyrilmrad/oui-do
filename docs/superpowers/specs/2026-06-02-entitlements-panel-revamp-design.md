# Client Entitlements Panel — Revamp Design

**Date:** 2026-06-02
**Status:** Approved (pending spec review)
**Scope:** UI/UX rebuild of the admin Client Entitlements panel. **No DB, schema, or API changes.**

## Goal

Make the entitlements panel more modern, more secure, more user-friendly, and structured so new feature flags are cheap to add on the UI side. A full data-model revamp (JSONB flags / registry-backed schema) is **explicitly deferred** to a later project; this round must not require a migration.

## Non-goals (deferred)

- Migrating `client_entitlements` away from one-column-per-feature. The schema, `service.ts`, and API routes stay exactly as they are.
- Audit trail (who changed what, when) — needs a new table; deferred with the data-model work.
- Moving password management out of this panel — the user chose to keep it here.
- Bulk "enable for all clients" actions — not needed for the chosen layout.

## What exists today

- `src/components/admin/ClientEntitlementsPanel.tsx` — a single ~550-line component mixing three concerns: a client picker to "Initialize entitlements", a checkbox grid (slug rows × feature columns), and a password-management modal.
- Feature keys come from `src/lib/features.ts` (`FEATURE_KEYS`). Labels are a local `LABELS` map in the panel.
- Data: `GET /api/admin/client-entitlements` (configured rows only), `POST` (create row), `PATCH /[slug]` (update). `GET /api/admin/clients` (all clients/couples). Password: `POST /api/admin/reset-password`, `POST /api/admin/update-password`.
- Defaults: `getDefaultFeatureFlags()` (guests + messages on, rest off) — pure function, safe to import client-side.

## Chosen design

### Layout: list + detail (master–detail)

```
┌ ACCESS CONTROL ──────────────────────────────── [ search clients… ] ┐
│ Client Entitlements                                                  │
├──────────────────────┬──────────────────────────────────────────────┤
│ CLIENT LIST          │ DETAIL: selected client                       │
│ • Jad & Lea  [Unsaved]│  Jad & Lea                                    │
│ • Ralph & Luciana    │  jad-and-lea · configured · updated 2d ago    │
│ • Robin & Leah       │                                               │
│   Bride & Groom [Def]│  [toggle] Guests   — guest list, RSVP, CSV    │
│   Brian & V.    [Def]│  [toggle] Messages — RSVP notes & wishes      │
│                      │  [toggle] Budget   — tracker & payments       │
│                      │  [toggle] Seating  — table planner            │
│                      │  [toggle] Settings — couple edits invitation  │
│                      │  ── confirm banner appears here on risky off ─│
│                      │  [Save changes] [Reset]        🔑 Manage pwd  │
└──────────────────────┴──────────────────────────────────────────────┘
```

- **Left list** shows **every client** from `GET /api/admin/clients`, searchable by name / slug / email. Each row shows the couple name + slug and a status indicator:
  - green dot = **configured** (a `client_entitlements` row exists),
  - "Defaults" badge = no row yet (running on `getDefaultFeatureFlags()`),
  - "Unsaved" badge = the selected client has pending edits.
- **Right detail pane** edits one client at a time: feature toggles with descriptions, metadata line, and the action bar.

### Unified initialize flow

The separate "Initialize entitlements" section is **removed**. Selecting a client that has no row shows its default toggles; pressing **Save changes** issues a `POST /api/admin/client-entitlements` which creates the row (the existing service already verifies an invitation exists for the slug — always true for clients from the directory). Configured clients save via `PATCH /[slug]`. No API changes required.

### Feature registry (UI extensibility)

Introduce a UI-only metadata registry so adding a feature later is a one-line UI change (plus the still-required server key + column, which are out of scope now):

```ts
// src/lib/entitlements/featureMeta.ts  (client-safe: no server imports)
import type { FeatureKey } from '@/lib/features';
import { Users, MessageSquare, Wallet, Armchair, Settings, type LucideIcon } from 'lucide-react';

export type FeatureMeta = { label: string; description: string; icon: LucideIcon };

export const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
  guests:   { label: 'Guests',   description: 'Guest list, RSVP tracking & CSV import', icon: Users },
  messages: { label: 'Messages', description: 'Read RSVP notes & well-wishes from guests', icon: MessageSquare },
  budget:   { label: 'Budget',   description: 'Budget tracker with categories & payments', icon: Wallet },
  seating:  { label: 'Seating',  description: 'Drag-and-drop table seating planner', icon: Armchair },
  settings: { label: 'Settings', description: 'Let the couple edit their own invitation', icon: Settings },
};
```

The detail pane renders one toggle per `FEATURE_KEYS` entry, reading label/description/icon from `FEATURE_META`. Adding a future flag = append to `FEATURE_KEYS` + one `FEATURE_META` entry; the UI picks it up with no further edits.

### Security & save behavior

- **Risky-action confirmation:** turning a feature **off** shows an inline confirmation banner in the detail pane ("Turning Seating off will immediately hide the tab from the couple's dashboard") with Keep-on / Turn-off. Turning a feature on does not confirm.
- **Set-password confirmation:** the "Set password directly" path in the password modal gets a confirmation step before it overrides the password (it's irreversible from the client's side).
- **Dirty state:** the detail pane tracks a draft vs the saved baseline. **Save is disabled when nothing changed.** **Reset** discards the draft.
- **Unsaved-change guard:** selecting a different client (or otherwise leaving) while edits are pending prompts to discard via `confirm()` (allowed per CLAUDE.md).
- **Toasts:** replace the current inline `message` banner with `sonner` `toast.success` / `toast.error`, per project conventions.

## Component structure

Following CLAUDE.md (parent owns state; sections are presentational, props-only):

- `ClientEntitlementsPanel.tsx` — parent. Owns data fetching (clients + entitlement rows), the merged client model, selection, draft state, save/patch/post, and password-modal orchestration. Passes data + callbacks down.
- `EntitlementsClientList.tsx` — presentational list: search box, rows with status badges, selection + unsaved indicators. Props: clients, selectedSlug, search value, onSelect, onSearch.
- `EntitlementsDetail.tsx` — presentational detail pane: metadata header, feature toggles (from `FEATURE_META`), inline confirm banner, action bar. Props: client, draft, dirty, onToggle, onSave, onReset, onManagePassword, saving.
- `FeatureToggle.tsx` (optional small unit) — one labeled switch row. Keeps the detail pane readable.
- `PasswordManagerModal.tsx` — extract the existing modal verbatim, add the set-password confirmation step. Props: slug, email, onClose.
- `src/lib/entitlements/featureMeta.ts` — the registry above.

## Data flow

1. On mount, fetch `GET /api/admin/clients` and `GET /api/admin/client-entitlements` in parallel.
2. Merge into one list: for each client, `features = row?.features ?? getDefaultFeatureFlags()`, plus `configured = !!row`, `updatedAt` from row.
3. Selecting a client copies its features into an editable `draft`. Toggling mutates the draft; `dirty = draft ≠ baseline`.
4. **Save:** `configured` → `PATCH /[slug]`; not configured → `POST`. On success, toast + refetch + clear dirty.
5. Switching selection with `dirty` → confirm discard first.

## Error handling

- Fetch/save failures surface via `toast.error` with the server message; the panel stays usable.
- Save button shows a spinner and is disabled while in flight.
- List shows a loading state on initial fetch; empty/filtered-empty states show a helpful message.

## Testing & verification

The repo has no unit-test runner; verification is:

- `node_modules/.bin/tsc --noEmit` — no new type errors.
- `npm run lint` — no new errors (watch for raw `&`/`'`/`"` in JSX text).
- `npm run build` — production build succeeds.
- Manual smoke: select configured + defaults clients, toggle on/off (confirm banner on off), save (POST creates row for a defaults client; PATCH updates a configured one), Reset, switch-with-unsaved guard, and both password flows.

## Risks

- **Production component swap.** Behavior must be preserved: same endpoints, same payloads, same password flows. Keep the diff focused — no opportunistic refactors beyond this panel.
- **Client volume.** The list renders all clients; if the directory is large, add simple client-side filtering (already planned) — no pagination needed at current scale.
